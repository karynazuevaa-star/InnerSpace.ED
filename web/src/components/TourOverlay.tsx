import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTour, TOUR_NAV_TARGETS, type TourStep } from '../tour/TourContext';
import { useLanguage } from '../i18n/LanguageContext';

// Rooms inserted at index 1 (requested directly - it was missing from the
// tour entirely, which used to skip straight from Avatar to Materials),
// matching TOUR_NAV_TARGETS' own order in TourContext.tsx.
const NAV_CAPTION_KEYS = [
  'tour.avatarCaption',
  'tour.roomsCaption',
  'tour.materialsCaption',
] as const;
const LAST_STEP: TourStep = 2;

export function TourOverlay() {
  const { step, next, finish } = useTour();
  const { t } = useLanguage();
  const location = useLocation();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isFinalStep = step === LAST_STEP;
  const tourStartPath = useRef<string | null>(null);

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

  // Dismiss instead of lingering if a visitor ignores the tooltip's own
  // Next button and browses the tabs directly instead - reported directly,
  // since without this the tooltip just kept pointing at whatever nav item
  // it was on, now stranded on a page the tour never expected. The tour
  // itself never navigates - start()/next() only move the tooltip, LandingPage's
  // "Explore the site" button stays on "/" - so the only page it should
  // ever consider "on track" is the one it began on; any other pathname
  // showing up while a step is active is the visitor navigating on their
  // own, not the tour doing it.
  useEffect(() => {
    if (step === null) {
      tourStartPath.current = null;
      return;
    }
    if (tourStartPath.current === null) {
      tourStartPath.current = location.pathname;
      return;
    }
    if (location.pathname !== tourStartPath.current) {
      finish();
    }
  }, [step, location.pathname, finish]);

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
