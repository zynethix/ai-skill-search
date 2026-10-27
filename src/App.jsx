import { useEffect, useMemo, useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import SkillCard from './components/SkillCard.jsx';
import { formatFreshness, searchSkills } from './search.js';
import { manualUpdateUrl, reportIssueUrl } from './site-config.js';

const SITE_TITLE = 'AI Skill 搜索';
const SITE_TAGLINE = '搜索 GitHub 上的 AI 技能（SKILL.md 技能包）';

export default function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [activeLang, setActiveLang] = useState('zh');
  const [zhQuery, setZhQuery] = useState('');
  const [enQuery, setEnQuery] = useState('');

  useEffect(() => {
    // base './' 构建下 BASE_URL = './'，相对当前页面取数据；dev 下 = '/'
    fetch(`${import.meta.env.BASE_URL}skills.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setLoadError(true));
  }, []);

  const skills = data && Array.isArray(data.skills) ? data.skills : [];
  const activeQuery = activeLang === 'zh' ? zhQuery : enQuery;
  const results = useMemo(
    () => searchSkills(skills, activeLang, activeQuery),
    [skills, activeLang, activeQuery],
  );

  const langLabel = activeLang === 'zh' ? '中文技能' : 'English skills';

  return (
    <div className="page">
      <header className="site-header">
        <h1>{SITE_TITLE}</h1>
        <p className="tagline">{SITE_TAGLINE}</p>
        {data && <p className="freshness">{formatFreshness(data.generatedAt)}</p>}
        <p className="site-links">
          <a href={reportIssueUrl()} target="_blank" rel="noreferrer">
            报告缺失技能
          </a>
          <a href={manualUpdateUrl()} target="_blank" rel="noreferrer">
            手动更新数据
          </a>
        </p>
      </header>

      <SearchBar
        activeLang={activeLang}
        zhQuery={zhQuery}
        enQuery={enQuery}
        onZhChange={setZhQuery}
        onEnChange={setEnQuery}
        onActivate={setActiveLang}
      />

      <main className="results">
        {loadError ? (
          <p className="error-state">数据加载失败，请稍后刷新重试</p>
        ) : !data ? (
          <p className="loading-state">数据加载中…</p>
        ) : (
          <>
            <h2 className="results-title">
              {langLabel} · {results.length} 条
            </h2>
            {results.length === 0 ? (
              <div className="empty-state">
                <p>没有找到匹配的技能</p>
                <p className="empty-hint">中文和英文技能分开检索，试试另一个框</p>
              </div>
            ) : (
              <div className="skill-list">
                {results.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <p>数据来源：GitHub 公开仓库 · 数据每日自动抓取</p>
      </footer>
    </div>
  );
}
