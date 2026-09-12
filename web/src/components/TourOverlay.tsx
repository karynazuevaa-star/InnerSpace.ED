import { useEffect, useState } from 'react';
import { useTour, TOUR_NAV_TARGETS, type TourStep } from '../tour/TourContext';
import { useLanguage } from '../i18n/LanguageContext';

// Rooms inserted at index 1 (requested directly - it was missing from the
// tour entirely, which used to skip straight from Avatar to Materials),
// matching TOUR_NAV_TARGETS' own order in TourContext.tsx.
const NAV_CAPTION_KEYS = [
  'tour.avatarCaption',
  'tour.roomsCaption',
  'tour.materialsCaption',
  'tour.testsCaption',
] as const;
const LAST_STEP: TourStep = 4;
// The closing disclaimer has no nav item of its own, so it stays anchored
// under "Tests" - the same spot as the step right before it.
const TARGET_INDEX_BY_STEP = [0, 1, 2, 3, 3] as const;

export function TourOverlay() {
  const { step, next, finish } = useTour();
  const { t } = useLanguage();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isFinalStep = step === LAST_STEP;

  useEffect(() => {
    if (step === null) return;
    const update = () => {
      const el = document.querySelector(`[data-tour="${TOUR_NAV_TARGETS[TARGET_INDEX_BY_STEP[step]]}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, finish]);

  if (step === null || !rect) return null;

  const centerX = rect.left + rect.width / 2;
  const caption = isFinalStep ? t('landing.disclaimer') : t(NAV_CAPTION_KEYS[TARGET_INDEX_BY_STEP[step]]);

  return (
    <>
      <div className="tour-glow" style={{ left: centerX, top: rect.top + rect.height / 2 }} />
      <div className="tour-tooltip" style={{ left: centerX, top: rect.bottom + 16 }}>
        <p>{caption}</p>
        <button type="button" className="tour-tooltip-btn" onClick={isFinalStep ? finish : next}>
          {isFinalStep ? t('tour.finish') : `${t('tour.next')} →`}
        </button>
      </div>
    </>
  );
}
