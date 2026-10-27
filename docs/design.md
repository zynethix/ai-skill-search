# ai-skill-search · 设计文档

## 定位

公开只读静态站：搜索 GitHub 上的 AI 技能（SKILL.md 技能包）。中文界面，技能名称/描述保留原文。需求契约见 docs/requirements.md（用户已拍板）。

## 总体架构

单向数据流，三件套：

1. `crawler/` — Node 爬虫（零 npm 依赖，Node 22 内置 fetch），抓 GitHub 聚合清单与直连技能仓，产出 `public/skills.json`。
2. `public/skills.json` — 唯一数据文件，随站点静态发布。
3. `src/` — Vite + React 纯静态站，运行时按 `import.meta.env.BASE_URL` 相对路径 fetch skills.json（构建 base './' 与 dev 下均可解析）。

更新链路：GitHub Actions 每天定时跑爬虫，数据变化才提交（见「GitHub Actions」节）。

## 需求映射

| 功能点 | 实现位置 |
| --- | --- |
| 1 数据爬取 | crawler/crawl.mjs |
| 2 语言判定 | crawler/lang-detect.mjs |
| 3 数据文件 skills.json | public/skills.json（爬虫产出） |
| 4 定时更新 | .github/workflows/crawl.yml |
| 5 双查询框 | src/components/SearchBar.jsx + src/search.js |
| 6 结果排序 | src/search.js（相关度 → star 降序 → 名称） |
| 7 技能卡片 | src/components/SkillCard.jsx |
| 8 技能详情 | SkillCard 展开态 + 「查看源码」链接 |
| 9 新鲜度提示 | src/App.jsx（formatFreshness） |
| 10 报告缺失技能 | src/site-config.js（issue 链接） |

已拍板决策落点：决策 #6（聚合列表起步，退路 = 全 GitHub 搜索）→ crawler/sources.mjs；决策 #13（A 方案 owner 手动跑）→ 站内「手动更新数据」链到仓库 Actions 页；决策 #15（敏感类全收录 + 打标）→ 敏感词表 + 卡片标签 + 展开详情说明；决策 #18（一条记录 = 一个 SKILL.md，仓库级 star/更新时间共享）→ 记录结构。

## 数据 schema（public/skills.json）

```json
{
  "generatedAt": "2026-10-26T12:00:00.000Z",
  "count": 123,
  "skills": [
    {
      "id": "owner/repo:skills/foo/SKILL.md",
      "name": "foo",
      "description": "一句话描述",
      "sourceRepo": "owner/repo",
      "repoUrl": "https://github.com/owner/repo",
      "path": "skills/foo/SKILL.md",
      "skillUrl": "https://github.com/owner/repo/blob/main/skills/foo/SKILL.md",
      "installMethod": "git clone https://github.com/owner/repo",
      "stars": 123,
      "updatedAt": "2026-10-01T00:00:00Z",
      "language": "en",
      "sensitive": false,
      "body": "去掉 frontmatter 后的 SKILL.md 正文原文"
    }
  ]
}
```

字段规则：

- `id` = `${owner}/${repo}:${path}`，唯一键，按它去重。
- `name` = frontmatter 的 name 字段；无 frontmatter 时取 SKILL.md 所在目录名。
- `description` = frontmatter 的 description；缺失时取正文首个非空非标题行，截断到 200 字符。
- `installMethod` = frontmatter 的 install 字段（若有）；否则 `git clone https://github.com/${owner}/${repo}`。
- `stars` / `updatedAt` = 仓库级（GitHub API `stargazers_count` / `pushed_at`），同仓库各条记录共享。
- `language` = `"en"` 或 `"zh"`，判定规则见下。
- `sensitive` = 名称 + 描述命中敏感词表。
- `body` = SKILL.md 去掉 frontmatter 后的正文，单条上限 30KB（超出截断，防 skills.json 膨胀）。

## 爬虫设计

### 数据源（crawler/sources.mjs）

聚合清单（决策 #6 主路径）：

| 清单 | 用途 |
| --- | --- |
| ComposioHQ/awesome-claude-skills | 1000+ 技能精选清单 |
| VoltAgent/awesome-claude-skills | 社区精选合集 |
| travisvn/awesome-claude-skills | SKILL.md 格式技能清单 |
| heilcheng/awesome-agent-skills | Agent 技能目录 |

直连技能仓（官方/知名，保证基本盘）：

anthropics/skills、obra/superpowers、5tldr/claude-skills（中文合集）、JimLiu/baoyu-skills、K-Dense-AI/scientific-agent-skills、trailofbits/skills。

退路（决策 #6）：最终技能数 < MIN_SKILLS（20）时，用 GitHub 搜索 API `GET /search/repositories?q=SKILL.md+in:readme&sort=stars&per_page=20` 补源，补来的仓库走同一条管线。

