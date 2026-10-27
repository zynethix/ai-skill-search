/**
 * 本批单元测试（随批档存放，docs/design.md「验收标准」#5/#6/#7/#9）：
 * 覆盖 src/search.js（检索计分/排序/语言隔离/中文子串/空词全量/新鲜度三档）、
 * crawler/lang-detect.mjs（en/zh/日文跳过/空跳过）、crawler/sources.mjs（敏感词判定）。
 * 运行：node --test docs/batches/2026-10-26-ai-skill-search-v1.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFreshness, scoreSkill, searchSkills } from '../../src/search.js';
import { detectLanguage } from '../../crawler/lang-detect.mjs';
import { matchesSensitive, SENSITIVE_KEYWORDS } from '../../crawler/sources.mjs';
import { parseFrontmatter, shouldPublish, GITHUB_LINK_RE } from '../../crawler/crawl.mjs';

/** 按数据 schema 造一条最小记录 */
const makeSkill = (overrides = {}) => ({
  id: 'owner/repo:skills/x/SKILL.md',
  name: 'x',
  description: '',
  sourceRepo: 'owner/repo',
  repoUrl: 'https://github.com/owner/repo',
  path: 'skills/x/SKILL.md',
  skillUrl: 'https://github.com/owner/repo/blob/main/skills/x/SKILL.md',
  installMethod: 'git clone https://github.com/owner/repo',
  stars: 0,
  updatedAt: '2026-10-01T00:00:00Z',
  language: 'en',
  sensitive: false,
  body: '',
  ...overrides,
});

test('排序：相关度优先于 star 数', () => {
  const skills = [
    makeSkill({ id: 'name-hit', name: 'pdf master', stars: 10 }),
    makeSkill({ id: 'body-hit', name: 'doc helper', stars: 9999, body: 'convert pdf files' }),
  ];
  const out = searchSkills(skills, 'en', 'pdf');
  assert.equal(out[0].id, 'name-hit');
});

test('排序：相关度相同时按 star 降序', () => {
  const skills = [
    makeSkill({ id: 'low', name: 'pdf light', stars: 5 }),
    makeSkill({ id: 'high', name: 'pdf pro', stars: 50 }),
  ];
  const out = searchSkills(skills, 'en', 'pdf');
  assert.deepEqual(out.map((s) => s.id), ['high', 'low']);
});

test('排序：相关度与 star 相同时按名称升序', () => {
  const skills = [
    makeSkill({ id: 'b', name: 'beta pdf', stars: 5 }),
    makeSkill({ id: 'a', name: 'alpha pdf', stars: 5 }),
  ];
  const out = searchSkills(skills, 'en', 'pdf');
  assert.deepEqual(out.map((s) => s.name), ['alpha pdf', 'beta pdf']);
});

test('语言隔离：英文查询只返回英文技能', () => {
  const skills = [
    makeSkill({ id: 'en', name: 'pdf tools', language: 'en' }),
    makeSkill({ id: 'zh', name: 'pdf 工具', language: 'zh' }),
  ];
  const out = searchSkills(skills, 'en', 'pdf');
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'en');
});

test('语言隔离：中文查询只返回中文技能', () => {
  const skills = [
    makeSkill({ id: 'en', name: '小红书 writer', language: 'en' }),
    makeSkill({ id: 'zh', name: '小红书文案', language: 'zh' }),
  ];
  const out = searchSkills(skills, 'zh', '小红书');
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'zh');
});

test('中文检索：无空白整句作一个词元做子串匹配', () => {
  const skills = [
    makeSkill({ id: 'hit', name: '小红书文案生成器', language: 'zh', body: '帮你写小红书爆款笔记' }),
    makeSkill({ id: 'miss', name: '文档处理', language: 'zh', body: '处理 word 文档' }),
  ];
  const out = searchSkills(skills, 'zh', '小红书文案');
  assert.deepEqual(out.map((s) => s.id), ['hit']);
});

