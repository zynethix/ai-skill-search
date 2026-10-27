import { useState } from 'react';

function formatDate(iso) {
  if (!iso) return '未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  return d.toISOString().slice(0, 10);
}

/**
 * 技能卡片（docs/design.md「卡片」）：
 * 六项：名称、一句话描述、来源仓库（链接 repoUrl）、安装方式（<code>）、star 数、更新时间（更新于 YYYY-MM-DD）。
 * 敏感记录：名称旁「⚠️ 安全研究」标签；展开后末尾加合规说明行。
 * 点击卡片任意处或名称按钮 → 站内展开/收起 body 全文（white-space: pre-wrap，保留 Markdown 原文）；
 * 名称为真按钮（原生焦点/Enter/Space），内部链接独立可聚焦、不被卡片拦截。
 * 展开态底部：「查看源码 ↗」→ skillUrl（新窗口）。
 */
export default function SkillCard({ skill }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = `skill-body-${String(skill.id).replace(/[^a-zA-Z0-9-]/g, '-')}`;

  return (
    <article
      className={`skill-card${expanded ? ' expanded' : ''}`}
      onClick={() => {
        if (window.getSelection()?.toString()) return; // 拖选文字时不误触展开
        setExpanded((v) => !v);
      }}
    >
      <div className="skill-card-header">
        <h3 className="skill-name">
          <button
            type="button"
            className="skill-name-btn"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {skill.name}
            {skill.sensitive && <span className="sensitive-tag">⚠️ 安全研究</span>}
          </button>
        </h3>
        <span className="skill-stars">⭐ {skill.stars}</span>
      </div>
      <p className="skill-description">{skill.description}</p>
      <div className="skill-meta">
        <span>
          来源：
          <a
            href={skill.repoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {skill.sourceRepo}
          </a>
        </span>
        <span>更新于 {formatDate(skill.updatedAt)}</span>
      </div>
      <p className="skill-install">
        <code>{skill.installMethod}</code> <span className="install-hint">（来自技能作者，请自行核实）</span>
      </p>
      {expanded && (
        <div className="skill-body" id={bodyId} onClick={(e) => e.stopPropagation()}>
          <pre>{skill.body}</pre>
          {skill.sensitive && (
            <p className="sensitive-note">
              ⚠️ 该技能涉及安全研究：仅供授权测试、学习与防御使用，请遵守当地法律。
            </p>
          )}
          <a className="source-link" href={skill.skillUrl} target="_blank" rel="noreferrer">
            查看源码 ↗
          </a>
        </div>
      )}
    </article>
  );
}
