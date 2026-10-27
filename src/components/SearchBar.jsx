/**
 * 双查询框（docs/design.md「双框交互」）：
 * 任一框输入或聚焦 → 该框语言成为活跃语言，结果区只显示该语言技能；两框互不串数据。
 */
export default function SearchBar({
  activeLang,
  zhQuery,
  enQuery,
  onZhChange,
  onEnChange,
  onActivate,
}) {
  return (
    <div className="search-row">
      <div className={`search-box${activeLang === 'zh' ? ' active' : ''}`}>
        <label htmlFor="zh-search">中文技能</label>
        <input
          id="zh-search"
          type="search"
          placeholder="搜中文技能，如：小红书"
          value={zhQuery}
          onChange={(e) => {
            onZhChange(e.target.value);
            onActivate('zh');
          }}
          onFocus={() => onActivate('zh')}
        />
      </div>
      <div className={`search-box${activeLang === 'en' ? ' active' : ''}`}>
        <label htmlFor="en-search">English skills</label>
        <input
          id="en-search"
          type="search"
          placeholder="Search English skills, e.g. pdf"
          value={enQuery}
          onChange={(e) => {
            onEnChange(e.target.value);
            onActivate('en');
          }}
          onFocus={() => onActivate('en')}
        />
      </div>
    </div>
  );
}