### 流程（crawler/crawl.mjs）

1. 收仓：逐个清单取 raw README，正则贪婪捕获 `github.com/{owner}/{repo}` 前两段、忽略其后路径（/tree、/blob 等深链同样收仓；旧前瞻排除法曾漏转义连字符、把带连字符仓库名截成前缀——已弃用，有单测）；跳过清单自身、github.com 官方页、非 owner/repo 形式；链接尾部 `.git` 后缀与句尾句点剥离，官方页/组织路径如 orgs、topics 走黑名单；与直连仓并集、去重；直连仓排前，总量受 `CRAWL_LIMIT`（env，默认 40）截断。
2. 逐仓：GitHub API `GET /repos/{o}/{r}` → default_branch / stargazers_count / pushed_at；再 `GET /repos/{o}/{r}/git/trees/{branch}?recursive=1` → 所有名为 SKILL.md（含 skill.md）的路径。两项都缓存到 `.crawl-cache/`（JSON 文件，按 owner/repo 命名），二次运行直接读缓存，不耗 API；tree 截断（truncated=true）时打印警告（超大仓库防静默漏收）。
3. 逐条 SKILL.md：raw.githubusercontent.com 抓原文（不耗 API 配额）；解析 frontmatter（首行起两个 `---` 之间，逐行 `key: value`，只认 name/description/install；YAML 块标量（> | >- |-）折叠续行，仅剩标记符视为缺失走正文兜底）；body = frontmatter 之后的全文。
4. 语言判定（crawler/lang-detect.mjs）：body 中统计 CJK 字符 c、日文假名 k、拉丁字母 l；c+k+l = 0 → 跳过；k/(c+k+l) > 0.1 → 跳过（日文等，需求只收中英）；c/(c+l) ≥ 0.3 → zh；否则 en。
5. 敏感判定：`(name + " " + description)` 小写后命中敏感词表任一 → true。词表见 sources.mjs：exploit、pentest、penetration、phishing、malware、ransomware、hacking、red team、offensive security、vulnerability、social engineering、keylogger、backdoor、credential、fuzzing、reverse engineering、渗透、攻击、漏洞、钓鱼。
6. 输出：按 star 降序写 public/skills.json；控制台打印统计（仓数、API 余量、按语言计数、敏感计数、跳过数）。
7. 限流：带 `GITHUB_TOKEN` env 则加 Authorization 头；每次 API 响应后查 `x-ratelimit-remaining`，为 0 时停止新请求；已有结果走发布门——过门则写盘并以 exit 0 结束（限流警告随输出；写盘结果必过发布门），不过门则不写盘、exit 1（Actions 步骤失败、零提交）。缓存使下次运行可续跑。
8. 写盘规则：数据无变化时不重写文件（generatedAt 不变，配合 Actions 的 diff 实现零提交）；发布门 = 0 条 / 低于 MIN_SKILLS / 较上次记录数下降超过 50% 时不覆盖既有文件、以非零码显式失败（部分抓取不得静默劣化数据，Actions 不会提交劣化结果）。本地 `.crawl-cache/` 无 TTL（本地连跑提速用；Actions 每次全新 checkout 不带缓存，无陈旧问题）。爬虫末尾显式 `process.exit`（undici fetch 的 keep-alive 连接会让进程在工作完成后仍挂住）。

**分支依据（防御分支的出处）**：

- 链接黑名单 + `.git`/句点剥离：首轮实跑 36 仓中 16 仓 404（如 vercel-labs/agent、netlify/context-and）——根因 = 旧前瞻字符类未排除连字符、带连字符仓库名被截成前缀；已改贪婪两段捕获并有单测（验收 #13）。黑名单与剥离是次要防线。
- 30KB body 截断：设计默认值（防 skills.json 膨胀，无实测事件驱动）。
- 假名阈值 0.1：设计默认值（日文假名占比 >10% 即判非中英，按功能点 #2 取整）。
- 块标量分支：出处 = 独立评审 round 1 实测（skills.json 出现 10+ 条裸标记符描述，验收 #12 收录）。

### 安装方式

`installMethod` 默认 clone 命令；frontmatter 带 install 字段时用该值。不做更细的插件市场解析（v1）。

## 站点设计

### 布局

- 页头：站名「AI Skill 搜索」+ 一句话简介 + 数据新鲜度（`数据更新于 X 小时前`）+「报告缺失技能」+「手动更新数据」两个链接。
- 双查询框并排：左「中文技能」（placeholder「搜中文技能，如：小红书」）、右「English skills」（placeholder「Search English skills, e.g. pdf」）。
- 结果区：单列表，标题标注活跃语言与条数（如「English skills · 42 条」）。

