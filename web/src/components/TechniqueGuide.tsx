import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Technique } from '../content/techniques';

// The avatar page's own step-by-step guide for whichever technique a
// specialist opened from Materials via its "Попробовать"/"Try it" button
// (see MaterialsPage.tsx and AvatarToolPage.tsx, which owns this
// component's mount/unmount). Same one-step-at-a-time interaction as
// CafeScene.tsx's exposure-session guide panel (only the current step
// shows, a button advances to the next one, requested directly to feel
// "like the cafe hints"). First tried as a plain .control-group card
// pinned above BodySliders in the sidebar, but that pushed the body
// parameters further down every time it was open - reported directly as
// awkward, since checking a hint and adjusting a slider happen right
// after each other. Floats over the avatar's own canvas instead (rendered
// inside .scene-pane by AvatarToolPage.tsx, top-right - see its own
// comment), matching cafe's floating-panel treatment rather than the
// sidebar-card one.
export function TechniqueGuide({ technique, onClose }: { technique: Technique; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const [stepIndex, setStepIndex] = useState(0);
  const steps = technique[lang].avatarSteps ?? [];
  const total = steps.length;

  // A specialist can open a different technique from Materials without
  // ever leaving the avatar page open in another tab - reset progress
  // whenever the technique itself changes, not just on first mount.
  useEffect(() => {
    setStepIndex(0);
  }, [technique.id]);

  return (
    <div className="technique-guide">
      <div className="technique-guide__header">
        <h3>{t('techniques.guide.heading')}</h3>
        <button
          type="button"
          className="technique-guide__close"
          aria-label={t('techniques.guide.close')}
          title={t('techniques.guide.close')}
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      <p className="technique-guide__title">{technique[lang].title}</p>
      {stepIndex < total ? (
        <div className="technique-guide__step">
          <span className="technique-guide__counter">
            {stepIndex + 1}/{total}
          </span>
          <p className="technique-guide__step-text">{steps[stepIndex]}</p>
          <button type="button" className="technique-guide__next" onClick={() => setStepIndex((i) => i + 1)}>
            {t('techniques.guide.next')}
          </button>
        </div>
      ) : (
        <p className="technique-guide__done">{t('techniques.guide.done')}</p>
      )}
    </div>
  );
}
