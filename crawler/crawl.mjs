#!/usr/bin/env node
/**
 * ai-skill-search 爬虫（零 npm 依赖，Node 22 内置 fetch）。
 * 依据 docs/design.md「爬虫设计」：
 * 1. 收仓：直连仓 + 聚合清单 README 提取的 github 链接，去重，直连仓排前，总量受 CRAWL_LIMIT 截断。
 * 2. 逐仓：GitHub API 取 repo 元信息 + git tree 中所有 SKILL.md 路径；两者缓存到 .crawl-cache/。
 * 3. 逐条 SKILL.md：raw.githubusercontent 抓原文；解析 frontmatter（两个 --- 之间逐行 key: value）。
 * 4. 语言判定见 lang-detect.mjs（只收中英）。
 * 5. 敏感判定见 sources.mjs matchesSensitive。
 * 6. 按 star 降序写 public/skills.json；数据无变化时不重写（配合 Actions diff 零提交）。
 * 7. 限流：API 响应 x-ratelimit-remaining 为 0 → 停止新请求、保留已有结果照常写盘、警告退出。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AWESOME_LISTS, DIRECT_REPOS, MIN_SKILLS, matchesSensitive } from './sources.mjs';
import { detectLanguage } from './lang-detect.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(ROOT, '.crawl-cache');
const OUT_FILE = join(ROOT, 'public', 'skills.json');
const CRAWL_LIMIT = Number.parseInt(process.env.CRAWL_LIMIT || '40', 10);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const BODY_LIMIT = 30 * 1024; // 单条 body 上限 30KB，防 skills.json 膨胀
const FETCH_TIMEOUT = 30_000;

const API_HEADERS = {
  'User-Agent': 'ai-skill-search-crawler',
  Accept: 'application/vnd.github+json',
};
if (GITHUB_TOKEN) API_HEADERS.Authorization = `Bearer ${GITHUB_TOKEN}`;

let rateLimitRemaining = null;
let rateLimited = false;

/** github.com/{owner}/{repo} 链接：贪婪捕获前两段、忽略其后路径（/tree、/blob 等深链同样收仓）。
 *  弃用前瞻排除法——旧前瞻字符类曾漏掉连字符，把带连字符仓库名截成前缀（首轮 16 个 404 的根因）。
 *  尾部 `.git` 与句点由 collectRepos 剥离，官方页/组织路径走黑名单。 */
export const GITHUB_LINK_RE = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g;

/** github.com 官方页/组织路径，不当作仓库链接 */
const NON_REPO_OWNERS = new Set([
  'orgs', 'topics', 'features', 'marketplace', 'sponsors', 'collections', 'settings', 'about',
  'site', 'enterprise', 'explore', 'search', 'login', 'join', 'pricing', 'contact', 'events',
  'solutions', 'apps', 'new', 'notifications',
]);

