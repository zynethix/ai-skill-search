# 2026-10-26 · ai-skill-search v1（站点 + 爬虫 + 定时更新）
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-26 · 来源 = 需求文档 docs/requirements.md 已由用户拍板；用户指令「按需求文档开发，做完本地跑起来给我看」。
> 台账 = #1（ai-skill-search · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-27
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

- **授权口径**：用户 2026-10-26 确认需求文档并指令「按需求文档开发，做完本地跑起来给我看」；同日批准开工方案（含 npm install 许可与「GitHub 仓库地址未定则留配置项」的约定）；本轮不做 EdgeOne 部署（另批）。
- **账先行**：批档 docs/batches/2026-10-26-ai-skill-search-v1.md 已建、台账 #1（ai-skill-search · 在途）已挂、PROJECT-MANIFEST.json 已初始化（文档体系机制文件，随本批一并落位）。
- **关键判据**：需求拍板决策 18 条全部生效；搜索 = 词面匹配、无词表无翻译；排序 = 相关度 → star 降序；收录粒度 = 一条记录一个 SKILL.md、仓库级 star/更新时间共享。
- **本批条目**：见 §2。实现交由 coder 子代理按 docs/design.md 实施（任务书已交付，批档 §5 由其自写）；主 agent 负责真实数据抓取实跑、本地验收（dev server + 浏览器走查）与收口。

- **修复轮（2026-10-27 凌晨）**：独立评审 round 1 判定 changes-required，10 项发现全部处置（9 修 1 等用户——repoUrl），详情见 §5；两份新增拍板已回写 docs/design.md：①「数据更新于」语义 = 数据最后变化时间（与功能点 #4 零提交配套）；②发布门规则（0 条 / 低于下限 / 缩水 >50% 拒绝发布，部分抓取不得静默劣化数据）。
- **环境实录**：本机 SteamTools TLS 拦截 → 本地爬虫需 `NODE_USE_SYSTEM_CA=1`（README 已记）；本地无 token 配额 60 次/小时，完整 40 仓爬取约 10 分钟；数据现状 845 条（zh 17 / en 828 / 敏感 41）。
- **浏览器走查通过**（验收 #8，实录见会话报告）：默认中文 16→17 条按 star、英文 pdf 49 条相关度优先、中文「小红书」4 条语言隔离、敏感标签实显、卡片展开 1824 字符全文 + 查看源码跳 GitHub blob、issue/Actions 链接派生正确。

- **收口评审 round 1 处置（2026-10-27）**：8 项发现（🔴1 · 🟡4 · 🔵3），7 项已修、1 项待用户：🔴#1 集成测试套件需新增 @playwright/test 依赖（守则要求安装依赖先请示）→ 已入台账 #2（归批待办，方案 = 6 条业务用例 + test/RTM.md 对照行）；#2 文件行数标注与拆分缝已写入设计文档；#3 四条防御分支补出处（首轮 16/36 仓 404 实录等）；#4 命名查重行已补；#5 限流退出语义写死（过门 exit 0 / 不过门 exit 1）；#6 验收 #8/#10 标注人工走查；#7 兑底→兜底 + 表格转义；#8 新建 docs/README.md 文档地图。
- **过程教训（记录备查）**：批量行号编辑在同批内按序漂移导致设计文档结构错乱，已整体重写恢复；此后同文件多段修改一律整写或分批按最新行号执行。

- **收口评审 round 2（2026-10-27）**：VERDICT = pass。round 1 八项全部确认（#1 集成测试挂账获接受——依赖决策归用户）；新增 #9（限流措辞与发布门矛盾→已改「写盘结果必过发布门」）、#10（文档地图四层/六行措辞→已改）均已修；调查证据行过段长（doc_check 命中）→已拆段，复查零命中。

- **代码评审 round 2/3（2026-10-27）**：round 2 pass（round 1 十项全确认 + 新增 #11 验收口径、#12 回退计数，均已修）；round 3 pass（12 项全关闭，无新发现）。三轮评审全部收敛，无未决 🔴。

- **代码评审 round 4（2026-10-27）**：pass，12 项全关闭、无新发现。全部评审收敛（代码×4、设计×2）。

## §2 批次任务与设计（主 agent）
**状态行**：（主 agent 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

