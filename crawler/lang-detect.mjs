/**
 * 技能语言判定（docs/design.md「流程」第 4 步）：
 * body 中统计 CJK 字符 c、日文假名 k、拉丁字母 l：
 * - c+k+l = 0 → skip（空正文）；
 * - k/(c+k+l) > 0.1 → skip（日文等，需求只收中英）；
 * - c/(c+l) ≥ 0.3 → zh；
 * - 否则 → en。
 */
const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF]/g;
const KANA_RE = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/g;
const LATIN_RE = /[a-zA-Z]/g;

const count = (text, re) => (text.match(re) || []).length;

export function detectLanguage(body) {
  const text = typeof body === 'string' ? body : '';
  const c = count(text, CJK_RE);
  const k = count(text, KANA_RE);
  const l = count(text, LATIN_RE);
  const total = c + k + l;
  if (total === 0) return 'skip';
  if (k / total > 0.1) return 'skip';
  return c / (c + l) >= 0.3 ? 'zh' : 'en';
}