async function apiGet(url) {
  const res = await fetch(url, { headers: API_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null && remaining !== undefined && remaining !== '') {
    rateLimitRemaining = Number.parseInt(remaining, 10);
  }
  if (res.status === 403 || res.status === 429) {
    if (rateLimitRemaining === 0) rateLimited = true;
    throw new Error(`GitHub API HTTP ${res.status}（${url}）`);
  }
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}（${url}）`);
  if (rateLimitRemaining === 0) rateLimited = true;
  return res.json();
}

/** 原文抓取（不耗 API 配额）：失败返回 null，由调用方计入跳过 */
async function fetchText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function cachePath(owner, repo) {
  return join(CACHE_DIR, `${owner}__${repo}.json`);
}

/** 收集仓库：直连仓排前 + 各清单 README 提取的链接，去重 */
async function collectRepos() {
  const seen = new Set();
  const repos = [];
  const add = (fullName) => {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) return;
    const key = fullName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    repos.push(fullName);
  };
  for (const r of DIRECT_REPOS) add(r);
  for (const list of AWESOME_LISTS) {
    const [owner, repo] = list.split('/');
    let readme = null;
    for (const branch of ['main', 'master']) {
      readme = await fetchText(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
      );
      if (readme !== null) break;
    }
    if (readme === null) {
      console.warn(`⚠️ 清单读取失败，跳过：${list}`);
      continue;
    }
    let n = 0;
    for (const m of readme.matchAll(GITHUB_LINK_RE)) {
      const o = m[1];
      const r = m[2].replace(/\.git$/i, '').replace(/\.$/, ''); // 剥掉 .git 后缀与句尾句点
      const cand = `${o}/${r}`;
      if (cand.toLowerCase() === list.toLowerCase()) continue; // 清单自身
      if (o.toLowerCase() === 'github' || NON_REPO_OWNERS.has(o.toLowerCase())) continue; // 官方页/组织路径
      add(cand);
      n++;
    }
    console.log(`清单 ${list}：提取 ${n} 个仓库链接`);
  }
  return repos;
}

/** 逐仓：API 元信息 + SKILL.md 路径列表，缓存到 .crawl-cache/（二次运行不耗 API） */
async function crawlRepo(owner, repo) {
  const file = cachePath(owner, repo);
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      // 缓存损坏则忽略，走 API
    }
  }
  const meta = await apiGet(`https://api.github.com/repos/${owner}/${repo}`);
  const branch = meta.default_branch || 'main';
  const tree = await apiGet(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
  );
  const paths = (tree.tree || [])
    .filter((e) => e.type === 'blob' && e.path.toLowerCase().split('/').pop() === 'skill.md')
    .map((e) => e.path);
  const info = {
    default_branch: branch,
    stargazers_count: meta.stargazers_count ?? 0,
    pushed_at: meta.pushed_at ?? null,
    paths,
    truncated: tree.truncated === true,
  };
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(info, null, 2));
  return info;
}

/** 最小 frontmatter 解析：首行起两个 `---` 之间，逐行 `key: value`，只认 name/description/install。
 *  YAML 块标量（> | >- |- 等）：折叠后续缩进续行；仅剩标记符时视为缺失，由调用方走 fallbackDescription。 */
