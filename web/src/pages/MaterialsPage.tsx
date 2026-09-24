import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { TECHNIQUES, SCREENING, PSYCHOEDUCATION, INSTRUMENTS, type Technique, type Instrument } from '../content/techniques';
import { BrainViewer } from '../components/BrainViewer';
import { EDModelViewer } from '../components/EDModelViewer';

type Folder = 'techniques' | 'screening' | 'psychoeducation';
type PsychoTab = 'brain' | 'edmodel';
type OpenItem = { kind: 'technique'; item: Technique } | { kind: 'instrument'; item: Instrument };

const LISTS: Record<Folder, Technique[]> = {
  techniques: TECHNIQUES,
  screening: SCREENING,
  psychoeducation: PSYCHOEDUCATION,
};

export function MaterialsPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder>('techniques');
  const [psychoTab, setPsychoTab] = useState<PsychoTab>('brain');
  const [open, setOpen] = useState<OpenItem | null>(null);
  const list = LISTS[folder];

  return (
    <div className="techniques-page">
      <h1>{t('nav.materials')}</h1>

      <div className="techniques-folder-row">
        <button
          type="button"
          className={`pill${folder === 'techniques' ? ' pill-active' : ''}`}
          onClick={() => setFolder('techniques')}
        >
          {t('techniques.folderTechniques')}
        </button>
        <button
          type="button"
          className={`pill${folder === 'screening' ? ' pill-active' : ''}`}
          onClick={() => setFolder('screening')}
        >
          {t('techniques.folderScreening')}
        </button>
        <button
          type="button"
          className={`pill${folder === 'psychoeducation' ? ' pill-active' : ''}`}
          onClick={() => setFolder('psychoeducation')}
        >
          {t('techniques.folderPsychoeducation')}
        </button>
      </div>

      {folder === 'techniques' && <p className="techniques-lang-note">{t('techniques.intro')}</p>}
      {folder === 'screening' && <p className="techniques-lang-note">{t('techniques.introScreening')}</p>}

      {folder === 'psychoeducation' ? (
        <>
          <div className="techniques-folder-row psychoeducation-tab-row">
            <button
              type="button"
              className={`pill${psychoTab === 'brain' ? ' pill-active' : ''}`}
              onClick={() => setPsychoTab('brain')}
            >
              {t('techniques.psychoTabBrain')}
            </button>
            <button
              type="button"
              className={`pill${psychoTab === 'edmodel' ? ' pill-active' : ''}`}
              onClick={() => setPsychoTab('edmodel')}
            >
              {t('techniques.psychoTabEdModel')}
            </button>
          </div>

          {psychoTab === 'brain' ? <BrainViewer /> : <EDModelViewer />}

          {list.length > 0 && (
            <div className="techniques-grid psychoeducation-more-grid">
              {list.map((technique) => (
                <button
                  key={technique.id}
                  type="button"
                  className="technique-card"
                  onClick={() => setOpen({ kind: 'technique', item: technique })}
                >
                  <h3>{technique[lang].title}</h3>
                  <p>{technique[lang].goal}</p>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="techniques-grid">
          {list.map((technique) => (
            <button
              key={technique.id}
              type="button"
              className="technique-card"
              onClick={() => setOpen({ kind: 'technique', item: technique })}
            >
              <h3>{technique[lang].title}</h3>
              <p>{technique[lang].goal}</p>
            </button>
          ))}
          {folder === 'screening' &&
            INSTRUMENTS.map((instrument) => (
              <button
                key={instrument.id}
                type="button"
                className="technique-card instrument-card"
                onClick={() => setOpen({ kind: 'instrument', item: instrument })}
              >
                <h3>{instrument[lang].title}</h3>
                <p>{instrument[lang].summary}</p>
              </button>
            ))}
        </div>
      )}

      {open && open.kind === 'technique' && (
        <div className="technique-modal-overlay" onClick={() => setOpen(null)}>
          <div className="technique-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="technique-modal-close" onClick={() => setOpen(null)}>
              {t('techniques.close')}
            </button>
            <h2>{open.item[lang].title}</h2>

            <h4>{t('techniques.goal')}</h4>
            <p>{open.item[lang].goal}</p>

            <h4>{t('techniques.description')}</h4>
            <p className="technique-modal-description">{open.item[lang].description}</p>

            <h4>{t('techniques.questions')}</h4>
            <ul>
              {open.item[lang].questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>

            {/* Only techniques that carry avatarSteps get this button -
                SCREENING's two Technique entries don't define it, so they
                fall back to no button rather than an empty guide. Jumps
                straight to /avatar with the technique id in route state;
                AvatarToolPage picks it up (it stays permanently mounted -
                see App.tsx's own comment on why - so this has to travel
                through location.state, not a prop). */}
            {open.item[lang].avatarSteps && (
              <button
                type="button"
                className="technique-modal-try"
                onClick={() => navigate('/avatar', { state: { techniqueId: open.item.id } })}
              >
                {t('techniques.tryButton')}
              </button>
            )}
          </div>
        </div>
      )}

      {open && open.kind === 'instrument' && (
        <div className="technique-modal-overlay" onClick={() => setOpen(null)}>
          <div className="technique-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="technique-modal-close" onClick={() => setOpen(null)}>
              {t('techniques.close')}
            </button>
            <h2>{open.item[lang].title}</h2>
            <p className="technique-modal-description">{open.item[lang].description}</p>

            {open.item[lang].useCases.length > 0 && (
              <>
                <h4>{t('techniques.useCases')}</h4>
                <ul>
                  {open.item[lang].useCases.map((useCase, i) => (
                    <li key={i}>{useCase}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