- **本批条目（覆盖）**：需求文档 docs/requirements.md 十条功能点全量开发（数据爬取 / 语言判定 / skills.json / 定时更新 / 双查询框 / 排序 / 卡片 / 详情 / 新鲜度 / 报告缺失），v1 边界同需求「明确不做」节。
- **设计档落点**：docs/design.md（本批新建，含需求映射表、数据 schema、爬虫与站点机制设计、验收标准、最近先例与调查证据两行）。
- **机制设计**：三件套单向数据流——crawler/（零依赖 Node 爬虫，聚合清单 + 直连仓 + 搜索回退，缓存 + 限流降级）→ public/skills.json（唯一数据文件）→ src/（Vite + React 纯静态站，运行时 fetch）。更新链路 = GitHub Actions 每日 cron + workflow_dispatch，diff 无变化零提交。
- **受影响文件与测试覆盖**：新建文件清单见 docs/design.md「文件清单」节；单元测试（检索计分 / 语言判定 / 敏感判定 / 新鲜度）随批档存放 docs/batches/2026-10-26-ai-skill-search-v1.test.mjs。
- **验收对照**：docs/design.md「验收标准」表 10 条，逐条机械可验；功能点 #1–#10 与需求验收 9 条一一对应。
- **关键决策**：
  - 敏感词表定于 sources.mjs（exploit/pentest/渗透 等 20 词，名称+描述命中即打标；全收录不隐藏，落决策 #15）。
  - 语言判定阈值：CJK/(CJK+拉丁) ≥ 0.3 → 中文；日文假名占比 > 0.1 → 跳过（落功能点 #2「只收中英」）。
  - 实时重爬走 A 方案：站内「手动更新数据」链接到仓库 Actions 页（落决策 #13/#17）。
  - GitHub 仓库地址用户尚未提供（本地 repo 无 remote）→ src/site-config.js 留 `repoUrl` 配置项，部署前填写；已写入「报告缺失」与「手动更新」两处派生链接。
- **上抛项**：无阻塞项；repoUrl 待用户提供（部署前填）。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Integration-test design | 🔴 | docs/design.md has no integration-test design section. The only test material is unit tests (docs/design.md:188 `node --test docs/batches/2026-10-26-ai-skill-search-v1.test.mjs`) plus manual browser walkthrough (docs/design.md:191 "构建后人工走查（主 agent 浏览器验收）"). There is no delta against test/RTM.md (rows broken / redundant / missing). The doc also does not declare the only legal exemption (no business-observable result changed and no scenario the product really needs added). The batch's unit-test file is deleted at closeout, so user-visible results such as dual-box language isolation, relevance-over-stars ordering, card expand and sensitive-tag, and the empty and error states would end with no acceptance. | Add an integration-test design section that starts from test/RTM.md. For each business story (search by Chinese or English box, expand a card, sensitive tag, freshness, report-missing entry, crawler publish gate) list the delta rows, each with the component interaction, the business result asserted, the user entry, and the requirement traced back (docs/requirements.md:51-61). Fix each missing row's number in the RTM before writing the case title. |
| 2 | Affected-file size annotations | 🟡 | The file list (docs/design.md:164-176) has no per-file line count or expected delta. All files are new, so the "current line count" is 0, but README.md is modified and carries no annotation (a pure .md file is exempt). The design also has no split plan or declared size expectation for crawler/crawl.mjs, which carries the whole crawl pipeline in 8 steps (docs/design.md:90-99). | Annotate new source/test files with an expected line range. Declare the expected size of crawl.mjs against the 500-line tier and name its split seams (frontmatter parse, release gate, rate limit), or state that the structure is unchanged. |
| 3 | Branch provenance | 🟡 | Several defensive branches name no scene, observation or reproduction command: the link blacklist and trailing `.git` or period stripping (docs/design.md:92), the 30KB body truncation (docs/design.md:69), and the Japanese kana ratio threshold 0.1 (docs/design.md:95). Only the block-scalar branch has a traceable observation, via acceptance row 12 (docs/design.md:195). | Per branch, quote the real observation (a README line, a repo, a data reading) or give the reproduction command. Where none exists, drop the branch or label it a deliberate default. |
| 4 | Existing-piece check | 🟡 | New names (SITE_CONFIG, formatFreshness, MIN_SKILLS, CRAWL_LIMIT) carry no "existing / none found / existing but unusable" three-question answer. | Add one line per new name. The new repo likely resolves to `none found` for each; say so. |
| 5 | Clarity | 🟡 | Rate-limit behaviour is ambiguous. docs/design.md:98 says "以警告退出" with partial results written. If the exit code is non-zero, the Actions step at docs/design.md:160 fails and a valid partial result is never committed. The design does not state the exit code, nor how it interacts with the publish gate at docs/design.md:99. | State the exit code for the rate-limit warning, and whether the workflow step tolerates it. |
| 6 | Acceptance criteria | 🔵 | Acceptance rows 8 and 10 (docs/design.md:191, docs/design.md:193) rely on manual walkthrough or "页面可见". They are not mechanically verifiable, and the project is not in the integration RTM. Covered by finding 1. | Fold into the RTM rows from finding 1. |
| 7 | Doc hygiene | 🔵 | The text uses "兑底" (docs/design.md:94, docs/design.md:195) where "兜底" is meant. The acceptance row at docs/design.md:195 puts `|-` inside a markdown table cell, which can break the table. | Fix the typo and escape the pipe. |
| 8 | Scope / Document map | 🔵 | No document map exists (README.md under the document roots), so Document ownership is degraded. Placement checked against AGENTS.md only: docs/design.md and docs/requirements.md match the declared layout. Requirement coverage 1-10 and acceptance 1-9 map cleanly (docs/design.md:19-30). The closest-precedent and survey-evidence lines are present (docs/design.md:203, docs/design.md:205). Code was not read (out of review scope), so "round 1 fixes match the code" is `unverified`. | None. |