### 双框交互

- 任一框输入或聚焦 → 该框语言成为活跃语言，结果区重搜并只显示该语言技能；两框互不串数据。
- 初始状态：活跃语言 = 中文，显示全部中文技能（按 star 降序）。
- 查询词为空 → 显示该语言全部技能（star 降序）。

### 检索算法（src/search.js，纯函数）

- 英文：query 转小写，按非字母数字切分为词元（去重）；逐词元对 name / description / body 做子串匹配（词面匹配）。
- 中文：按空白切分；无空白即整句一个词元。逐词元子串匹配，不建词表、不做翻译（决策 #8/#11）。
- 计分：每个词元 name 命中 +3、description 命中 +2、body 命中 +1（取最高命中字段，不叠加）；全部词元都有命中 → 再 +2。
- 过滤：查询词非空时，score = 0 的记录不显示。
- 边界：查询词非空但无有效词元（纯符号）→ 空结果；英文按非字母数字切分，「c++」会切成「c」（词面切分局限，接受）。
- 排序：score 降序 → stars 降序 → name 升序（决策 #14：相关度优先，相关度相同时按 star 数）。

### 卡片（SkillCard）

- 展示六项（决策 #7）：名称、一句话描述、来源仓库（链接 repoUrl）、安装方式（`<code>`）、star 数、更新时间（仓库级，`更新于 YYYY-MM-DD`）。
- 敏感记录：名称旁「⚠️ 安全研究」标签；展开后末尾加说明行：「⚠️ 该技能涉及安全研究：仅供授权测试、学习与防御使用，请遵守当地法律。」
- 点击卡片任意处或名称按钮 → 站内展开/收起 body 全文（保留 Markdown 原文，`white-space: pre-wrap` 渲染，不引渲染库）；名称为真 `<button>`（原生焦点/Enter/Space，aria-expanded 挂于其上），内部链接独立可聚焦、不被卡片键盘处理拦截。
- 展开态底部：「查看源码 ↗」→ skillUrl（新窗口）。

### 新鲜度（formatFreshness，纯函数）

generatedAt 距现在：< 1 小时 →「数据更新于 X 分钟前」；< 24 小时 →「数据更新于 X 小时前」；否则 →「数据更新于 X 天前」；generatedAt 缺失/非法 →「更新时间未知」。语义 = 数据最后变化时间：每日爬虫发现无变化时不刷新 generatedAt（与功能点 #4 零提交配套，已拍板）。

### 空态与错误态

- 无结果：「没有找到匹配的技能」+ 提示「中文和英文技能分开检索，试试另一个框」。
- skills.json 加载失败：「数据加载失败，请稍后刷新重试」。

### 站点配置（src/site-config.js）

```js
export const SITE_CONFIG = {
  // TODO：部署前替换为真实仓库地址（「报告缺失技能」issue 与「手动更新数据」Actions 链接都从它派生）
  repoUrl: "https://github.com/OWNER/ai-skill-search",
};
```

- 报告缺失：`${repoUrl}/issues/new?title=…&body=…`（预填模板：「技能名称/仓库链接：」+「希望收录原因：」）。
- 手动更新：`${repoUrl}/actions/workflows/crawl.yml`。

## GitHub Actions（.github/workflows/crawl.yml）

- 触发：`schedule: cron "30 2 * * *"`（每天 UTC 02:30）+ `workflow_dispatch`（owner 手动跑，决策 #13 A 方案）。
- 权限：`permissions: { contents: write }`。
- 步骤：checkout → setup-node 22 → `node crawler/crawl.mjs`（env GITHUB_TOKEN）→ 先 `git add public/skills.json` 再 `git diff --cached --quiet`（首跑未跟踪文件也能检出变化），有变化才 commit（bot 身份）+ push，无变化零提交（功能点 #4）。

## 文件清单

新建：

```
package.json（22 行）· vite.config.js（8 行）· index.html（13 行）· .gitignore（4 行）
src/main.jsx（10 行）· src/App.jsx（93 行）· src/search.js（78 行）· src/site-config.js（18 行）· src/styles.css（254 行）
src/components/SearchBar.jsx（45 行）· src/components/SkillCard.jsx（76 行）
crawler/crawl.mjs（408 行）· crawler/sources.mjs（54 行）· crawler/lang-detect.mjs（24 行）
public/skills.json（爬虫产物，845 条 ≈5.5MB）
.github/workflows/crawl.yml（41 行）
docs/batches/2026-10-26-ai-skill-search-v1.test.mjs（255 行，本批单元测试，随批档存放）
```

更新：README.md（运行说明）、docs/README.md（文档地图，本批新建）。不改：docs/requirements.md、AGENTS.md。

