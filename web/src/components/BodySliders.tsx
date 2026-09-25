import type { BodyMorphState } from '../avatar/bodyMorphs';
import { useLanguage } from '../i18n/LanguageContext';
import { InfoTooltip } from './InfoTooltip';

const SLIDERS: { key: keyof BodyMorphState; labelKey: string }[] = [
  // Overall weight first, then top to bottom down the body.
  { key: 'weight', labelKey: 'body.weight' },
  { key: 'face', labelKey: 'body.face' },
  { key: 'arms', labelKey: 'body.arms' },
  { key: 'breast', labelKey: 'body.breast' },
  { key: 'waist', labelKey: 'body.waist' },
  { key: 'belly', labelKey: 'body.belly' },
  { key: 'butt', labelKey: 'body.butt' },
  { key: 'legs', labelKey: 'body.legs' },
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
      <div className="control-group-heading-row">
        <h3>{t('body.heading')}</h3>
        <InfoTooltip text={t('body.infoTooltip')} />
      </div>
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
