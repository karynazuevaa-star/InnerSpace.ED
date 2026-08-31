import { HAIR_COLOR_PRESETS } from '../avatar/hairTint';
import { useLanguage } from '../i18n/LanguageContext';
import type { HairStyle } from './Hair';

const STYLES: { value: HairStyle | ''; labelKey: string }[] = [
  { value: '', labelKey: 'hair.none' },
  { value: 'long', labelKey: 'hair.long' },
  { value: 'medium', labelKey: 'hair.medium' },
  { value: 'short', labelKey: 'hair.short' },
];

export function HairPicker({
  style,
  color,
  onStyleChange,
  onColorChange,
}: {
  style: HairStyle | '';
  color: string;
  onStyleChange: (style: HairStyle | '') => void;
  onColorChange: (color: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="control-group">
      <h3>{t('hair.heading')}</h3>
      <div className="pill-row">
        {STYLES.map((s) => (
          <button
            key={s.value}
            className={`pill${s.value === style ? ' pill-active' : ''}`}
            onClick={() => onStyleChange(s.value)}
            type="button"
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>
      <div className="swatches">
        {HAIR_COLOR_PRESETS.map((hex) => (
          <button
            key={hex}
            className={`swatch${hex.toLowerCase() === color.toLowerCase() ? ' swatch-active' : ''}`}
            style={{ background: hex }}
            onClick={() => onColorChange(hex)}
            aria-label={hex}
            type="button"
          />
        ))}
        <label className="swatch swatch-custom" style={{ background: color }}>
          <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
