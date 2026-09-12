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
const LAST_STEP: TourStep = 3;

export function TourOverlay() {
  const { step, next, finish } = useTour();
  const { t } = useLanguage();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isFinalStep = step === LAST_STEP;

  useEffect(() => {
    if (step === null) return;
    const update = () => {
      const el = document.querySelector(`[data-tour="${TOUR_NAV_TARGETS[step]}"]`);
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
  const caption = t(NAV_CAPTION_KEYS[step]);

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
