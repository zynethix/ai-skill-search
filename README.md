# ai-skill-search

AI Skill 搜索：公开只读静态站，搜索 GitHub 上的 AI 技能（SKILL.md 技能包）。中文界面，技能名称/描述保留原文。

- 需求契约：docs/requirements.md（用户已拍板）
- 设计文档：docs/design.md（schema、算法、文件清单）

## 目录说明

- crawler/：零依赖 Node 爬虫，抓 GitHub 聚合清单与直连技能仓，产出 public/skills.json
- public/skills.json：唯一数据文件，随站点静态发布
- src/：Vite + React 纯静态站，运行时拉取 skills.json
- .github/workflows/crawl.yml：GitHub Actions 每日定时爬取（数据变化才提交）
- docs/batches/：批次档案与随批单元测试

## 本地运行

```bash
npm install
npm run dev        # 开发服务器（默认 http://localhost:5173）
npm run build      # 构建纯静态产物到 dist/
npm run preview    # 预览构建产物
```

## 运行爬虫

```bash
node crawler/crawl.mjs                              # 全量（默认上限 40 个仓库）
CRAWL_LIMIT=5 node crawler/crawl.mjs                # 调试：只爬 5 个仓库
GITHUB_TOKEN=xxx node crawler/crawl.mjs             # 带 token 提高 API 配额
node --test docs/batches/2026-10-26-ai-skill-search-v1.test.mjs   # 单元测试
```

爬虫把仓库元信息缓存到 .crawl-cache/（已 gitignore），二次运行不耗 API 配额；结果写 public/skills.json，数据无变化时不重写文件（配合 Actions 的 diff 判断实现零提交）。

本机装有 TLS 拦截代理（如 SteamTools）时，Node 不信任其证书，本地跑爬虫需加前缀：`NODE_USE_SYSTEM_CA=1 node crawler/crawl.mjs`（GitHub Actions 环境无此问题）。

## 部署

静态产物部署到 EdgeOne Pages；部署命令必须带 `-a overseas`（海外节点、免备案），执行前需用户确认（详见 AGENTS.md）。
