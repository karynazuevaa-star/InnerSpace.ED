import type { BodyMorphState } from '../avatar/bodyMorphs';
import { useLanguage } from '../i18n/LanguageContext';

const SLIDERS: { key: keyof BodyMorphState; labelKey: string }[] = [
  { key: 'weight', labelKey: 'body.weight' },
  { key: 'belly', labelKey: 'body.belly' },
  { key: 'waist', labelKey: 'body.waist' },
  { key: 'breast', labelKey: 'body.breast' },
  { key: 'butt', labelKey: 'body.butt' },
  { key: 'arms', labelKey: 'body.arms' },
  { key: 'legs', labelKey: 'body.legs' },
  { key: 'face', labelKey: 'body.face' },
];

export function BodySliders({
  value,
  onChange,
}: {
  value: BodyMorphState;
  onChange: (next: BodyMorphState) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="control-group">
      <h3>{t('body.heading')}</h3>
      {SLIDERS.map(({ key, labelKey }) => (
        <label key={key} className="slider-row">
          <span>
            {t(labelKey)}: {value[key].toFixed(2)}
          </span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: parseFloat(e.target.value) })}
          />
        </label>
      ))}
    </div>
  );
}
