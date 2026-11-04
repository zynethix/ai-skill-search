# 2026-11-04 · deploy-record
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-11-04 · 来源 = 用户 2026-11-04「同意」计划：清理 .gitignore、修订 design.md 过时表述；随后给出 Deploy URL，要求补记部署。
> 台账 = #3（ai-skill-search · 归批）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-11-04
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

用户 2026-11-04「同意」：退出计划模式后做三件事。
1. `.gitignore`：删除末尾只含两个空格、无换行的第 10 行；EdgeOne 忽略项（.env、.edgeone/*、.tef_dist/*）保留。
2. `docs/design.md`：删除集成套件的过时表述（验收表第 8 行、验收策略段），并在「边界」节补记「UI 自动化集成套件：用户裁定不做」。依据 = 台账 #2 已废弃（用户 2026-11-04 裁定）。
3. 部署补记：用户给出 Deploy URL `https://ai-skill-search-dpe5n4wcdidp.edgeone.dev/`。
读数：主 agent 用 fetch 访问该地址，返回 HTTP 401；原因未查明（可能是预览地址带访问保护，也可能 fetch 不带凭据），故线上可达性未核实，标 unverified。
台账：#3 在途，task_book 指向本档。

评审第 1 轮（changes-required，5 条）处置：#1 在 design.md 验收策略段补「不设集成套件、无 test/RTM.md（用户裁定不做）」；#2 文件清单 .gitignore 行数改 9、内容描述补全；#3 验收策略段删去无对应验收行的「语法检查」；#5 删去收仓步骤中的历史句（出处保留在「分支依据」节）；#4 Deferred（给第 8 行新增空态/加载失败/敏感说明走查项，属新增验收，超出本轮清理范围，交用户裁定）。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

**本批条目**：①`.gitignore` 删末尾仅含空格的无换行行；②`docs/design.md` 删集成套件过时表述并补边界；③部署补记（用户 2026-11-04 给出 Deploy URL，并裁定「我用浏览器能打开网页，你就记部署成功」）。
**文档对齐落点（语义合并，终态）**：
- `docs/design.md` 新增「部署」节（平台 / 命令 `edgeone makers deploy -a overseas` / 线上地址 / 忽略项），GitHub Actions 节的「部署链路另批确认」改为「需手动重新部署（见「部署」节）」，边界节删去「EdgeOne 部署（另批）」。
- `README.md`「部署」节补线上地址与「数据更新后需重新部署才到线上」。
**closest-precedent**：无同类先例，沿用 AGENTS.md 部署红线（`-a overseas`、部署前确认、部署后告知 Deploy URL）。**survey-evidence**：checked AGENTS.md 部署规范、docs/design.md 全文、README.md；相关 = 部署红线与 .gitignore 现状，无其他相关源。
**验收对照**：无代码改动；文档与实际文件逐处 read 核对；评审 round 1 changes-required → round 2 pass。
**上抛项**：评审第 4 条（第 8 行补空态/加载失败/敏感说明走查项）Deferred，待用户裁定。线上可达性：fetch 返回 401，但用户已用浏览器确认能打开，按用户裁定记部署成功。

## §3 设计评审（评审子代理）

### 轮次 1（评审子代理）

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Integration-test design | 🔴 | docs/design.md has no integration-test design section, and test/RTM.md does not exist (glob returned no match). The only related text is the boundary item at docs/design.md:213 ("UI 自动化集成套件（用户裁定不做，用户可见行为靠人工走查）"). It is a scope exclusion. It does not say the change alters no business-observable result an existing case asserts and adds no scenario the product really needs. The only allowed exemption has to be stated in the integration section itself. | Add a short integration-test section to the design. It should say test/RTM.md is absent, so there are no rows to break, make redundant or add. It should say the change is deleting stale wording and so alters no business-observable result and adds no scenario. It should give the reason (user ruling of 2026-11-04, ledger #2 abandoned). |
| 2 | Affected-file size annotation | 🟡 | .gitignore is on the modification list. docs/design.md:173 annotates it as ".gitignore（4 行）" and docs/design.md:184 says it "含 node_modules/、dist/、.crawl-cache/". The file as read has 9 lines and also carries .DS_Store, .env, .edgeone/* and .tef_dist/* (.gitignore:4-9). The line count, the contents description and the expected delta for the end-of-file cleanup are all stale or missing. | Fix the line count and the contents description to match the file. Add the expected delta for the cleanup (for example "≤±1 行"). |
| 3 | Acceptance criteria | 🟡 | docs/design.md:209 says "构建 + 语法检查保证产物与脚本". The acceptance table (docs/design.md:192-207) has no row or command for a syntax check. Row 1 covers only `npm run build`. The strategy paragraph promises a check that nothing verifies. | Either add a row with an explicit command (for example `node --check crawler/crawl.mjs`), or delete "语法检查" from the strategy paragraph. |
| 4 | Acceptance criteria | 🔵 | Row 8 (docs/design.md:201), row 10 and row 14 are manual walkthroughs only. The empty state and the load-failure state defined at docs/design.md:148-149 are not covered by any row. The sensitive-record expanded note (docs/design.md:138) is also not named in row 8's checklist. | Add the empty state, the load-failure state and the sensitive note to the row 8 walkthrough items, so the batch §1 record has a checklist to be checked against. |
| 5 | Doc hygiene | 🔵 | docs/design.md:92 keeps revision-style text in the normative flow step: "旧前瞻排除法曾漏转义连字符、把带连字符仓库名截成前缀——已弃用，有单测". This is outside the target surface. | The provenance already sits in the branch-basis section at docs/design.md:103. Delete the history sentence from step 1 in a later pass. |

Spot-check notes: the stale integration-suite wording is gone from row 8, from the strategy paragraph (docs/design.md:209) and from the boundary section (docs/design.md:213). A grep-style read of the whole file finds the only remaining mention of an integration suite at line 213, as an exclusion. The strategy paragraph names no full-suite run, and row 5 names a single test file, so there is no release-gate-as-round-cost problem. The closest-precedent line (docs/design.md:217) and the survey-evidence line (docs/design.md:219) are present. The line counts for crawl.mjs (408) and the test file (255) are unverified, because those files are outside the review scope. The EdgeOne deployment item at docs/design.md:213 is consistent with the AGENTS.md red lines.

Counts: 🔴 1 · 🟡 2 · 🔵 2

VERDICT: changes-required

### 轮次 2（评审子代理）

| # | Orig# | File | Severity | Status | Notes |
|---|-------|------|----------|--------|-------|
| 1 | 1 | docs/design.md | 🔴 | Fixed | design.md:209 now reads "本项目不设 UI 自动化集成套件、无 test/RTM.md（用户裁定不做）：用户可见行为靠人工走查，没有可被改动波及的集成用例行。" test/RTM.md glob returned no match. |
| 2 | 2 | docs/design.md | 🟡 | Fixed | design.md:173 ".gitignore（9 行）" and design.md:184 list node_modules/, dist/, .crawl-cache/, .DS_Store, .env, .edgeone/*, .tef_dist/*; .gitignore as read has 9 lines. |
| 3 | 3 | docs/design.md | 🟡 | Fixed | design.md:209 strategy paragraph says "构建保证产物" and no longer mentions 语法检查. |
| 4 | 4 | docs/design.md | 🔵 | Accepted | Deferred with reason (extra walkthrough items are outside cleanup scope; raised to the user). 🔵 never blocks. |
| 5 | 5 | docs/design.md | 🔵 | Fixed | design.md:92 no longer contains the history sentence; provenance stays in design.md:103. |

No new issues introduced by the fixes.

VERDICT: pass

### 轮次 3（评审子代理）

| # | Category | Severity | Issue | Suggestion |
|---|----------|----------|-------|------------|
| 1 | Document ownership | 🟡 | 线上地址同时写在 docs/design.md:172（`线上地址：https://ai-skill-search-dpe5n4wcdidp.edgeone.dev/`）和 README.md:40（`线上地址：https://ai-skill-search-dpe5n4wcdidp.edgeone.dev/`）。重新部署后地址若变，两处会不同步。两处目前一致，不构成矛盾。 | 只保留一处写地址（门户 README 更合适），另一处指向它；或在设计档里写明 README 为地址权威。 |
| 2 | Acceptance criteria | 🟡 | 「部署」节新增了部署事实（产物 dist/、命令、地址、.gitignore 项），但验收表 1–14 没有一条覆盖部署：地址可访问、线上 skills.json 可加载。验收 #1 只验 `npm run build`。 | 加一条验收，例如部署后人工打开线上地址，确认页面加载、数据新鲜度文案正常；或在「验收策略」里写明部署不设验收及原因。 |
| 3 | Clarity | 🟡 | design.md:166 `数据提交后需手动重新部署才到达线上站点` 和 README.md:42 `数据更新提交后，需要重新部署才会到达线上站点` 都说了这个后果。每日定时爬取之后线上数据靠人工部署，但没说明谁、何时、怎么触发。这和 design.md:15 的「更新链路」描述的全自动链路有落差。 | 在「更新链路」或「部署」节一句话说明：线上数据新鲜度取决于 owner 手动部署，每日爬取只更新仓库内的 skills.json。 |
| 4 | Methodology | 🔵 | AGENTS.md 部署红线第 3 条要求部署完成后把 Deploy URL 直接告诉用户，design.md:171 只复述了「执行前须用户确认」和 `-a overseas`，没提这一条。 | 在「部署」节补一句「部署完成后告知用户 Deploy URL」，与守则对齐。 |
| 5 | Doc hygiene | 🔵 | `.env`、`.edgeone/*`、`.tef_dist/*` 的忽略说明出现两次：design.md:173 和 design.md:191。两处一致，只是重复。 | 保留一处，另一处引用。 |
| 6 | Existing-piece / provenance | 🔵 | 线上地址 `edgeone.dev` 域名是否为长期有效的正式地址，设计档没有说明，我无法从评审范围内核实（unverified）。 | 注明该地址是 EdgeOne 部署返回的 Deploy URL，并标出取得日期。 |

范围核对结论：
- 部署命令 `edgeone makers deploy -a overseas`、`-a overseas` 不可省略、执行前须用户确认，这三项与 AGENTS.md 部署规范一致。
- 边界节（design.md:220）已删除 EdgeOne 部署项，与「部署」节不再冲突。
- Actions 节 design.md:166 的「见『部署』节」指向存在。
- 本次范围内没有新增防御分支，分支依据条款不适用。
- 集成测试条款：design.md:216 已写明不设 RTM 的用户裁定，属第 1、2 轮已过范围，本轮不重议。
- 两份文档均为纯 .md，文件体积标注豁免。

计数：🔴 0 · 🟡 3 · 🔵 3

VERDICT: pass

## §4 用户批准（主 agent）

用户原话（2026-11-04）：「我用浏览器能打开网页，你就记部署成功。写线上地址。收口」。
裁定：①部署记为成功（依据 = 用户浏览器可打开，主 agent 的 fetch 401 不作否决）；②线上地址写入 README 与 design.md；③进入收口。
说明：设计文档的「部署」节为评审 round 2 之后新增，收口前补做一轮评审核验该新增部分。

## §5 实施记录（实施者：主 agent ∥ coder）
## §6 验证与收口（父代理）

**收口记录（2026-11-04）**
- 评审：design 评审三轮。round 1 changes-required（5 条）→ round 2 pass；round 3（补评部署节）pass，提 6 条建议（🟡3 🔵3），全部落实：线上地址只在 README.md 写一处、design.md 指向它；验收表新增 #15（线上部署可用）；「部署」节补手动重新部署说明与「告知 Deploy URL」；重复的忽略项说明去重；README 地址旁注明取得日期。round 1 第 4 条（第 8 行补空态/加载失败/敏感说明走查项）Deferred，待用户另行裁定，未入本批。
- 落地：`.gitignore`（删末尾仅含空格行）、`docs/design.md`（删集成套件过时表述、新增「部署」节与验收 #15、文件清单行数对齐）、`README.md`（线上地址）。
- 验证：无代码改动，未跑 npm test / npm run build；改动逐处 read 核对，评审通过。
- 部署读数：Deploy URL `https://ai-skill-search-dpe5n4wcdidp.edgeone.dev/`，主 agent 的 fetch 返回 HTTP 401（未查明）；用户 2026-11-04 裁定「我用浏览器能打开网页，你就记部署成功」，据此记部署成功，依据 = 用户浏览器确认，非主 agent 实测。
- 未做：第 4 号 Git 存档（用户自行决定提交）。
