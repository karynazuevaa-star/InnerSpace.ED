import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const CLICKS_NEEDED = 5;
// 3x3 grid, in percent of viewport - matches the standard WebGazer
// calibration pattern from their own demo.
const POINTS = [
  [10, 10], [50, 10], [90, 10],
  [10, 50], [50, 50], [90, 50],
  [10, 90], [50, 90], [90, 90],
];

/**
 * WebGazer trains its gaze-prediction model from ordinary click events
 * (it listens on `document` for clicks once tracking begins, and treats
 * "user clicked here" as "user was looking here"). This overlay is just a
 * grid of targets the user clicks a few times each while looking at them -
 * there's no separate "record calibration point" API to call.
 */
export function Calibration({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const [clicks, setClicks] = useState<number[]>(() => POINTS.map(() => 0));

  const handleClick = (index: number) => {
    setClicks((prev) => {
      const next = [...prev];
      next[index] = Math.min(CLICKS_NEEDED, next[index] + 1);
      if (next.every((c) => c >= CLICKS_NEEDED)) {
        setTimeout(onDone, 300);
      }
      return next;
    });
  };

  const done = clicks.every((c) => c >= CLICKS_NEEDED);

  return (
    <div className="calibration-overlay">
      <p className="calibration-hint">{t('calibration.hint', { n: CLICKS_NEEDED, m: POINTS.length - 1 })}</p>
      {POINTS.map(([left, top], i) => (
        <button
          key={i}
          className="calibration-dot"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            opacity: 0.3 + 0.7 * (clicks[i] / CLICKS_NEEDED),
            background: clicks[i] >= CLICKS_NEEDED ? '#3ddc84' : '#ff5c5c',
          }}
          onClick={() => handleClick(i)}
          aria-label={t('calibration.pointLabel', { i: i + 1 })}
        />
      ))}
      {done && <p className="calibration-hint">{t('calibration.done')}</p>}
    </div>
  );
}
