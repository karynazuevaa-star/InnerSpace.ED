import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { ED_MODEL_NODES, ED_MODEL_INTRO_RU, ED_MODEL_INTRO_EN, ED_MODEL_SOURCES } from '../content/edModel';

export function EDModelViewer() {
  const { t, lang } = useLanguage();
  const [selectedId, setSelectedId] = useState(ED_MODEL_NODES[0].id);
  const selected = ED_MODEL_NODES.find((n) => n.id === selectedId) ?? ED_MODEL_NODES[0];

  return (
    <div className="edmodel-viewer">
      <div className="edmodel-diagram">
        <svg className="edmodel-loop" viewBox="0 0 1000 60" preserveAspectRatio="none">
          <defs>
            <marker id="edmodel-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-a)" />
            </marker>
          </defs>
          <path
            d="M 980 58 L 980 12 L 20 12 L 20 50"
            fill="none"
            stroke="var(--accent-a)"
            strokeWidth="2"
            markerEnd="url(#edmodel-arrow)"
          />
        </svg>

        <div className="edmodel-row">
          {ED_MODEL_NODES.map((node, i) => (
            <div className="edmodel-row-item" key={node.id}>
              <button
                type="button"
                className={`edmodel-box${node.id === selectedId ? ' edmodel-box-active' : ''}`}
                onClick={() => setSelectedId(node.id)}
              >
                <h3>{lang === 'ru' ? node.titleRu : node.titleEn}</h3>
                <ul>
                  {(lang === 'ru' ? node.itemsRu : node.itemsEn).map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </button>
              {i < ED_MODEL_NODES.length - 1 && <span className="edmodel-connector">⇄</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="edmodel-panel">
        <h3 className="edmodel-panel-title">{lang === 'ru' ? selected.titleRu : selected.titleEn}</h3>
        <p className="edmodel-panel-text">{lang === 'ru' ? selected.explanationRu : selected.explanationEn}</p>

        <h4 className="brain-sources-heading">{t('brain.sources')}</h4>
        <ul className="brain-sources-list">
          {ED_MODEL_SOURCES.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <p className="brain-footer">{lang === 'ru' ? ED_MODEL_INTRO_RU : ED_MODEL_INTRO_EN}</p>
    </div>
  );
}
