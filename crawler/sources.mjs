/**
 * 数据源与词表（docs/design.md「数据源」节 + 敏感判定词表）。
 */

/** 聚合清单（决策 #6 主路径）：从 README 提取 github 仓库链接 */
export const AWESOME_LISTS = [
  'ComposioHQ/awesome-claude-skills',
  'VoltAgent/awesome-claude-skills',
  'travisvn/awesome-claude-skills',
  'heilcheng/awesome-agent-skills',
];

/** 直连技能仓（官方/知名，保证基本盘；排前优先爬取） */
export const DIRECT_REPOS = [
  'anthropics/skills',
  'obra/superpowers',
  '5tldr/claude-skills',
  'JimLiu/baoyu-skills',
  'K-Dense-AI/scientific-agent-skills',
  'trailofbits/skills',
];

/** 退路阈值：最终技能数 < MIN_SKILLS 时用 GitHub 搜索 API 补源 */
export const MIN_SKILLS = 20;

/** 敏感词表（决策 #15）：名称+描述小写后命中任一 → sensitive=true */
export const SENSITIVE_KEYWORDS = [
  'exploit',
  'pentest',
  'penetration',
  'phishing',
  'malware',
  'ransomware',
  'hacking',
  'red team',
  'offensive security',
  'vulnerability',
  'social engineering',
  'keylogger',
  'backdoor',
  'credential',
  'fuzzing',
  'reverse engineering',
  '渗透',
  '攻击',
  '漏洞',
  '钓鱼',
];

/** 敏感判定：text 小写后命中词表任一 → true */
export function matchesSensitive(text) {
  const lower = String(text || '').toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}
