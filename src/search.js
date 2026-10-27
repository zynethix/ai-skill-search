/**
 * 检索纯逻辑（docs/design.md「检索算法」+「新鲜度」）。
 * 纯函数、无 React 依赖——单元测试与组件共用。
 *
 * - 英文：query 转小写，按非字母数字切分为词元（去重）。
 * - 中文：按空白切分；无空白即整句一个词元。
 * - 计分：每个词元 name 命中 +3、description 命中 +2、body 命中 +1（取最高命中字段，不叠加）；
 *   全部词元都有命中 → 再 +2。
 * - 过滤：查询词非空时，score = 0 的记录不显示；查询词非空但无有效词元（纯符号）→ 空结果。
 * - 排序：score 降序 → stars 降序 → name 升序。
 */

export function tokenizeQuery(query, language) {
  const q = String(query || '').trim().toLowerCase();
  if (q === '') return [];
  const parts = language === 'zh' ? q.split(/\s+/) : q.split(/[^a-z0-9]+/);
  return [...new Set(parts.filter(Boolean))];
}

export function scoreSkill(skill, tokens) {
  if (!tokens || tokens.length === 0) return 0;
  const name = String(skill.name || '').toLowerCase();
  const description = String(skill.description || '').toLowerCase();
  const body = String(skill.body || '').toLowerCase();
  let total = 0;
  let allHit = true;
  for (const token of tokens) {
    let best = 0;
    if (name.includes(token)) best = 3;
    if (description.includes(token)) best = Math.max(best, 2);
    if (body.includes(token)) best = Math.max(best, 1);
    if (best === 0) {
      allHit = false;
      continue;
    }
    total += best;
  }
  return allHit ? total + 2 : total;
}

function byStarsThenName(a, b) {
  if (a.stars !== b.stars) return b.stars - a.stars;
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

export function searchSkills(skills, language, query) {
  const subset = skills.filter((s) => s.language === language);
  const q = String(query || '').trim();
  if (q === '') {
    return subset.slice().sort(byStarsThenName);
  }
  const tokens = tokenizeQuery(q, language);
  if (tokens.length === 0) {
    return []; // 非空查询但无有效词元（如纯符号）→ 空态，避免误显示全量
  }
  return subset
    .map((skill) => ({ skill, score: scoreSkill(skill, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byStarsThenName(a.skill, b.skill))
    .map((x) => x.skill);
}

/**
 * generatedAt 距 now（毫秒时间戳）：
 * < 1 小时 →「数据更新于 X 分钟前」；< 24 小时 →「数据更新于 X 小时前」；否则 →「数据更新于 X 天前」。
 */
export function formatFreshness(generatedAt, now = Date.now()) {
  const t = new Date(generatedAt).getTime();
  if (Number.isNaN(t)) return '更新时间未知';
  const ms = now - t;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `数据更新于 ${Math.max(1, minutes)} 分钟前`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `数据更新于 ${hours} 小时前`;
  return `数据更新于 ${Math.floor(ms / 86_400_000)} 天前`;
}