依赖：react、react-dom（deps）；vite、@vitejs/plugin-react（devDeps）。构建 `base: './'`（相对路径，产物可放任意子路径）。`.gitignore` 含 node_modules/、dist/、.crawl-cache/。

**体积与拆分**：crawler/crawl.mjs 394 行（300–500 预警带内）——已拆独立件：lang-detect.mjs（语言判定）、sources.mjs（源清单/敏感词）；文件内 parseFrontmatter / shouldPublish / collectRepos / crawlRepo / crawlBatch 均为具名函数，删去函数体后骨架仍可读。再增长的下一拆分缝 = collectRepos（收仓）与 main 尾部写盘段外移。App.jsx 93 行，双框与卡片已拆组件。

**命名查重**：SITE_CONFIG / formatFreshness / MIN_SKILLS / CRAWL_LIMIT / shouldPublish / parseFrontmatter —— 本仓均无既有同名（新建仓、无同类先例）。

## 验收标准

| # | 检查 | 命令/依据 |
| --- | --- | --- |
| 1 | 纯静态构建成功 | `npm run build` 退出码 0，产出 dist/ |
| 2 | 爬虫产出合法数据 | 干净环境（无既有 skills.json，如 CI 首跑）：`CRAWL_LIMIT=5 node crawler/crawl.mjs` 退出码 0（5 直连仓产出 >20 条、过发布门），skills.json 含 generatedAt + skills、每条记录字段齐全；既有数据环境下小规模运行被发布门拒绝属预期 |
| 3 | 爬虫可重复运行 | 同一命令二次运行不报错（读 .crawl-cache） |
| 4 | 定时更新工作流 | crawl.yml 含 cron 每日 + workflow_dispatch + diff 无变化不提交逻辑 |
| 5 | 检索与排序 | `node --test docs/batches/2026-10-26-ai-skill-search-v1.test.mjs` 全绿（相关度 > star、语言隔离、中文子串、空词全量、纯符号空态） |
| 6 | 语言判定 | 单测覆盖 zh / en / 日文跳过 / 空正文跳过 |
| 7 | 敏感标记 | 单测覆盖关键词命中 → sensitive=true |
| 8 | 卡片六项 + 标签 + 展开 + 查看源码 | 人工走查（主 agent 浏览器验收，实录落批档 §1；UI 自动化集成套件留待测试依赖批准后引入，届时并入 RTM 行） |
| 9 | 新鲜度文案 | 单测覆盖分钟/小时/天三档 |
| 10 | 报告缺失入口 | site-config.js 派生出 issue 链接；页面可见性同 #8 人工走查 |
| 11 | 发布门 | 单测覆盖：0 条 / 低于下限 / 缩水 >50% 拒绝发布，保留既有文件 |
| 12 | frontmatter 块标量 | 单测覆盖 `>`/`\|-` 折叠与仅剩标记符兜底；重爬后 skills.json 无裸标记符描述 |
| 13 | 链接正则 | 单测：带连字符仓库名不被截断、深链收仓、裸链接正常 |
| 14 | 卡片键盘可达 | 名称按钮原生键盘可达；内部链接 Enter 不被拦截（构建后人工走查） |

验收策略：单测（随批档存放）覆盖纯逻辑（检索/语言判定/敏感/新鲜度/发布门/块标量）；构建 + 语法检查保证产物与脚本；用户可见行为由主 agent 浏览器走查人工验收（实录落批档 §1）。UI 自动化集成套件属依赖决策（待用户批准测试依赖），方案待办见台账。

## 边界（明确不做，v1）

账号/登录；机器翻译与词表；语义搜索（embedding）；公开用户实时重爬（仅 owner 手动触发）；中英以外语言收录；内容隐藏（敏感类全收录仅打标）；EdgeOne 部署（另批，需用户确认 + `-a overseas`）。

## 最近先例

Closest precedent: 无同类先例 —— 本仓为新建仓，无既有实现或同型模块可对齐；对齐项：无；偏离理由：无（首版从零起）。

Survey evidence: checked 公开源 ComposioHQ/awesome-claude-skills、VoltAgent/awesome-claude-skills、travisvn/awesome-claude-skills、heilcheng/awesome-agent-skills、Chat2AnyLLM/awesome-claude-skills、anthropics/skills、obra/superpowers、5tldr/claude-skills、K-Dense-AI/scientific-agent-skills、trailofbits/skills。

relevant：数据源清单（聚合清单为主 + 官方/精选仓直采，落决策 #6）；SKILL.md 格式确认（YAML frontmatter：name/description + Markdown 正文，Anthropic 2025-10 引入、2025-12 开放为标准）。

二手线索（csdn / sina / claudewave / skillsmp / npm 页，N=6）仅作来源发现，未直接采用。