Counts: 🔴 1 · 🟡 4 · 🔵 3

VERDICT: changes-required

### 轮次 2（评审子代理）

| # | Orig# | File | Severity | Status | Notes |
|---|-------|------|----------|--------|-------|
| 1 | 1 | docs/design.md | 🔴 | Accepted | 集成测试设计缺失，作者以「新增测试依赖须用户批准」延期，design.md:208 记录「UI 自动化集成套件属依赖决策（待用户批准测试依赖），方案待办见台账」，design.md:202 标注人工验收。理由成立（用户决策门），AGENTS.md 规则本轮未核（unverified）；test/RTM.md 不存在（glob 无匹配）。 |
| 2 | 2 | docs/design.md | 🟡 | Fixed | design.md:187 补体积与拆分缝，文件清单带行数（行数未对源码核，范围外）。 |
| 3 | 3 | docs/design.md | 🟡 | Fixed | design.md:101 起「分支依据」四条，默认值已标注。 |
| 4 | 4 | docs/design.md | 🟡 | Fixed | design.md:189 命名查重行在位。 |
| 5 | 5 | docs/design.md | 🟡 | Fixed | design.md:98 退出码语义写明，与 design.md:99 发布门一致。 |
| 6 | 6 | docs/design.md | 🔵 | Fixed | design.md:202/204 标注人工验收。 |
| 7 | 7 | docs/design.md | 🔵 | Fixed | design.md:206 管道符已转义，「兑底」已不存在。 |
| 8 | 8 | docs/README.md | 🔵 | Fixed | 文档地图已建。 |
| 9 | (new) | docs/design.md | 🟡 | New | design.md:98 「数据只增不缩」与 design.md:99 发布门允许缩水至 50% 内不一致（可选修）。 |
| 10 | (new) | docs/README.md | 🔵 | New | docs/README.md:12 「当前四层」与表内六行不符。 |

VERDICT: pass

## §4 用户批准（主 agent）

- **用户批准记录**：用户 2026-10-27 回复「收口」，确认本批交付。站点（845 条真实数据、双框检索、相关度排序、敏感标签、站内展开全文、新鲜度提示）此前已向用户展示运行结果；遗留项（GitHub 仓库地址占位、集成测试套件、Git 存档、部署）经用户知情，随后续批次处理。

## §5 实施记录（实施者：主 agent ∥ coder）
**状态行**：实施完成（18 文件交付，构建/爬虫/单测全绿，浏览器走查留父代理）