export function parseFrontmatter(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const fm = {};
  let body = text;
  if (lines[0] && lines[0].trim() === '---') {
    const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (endIdx !== -1) {
      let i = 1;
      while (i < endIdx) {
        const line = lines[i];
        if (/^\s/.test(line)) {
          i++; // 缩进行（嵌套 key 或块标量残留）不当作顶层 key
          continue;
        }
        const colon = line.indexOf(':');
        if (colon <= 0) {
          i++;
          continue;
        }
        const key = line.slice(0, colon).trim().toLowerCase();
        if (key !== 'name' && key !== 'description' && key !== 'install') {
          i++;
          continue;
        }
        let value = line.slice(colon + 1).trim();
        if (/^[>|][-+]?\d*$/.test(value)) {
          // 块标量：收集后续缩进续行折叠为一行；遇到非缩进行（下一个 key 等）结束
          const parts = [];
          let j = i + 1;
          while (j < endIdx) {
            const cont = lines[j];
            if (cont.trim() === '') {
              j++;
              continue;
            }
            if (cont.startsWith(' ') || cont.startsWith('\t')) {
              parts.push(cont.trim());
              j++;
            } else {
              break;
            }
          }
          i = j - 1;
          value = parts.join(' ').trim();
        } else {
          value = value.replace(/^["']|["']$/g, '');
        }
        if (value) fm[key] = value;
        i++;
      }
      body = lines.slice(endIdx + 1).join('\n');
    }
  }
  return { fm, body };
}

/** description 缺失时：正文首个非空非标题行，截断到 200 字符 */
function fallbackDescription(body) {
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || /^#{1,6}\s/.test(t)) continue;
    return t.slice(0, 200);
  }
  return '';
}

/** 构造一条记录；语言为 skip 时返回 null（不收录） */
function buildRecord({ owner, repo, branch, path, text, info }) {
  const { fm, body } = parseFrontmatter(text);
  const language = detectLanguage(body);
  if (language === 'skip') return null;
  const dirName = path.split('/').slice(-2, -1)[0] || repo;
  const name = fm.name || dirName;
  const description = fm.description || fallbackDescription(body);
  const installMethod = fm.install || `git clone https://github.com/${owner}/${repo}`;
  const sensitive = matchesSensitive(`${name} ${description}`);
  return {
    id: `${owner}/${repo}:${path}`,
    name,
    description,
    sourceRepo: `${owner}/${repo}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    path,
    skillUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
    installMethod,
    stars: info.stargazers_count ?? 0,
    updatedAt: info.pushed_at ?? '',
    language,
    sensitive,
    body: body.slice(0, BODY_LIMIT),
  };
}

/**
 * 发布门（业务门）：本次结果不得静默劣化既有数据。
 * - 0 条 → 拒；低于 MIN_SKILLS → 拒；较上次记录数下降超过 50% → 拒（疑似部分抓取失败）。
 * 拒 = 保留既有 public/skills.json 不覆盖，以非零码显式失败（Actions 不会提交劣化数据）。
 */
export function shouldPublish({ newCount, prevCount, minSkills = MIN_SKILLS }) {
  if (newCount === 0) return { ok: false, reason: '未收集到任何技能' };
  if (newCount < minSkills) return { ok: false, reason: `技能数 ${newCount} 低于下限 ${minSkills}` };
  if (prevCount !== null && prevCount !== undefined && newCount < prevCount * 0.5) {
    return {
      ok: false,
      reason: `技能数 ${newCount} 较上次 ${prevCount} 下降超过 50%，疑似部分抓取失败`,
    };
  }
  return { ok: true, reason: '' };
}

/** 爬一批仓库；返回实际爬取的仓库数 */
async function crawlBatch(repos, skillsById, skipped) {
  let crawled = 0;
  for (const fullName of repos) {
    if (rateLimited) break;
    const [owner, repo] = fullName.split('/');
    let info;
    try {
      info = await crawlRepo(owner, repo);
    } catch (err) {
      console.warn(`⚠️ 仓库抓取失败，跳过 ${fullName}：${err.message}`);
      skipped.failed++;
      if (rateLimited) break;
      continue;
    }
    crawled++;
    if (info.truncated) {
      console.warn(`⚠️ ${fullName} 的 git tree 被截断（超大仓库），可能有 SKILL.md 未被发现`);
    }
    const branch = info.default_branch || 'main';
    let count = 0;
    // raw 抓取不耗 API 配额：即使已限流，也把当前仓库的已定位 SKILL.md 抓完
    for (const path of info.paths) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;
      const text = await fetchText(rawUrl);
      if (text === null) {
        skipped.raw++;
        continue;
      }
      const record = buildRecord({ owner, repo, branch, path, text, info });
      if (record === null) {
        skipped.lang++;
        continue;
      }
      if (!skillsById.has(record.id)) {
        skillsById.set(record.id, record);
        count++;
      }
    }
    console.log(`✓ ${fullName}：${info.paths.length} 个 SKILL.md，收录 ${count} 条`);
  }
  return crawled;
}

async function main() {
  console.log(
    `爬虫启动：CRAWL_LIMIT=${CRAWL_LIMIT}${GITHUB_TOKEN ? '（已带 GITHUB_TOKEN）' : '（未带 token，API 配额 60 次/小时）'}`,
  );
  const collected = await collectRepos();
  const skillsById = new Map();
  const skipped = { lang: 0, raw: 0, failed: 0 };

  const targetCount = Math.min(collected.length, CRAWL_LIMIT);
  let crawled = await crawlBatch(collected.slice(0, CRAWL_LIMIT), skillsById, skipped);

  // 退路（决策 #6）：本批来源（截断后）全部处理完仍不足 MIN_SKILLS → GitHub 搜索 API 补源；
  // 以「尝试过」计数（成功 + 失败仓）——失败仓恰恰是退路要覆盖的场景
  const attempted = crawled + skipped.failed;
  if (skillsById.size < MIN_SKILLS && attempted >= targetCount && !rateLimited) {
    console.warn(`⚠️ 技能数 ${skillsById.size} < ${MIN_SKILLS}，启用 GitHub 搜索回退补源`);
    try {
      const search = await apiGet(
        'https://api.github.com/search/repositories?q=SKILL.md+in:readme&sort=stars&per_page=20',
      );
      const extra = [];
      for (const item of search.items || []) {
        const fullName = item.full_name;
        if (collected.some((c) => c.toLowerCase() === fullName.toLowerCase())) continue;
        extra.push(fullName);
      }
      const room = Math.max(0, CRAWL_LIMIT - crawled);
      crawled += await crawlBatch(extra.slice(0, room), skillsById, skipped);
    } catch (err) {
      console.warn(`⚠️ 搜索回退失败：${err.message}`);
    }
  }

  const skills = [...skillsById.values()].sort(
    (a, b) => b.stars - a.stars || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );

  const zh = skills.filter((s) => s.language === 'zh').length;
  const sensitive = skills.filter((s) => s.sensitive).length;

  console.log('\n爬取统计：');
  console.log(`- 仓库数：收集 ${collected.length}，爬取 ${crawled}，失败 ${skipped.failed}`);
  console.log(
    `- API 余量：${rateLimitRemaining === null ? '未收到（全部走缓存或无 API 调用）' : rateLimitRemaining}`,
  );
  console.log(`- 语言：zh ${zh} / en ${skills.length - zh}`);
  console.log(`- 敏感：${sensitive}`);
  console.log(`- 跳过：语言 ${skipped.lang} / 原文抓取失败 ${skipped.raw}`);
  console.log(`- 输出：${OUT_FILE}（共 ${skills.length} 条）`);

  const payload = { generatedAt: new Date().toISOString(), count: skills.length, skills };
  const nextJson = JSON.stringify(payload, null, 2) + '\n';

  // 数据无变化时不重写文件：generatedAt 保持不变，Actions 的 git diff 才能实现「无变化零提交」
  let previousSkills = null;
  if (existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
      if (Array.isArray(prev.skills)) previousSkills = prev.skills;
    } catch {
      // 旧文件不可读视为有变化
    }
  }

  // 业务门：0 条 / 低于下限 / 较上次大幅缩水 → 不发布，保留既有文件，显式失败
  const gate = shouldPublish({
    newCount: skills.length,
    prevCount: previousSkills === null ? null : previousSkills.length,
  });
  if (!gate.ok) {
    console.error(`✗ 不发布本次结果：${gate.reason}；保留既有 public/skills.json 不覆盖`);
    process.exitCode = 1;
    return;
  }
  if (previousSkills !== null && JSON.stringify(previousSkills) === JSON.stringify(skills)) {
    console.log('数据无变化（与既有 public/skills.json 的 skills 一致），保留原文件不重写');
  } else {
    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, nextJson);
    console.log(`已写入 ${OUT_FILE}`);
  }

  if (rateLimited) {
    console.warn(
      '⚠️ GitHub API 限流（x-ratelimit-remaining=0）：已停止新请求，保留已有结果照常写盘；下次运行可从缓存续跑。',
    );
  }

  // 显式退出不再放在 main 尾部——发布门拒绝等提前 return 路径到不了这里；统一由 isMain 的 finally 收口
}

// 仅直接运行时执行 main；被单测 import 时不执行（parseFrontmatter / shouldPublish / GITHUB_LINK_RE 供测试导入）。
// 显式退出收敛到 finally：覆盖发布门拒绝等一切提前 return 路径，undici keep-alive 连接不会再让进程挂住。
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main()
    .catch((err) => {
      console.error('✗ 爬虫失败：', err);
      process.exitCode = 1;
    })
    .finally(() => process.exit(process.exitCode ?? 0));
}