test('中文检索：按空白切分多个词元', () => {
  const skills = [
    makeSkill({ id: 'both', name: 'PDF 转换工具', language: 'zh' }),
    makeSkill({ id: 'one', name: 'PDF 阅读器', language: 'zh' }),
  ];
  const out = searchSkills(skills, 'zh', 'PDF 转换');
  assert.deepEqual(out.map((s) => s.id), ['both', 'one']);
});

test('空查询：返回该语言全部技能并按 star 降序', () => {
  const skills = [
    makeSkill({ id: 's1', stars: 3, language: 'en' }),
    makeSkill({ id: 's2', stars: 9, language: 'en' }),
    makeSkill({ id: 'zh1', stars: 100, language: 'zh' }),
  ];
  const out = searchSkills(skills, 'en', '');
  assert.deepEqual(out.map((s) => s.id), ['s2', 's1']);
});

test('检索：score 为 0 的记录不显示', () => {
  const skills = [makeSkill({ id: 'a', name: 'alpha' }), makeSkill({ id: 'b', name: 'beta' })];
  const out = searchSkills(skills, 'en', 'zzz');
  assert.equal(out.length, 0);
});

test('计分：name 3 分、description 2 分、body 1 分，取最高命中字段', () => {
  const nameHit = makeSkill({ id: 'n', name: 'pdf master' });
  const descHit = makeSkill({ id: 'd', name: 'doc', description: 'pdf converter' });
  const bodyHit = makeSkill({ id: 'b', name: 'doc', body: 'works with pdf' });
  assert.equal(scoreSkill(nameHit, ['pdf']), 5); // 3 + 全部命中 +2
  assert.equal(scoreSkill(descHit, ['pdf']), 4); // 2 + 2
  assert.equal(scoreSkill(bodyHit, ['pdf']), 3); // 1 + 2
});

test('计分：全部词元命中再加 2 分', () => {
  const both = makeSkill({ id: 'b', name: 'github actions', body: 'x' });
  const one = makeSkill({ id: 'o', name: 'github only', body: 'x' });
  const out = searchSkills([one, both], 'en', 'github actions');
  assert.deepEqual(out.map((s) => s.id), ['b', 'o']);
  assert.equal(scoreSkill(both, ['github', 'actions']), 8); // 3+3+2
  assert.equal(scoreSkill(one, ['github', 'actions']), 3); // 3+0，无全命中加分
});

test('敏感判定：关键词命中 → true', () => {
  assert.equal(matchesSensitive('Penetration Testing'), true);
  assert.equal(matchesSensitive('渗透测试工具集'), true);
  assert.equal(matchesSensitive('social engineering playbook'), true);
  assert.equal(matchesSensitive('write pdf reports'), false);
  assert.equal(SENSITIVE_KEYWORDS.length, 20);
});

test('语言判定：英文 → en', () => {
  assert.equal(
    detectLanguage('This skill helps you convert PDF documents and merge pages.'),
    'en',
  );
});

test('语言判定：中文 → zh', () => {
  assert.equal(detectLanguage('这个技能帮助你处理 PDF 文档，支持转换与合并，非常实用。'), 'zh');
});

test('语言判定：日文假名占比高 → skip', () => {
  assert.equal(
    detectLanguage('このスキルはPDFファイルの変換をサポートします。使い方は簡単です。'),
    'skip',
  );
});

test('语言判定：空正文/纯符号 → skip', () => {
  assert.equal(detectLanguage(''), 'skip');
  assert.equal(detectLanguage('   \n  '), 'skip');
  assert.equal(detectLanguage('12345 ... '), 'skip');
});

test('新鲜度：分钟/小时/天三档', () => {
  const now = Date.parse('2026-10-26T12:00:00.000Z');
  assert.equal(
    formatFreshness(new Date(now - 5 * 60_000).toISOString(), now),
    '数据更新于 5 分钟前',
  );
  assert.equal(
    formatFreshness(new Date(now - 59 * 60_000).toISOString(), now),
    '数据更新于 59 分钟前',
  );
  assert.equal(
    formatFreshness(new Date(now - 3 * 3_600_000).toISOString(), now),
    '数据更新于 3 小时前',
  );
  assert.equal(
    formatFreshness(new Date(now - 23 * 3_600_000).toISOString(), now),
    '数据更新于 23 小时前',
  );
  assert.equal(
    formatFreshness(new Date(now - 2 * 86_400_000).toISOString(), now),
    '数据更新于 2 天前',
  );
});