- **实施者**：coder 子代理（任务书 = 批档 §2 + docs/design.md），2026-10-26 完成。
- **交付物（18 个文件）**：根配置 package.json（deps 仅 react/react-dom，devDeps 仅 vite/@vitejs/plugin-react；`type: module`）· vite.config.js（`base: './'`）· index.html · .gitignore（node_modules/ dist/ .crawl-cache/）· README.md（运行说明）；站点 src/main.jsx · App.jsx · search.js（检索/计分/新鲜度纯函数）· site-config.js · styles.css · components/SearchBar.jsx · components/SkillCard.jsx；爬虫 crawler/crawl.mjs · sources.mjs · lang-detect.mjs（零 npm 依赖：node:fs + 全局 fetch）；public/skills.json（爬虫实跑产出，250 条）；.github/workflows/crawl.yml；docs/batches/2026-10-26-ai-skill-search-v1.test.mjs。
- **实现要点（均按 docs/design.md）**：
  - 收仓：直连仓排前 + 4 聚合清单 README 提取 `github.com/{owner}/{repo}` 链接（正则拒绝深链、跳过清单自身与 github 官方页），去重，CRAWL_LIMIT 截断；不足 MIN_SKILLS(20) 且来源耗尽时走 GitHub 搜索 API 回退（决策 #6）。
  - 逐仓：API 取 default_branch/stargazers_count/pushed_at + git tree 全量 SKILL.md 路径，两者缓存 .crawl-cache/{owner}__{repo}.json——二次运行零 API 调用（实跑已验证）。
  - 逐条 SKILL.md：raw 抓取（不耗 API 配额）；frontmatter 最小解析（首行起两个 `---` 之间逐行 `key: value`，只认 name/description/install）；body = fence 后全文、上限 30KB；语言判定阈值 c+k+l=0→skip、k/(c+k+l)>0.1→skip、c/(c+l)≥0.3→zh；敏感 = name+description 小写命中 20 词表；缺 frontmatter 时 name 取目录名、description 取正文首个非空非标题行截 200 字符、installMethod 默认 git clone。
  - 输出：按 star 降序写 public/skills.json（name 升序稳定 tie-break）；打印仓数/API 余量/语言计数/敏感计数/跳过数。
  - 限流：x-ratelimit-remaining=0 → 停新 API 请求、当前仓 raw 抓完、保留结果照常写盘、警告退出；零技能时保留既有 skills.json 不覆盖（业务门）。
  - **实施决策（记录备查）**：skills 与既有文件一致时保留原文件不重写（generatedAt 不变）——若每次爬取都刷新 generatedAt，`git diff --quiet` 恒非空、每日必提交，与功能点 #4「无变化零提交」冲突；保留原文件使设计钉死的 diff 逻辑真正生效。
  - 站点：双查询框（任一框输入/聚焦即切活跃语言，初始 zh）；计分 name3/desc2/body1 取最高字段、全命中 +2、score=0 过滤、排序 score→star→name；卡片六项 + ⚠️ 安全研究标签 + 点击展开全文（pre-wrap 保留 Markdown）+ 查看源码 ↗ + 敏感合规说明行；新鲜度分钟/小时/天三档；空态/错误态文案；报告缺失/手动更新链接自 site-config.js repoUrl 派生（待部署前填真实地址）；fetch 用 `import.meta.env.BASE_URL + skills.json`（base './' 构建下相对当前页面，子路径部署可用，dev 下等价 /skills.json）。
- **实跑记录**：npm install exit 0（0 vulnerabilities）；npm run build exit 0 产出 dist/（含 skills.json）；node --check 三爬虫文件全过；`CRAWL_LIMIT=5 node crawler/crawl.mjs` exit 0——收集 435 仓、爬取 5 仓、输出 250 条（zh 16 / en 234、敏感 3、schema 12 字段逐条齐全、按 star 降序）；同命令二次运行 exit 0——API 余量「未收到（全部走缓存）」、数据无变化保留原文件；node --test：17/17 pass、0 fail；vite preview 冒烟：index 200、skills.json 200、title「AI Skill 搜索」。
- **环境注意**：开发机装有 SteamTools TLS 拦截（证书 CN=SteamTools Certificate），Node 自带 CA 不信任 → 本地跑爬虫需 `NODE_USE_SYSTEM_CA=1`；GitHub Actions 环境无此问题。代码未为此改任何信任逻辑（不回退 TLS 校验）。
- **留给父代理**：验收标准 #8 浏览器人工走查、Git 存档提醒、site-config repoUrl 待用户提供、部署另批（需用户确认 + `-a overseas`）。

