/**
 * 站点配置（docs/design.md「站点配置」）：
 * 「报告缺失技能」issue 与「手动更新数据」Actions 链接都从 repoUrl 派生。
 */
export const SITE_CONFIG = {
  // TODO：部署前替换为真实仓库地址（「报告缺失技能」issue 与「手动更新数据」Actions 链接都从它派生）
  repoUrl: "https://github.com/OWNER/ai-skill-search",
};

export function reportIssueUrl() {
  const title = encodeURIComponent('技能收录请求');
  const body = encodeURIComponent('技能名称/仓库链接：\n\n希望收录原因：');
  return `${SITE_CONFIG.repoUrl}/issues/new?title=${title}&body=${body}`;
}

export function manualUpdateUrl() {
  return `${SITE_CONFIG.repoUrl}/actions/workflows/crawl.yml`;
}