// —— 修复轮新增：frontmatter 块标量 / 发布门 / 检索边界 ——

test('frontmatter：块标量 > 折叠续行为一行', () => {
  const { fm, body } = parseFrontmatter(
    '---\nname: demo\ndescription: >\n  第一行说明\n  第二行说明\n---\n正文',
  );
  assert.equal(fm.description, '第一行说明 第二行说明');
  assert.ok(body.includes('正文'));
});

test('frontmatter：块标量 |- 折叠续行', () => {
  const { fm } = parseFrontmatter('---\ndescription: |-\n  折叠\n  内容\n---\n正文');
  assert.equal(fm.description, '折叠 内容');
});

test('frontmatter：仅剩标记符视为缺失（走 fallbackDescription）', () => {
  const { fm } = parseFrontmatter('---\nname: demo\ndescription: >-\n---\n正文第一行');
  assert.equal(fm.description, undefined);
});

test('frontmatter：块标量后紧跟下一个 key 不吞行', () => {
  const { fm } = parseFrontmatter('---\ndescription: >\n  说明文字\ninstall: npm i x\nname: demo\n---\n正文');
  assert.equal(fm.description, '说明文字');
  assert.equal(fm.install, 'npm i x');
  assert.equal(fm.name, 'demo');
});

test('发布门：0 条 / 低于下限 / 缩水超 50% 拒绝发布', () => {
  assert.equal(shouldPublish({ newCount: 0, prevCount: null }).ok, false);
  assert.equal(shouldPublish({ newCount: 10, prevCount: null }).ok, false); // < MIN_SKILLS 20
  assert.equal(shouldPublish({ newCount: 200, prevCount: 500 }).ok, false); // 缩水 60%
  assert.equal(shouldPublish({ newCount: 300, prevCount: 500 }).ok, true); // 缩水 40% 放行
  assert.equal(shouldPublish({ newCount: 100, prevCount: null }).ok, true);
  assert.equal(shouldPublish({ newCount: 500, prevCount: 500 }).ok, true);
});

test('检索：非空查询无有效词元（纯符号）→ 空结果', () => {
  const skills = [makeSkill({ id: 'a', name: 'alpha', stars: 100 })];
  assert.equal(searchSkills(skills, 'en', '!!!').length, 0);
  assert.equal(searchSkills(skills, 'en', '').length, 1); // 空查询仍全量
});

test('检索：c++ 被切分为 c（词面切分局限，设计文档已记录）', () => {
  const skills = [
    makeSkill({ id: 'hit', name: 'c tools', stars: 10 }),
    makeSkill({ id: 'miss', name: 'alpha', stars: 100 }),
  ];
  const out = searchSkills(skills, 'en', 'c++');
  assert.deepEqual(out.map((s) => s.id), ['hit']);
});

// —— 收口后修复轮新增：链接正则 / 新鲜度非法值 / frontmatter 缩进 ——

test('链接正则：带连字符仓库名不被截断，深链收仓', () => {
  const pick = (s) => [...s.matchAll(GITHUB_LINK_RE)].map((m) => `${m[1]}/${m[2]}`);
  assert.deepEqual(pick('https://github.com/vercel-labs/agent-skills/tree/main'), ['vercel-labs/agent-skills']);
  assert.deepEqual(pick('see https://github.com/o/repo-name/blob/x here'), ['o/repo-name']);
  assert.deepEqual(pick('https://github.com/obra/superpowers'), ['obra/superpowers']);
});

test('新鲜度：generatedAt 非法/缺失 → 更新时间未知', () => {
  assert.equal(formatFreshness('not-a-date', Date.now()), '更新时间未知');
  assert.equal(formatFreshness(undefined, Date.now()), '更新时间未知');
});

test('frontmatter：缩进的嵌套 key 不覆盖顶层', () => {
  const { fm } = parseFrontmatter('---\nname: top\nmetadata:\n  name: nested\n---\n正文');
  assert.equal(fm.name, 'top');
});