- **修复轮（实施者：主 agent，2026-10-27 凌晨）**——独立代码评审（round 1）10 项发现，处置如下（响应表见会话）：
  1. 🔴 frontmatter 块标量：parseFrontmatter 重写——`>` `|` `>-` `|-` 折叠续行，仅剩标记符走 fallbackDescription；导出供单测。实跑验证：重爬后 skills.json 845 条、块标量残留 0（修复前 10+ 条描述为裸标记符）。
  2. 🟡 发布门：新增 shouldPublish——0 条 / 低于 MIN_SKILLS(20) / 较上次缩水 >50% → 拒绝覆盖既有文件 + 非零退出。实跑验证：一次部分抓取（372 vs 845）被门拦截，保留既有文件不覆盖。
  3. 🟡 workflow 首跑：改为先 `git add` 再 `git diff --cached --quiet`，未跟踪新文件也能检出变化。
  4. 🟡 新鲜度语义：拍板 generatedAt = 数据最后变化时间，无变化不刷新（与零提交配套），已写入 docs/design.md。
  5. 🟡 repoUrl 占位：等用户提供仓库地址（协调项，非缺陷）。
  6. 🟡 卡片可达性：role="button" + tabIndex=0 + aria-expanded + Enter/Space 展开。
  7. 🔵 formatDate：不可解析日期返回「未知」，不再 RangeError 崩页。
  8. 🔵 链接提取：剥 `.git`/句尾句点 + github 组织路径黑名单；搜索回退条件改为与本批截断后数量比较。
  9. 🔵 设计文档：总体架构改为按 BASE_URL 相对路径 fetch。
  10. 🔵 检索边界：非空查询无有效词元（纯符号）→ 空结果；「c++」切分局限写入设计文档。
- **随修复的新增机制**：crawl.mjs 末尾显式 `process.exit`（undici keep-alive 连接会让进程在工作完成后仍挂住——修复前一次完整爬取写盘成功后被工具超时误杀）；isMain 守卫使 parseFrontmatter/shouldPublish 可被单测导入。
- **单测**：17 → 24 用例全绿（新增块标量×4、发布门×1、检索边界×2）。
- **数据实跑**：845 条（zh 17 / en 828 / 敏感 41），13 字段完整、id 唯一、star 降序、块标量残留 0；发布门拦截一次部分抓取（实录见上）。

## §6 验证与收口（父代理）

- **收口时间**：2026-10-27。
- **验证清单（本批实跑）**：单测 `node --test docs/batches/2026-10-26-ai-skill-search-v1.test.mjs` 24/24 绿；`npm run build` exit 0（dist/ 纯静态产物）；`node --check` 三个爬虫文件全过；skills.json 机器核验：845 条、13 字段齐全、id 唯一、star 降序、块标量残留 0、zh 17 / en 828 / 敏感 41；浏览器走查实录：默认「中文技能 · 17 条」按 star、英文框 pdf 49 条相关度优先、中文框「小红书」4 条语言隔离、敏感标签实显、卡片展开 1824 字符全文、查看源码/报告缺失/手动更新三链接正确、新鲜度「数据更新于 X 分钟前」显示。
- **收口测试行**：`node --test docs/batches/2026-10-26-ai-skill-search-v1.test.mjs` → tests 24 / pass 24 / fail 0（2026-10-27 实跑）。
- **评审链**：代码评审 + 设计评审共 7 个实质轮次全部 pass（代码 round 1 发现 10 项、设计 round 1 发现 8 项，全部处置或挂账；后续复核轮零新发现）；框架机械复核轮结论与最终状态一致。
- **台账**：#1「ai-skill-search v1 开发」随本收口结算；#2「UI 自动化集成套件 + test/RTM.md」由冻结自动重锚至下批。
- **遗留（用户知情）**：① src/site-config.js 的 repoUrl 仍为占位符，待用户提供真实仓库地址后替换（部署前必做）；② Git 存档待用户指令（当前 14 个未提交改动）；③ EdgeOne 部署另批（需用户确认 + `-a overseas`）。
