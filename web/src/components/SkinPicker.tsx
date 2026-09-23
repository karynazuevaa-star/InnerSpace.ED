import { useLanguage } from '../i18n/LanguageContext';
import type { Skin } from '../avatar/skin';

const SKINS: { value: Skin; labelKey: string }[] = [
  { value: 'caucasian', labelKey: 'skin.caucasian' },
  { value: 'asian', labelKey: 'skin.asian' },
  { value: 'african', labelKey: 'skin.african' },
];

export function SkinPicker({ skin, onSkinChange }: { skin: Skin; onSkinChange: (skin: Skin) => void }) {
  const { t } = useLanguage();
  return (
    <div className="control-group">
      <h3>{t('skin.heading')}</h3>
      <div className="pill-row">
        {SKINS.map((s) => (
          <button
            key={s.value}
            className={`pill${s.value === skin ? ' pill-active' : ''}`}
            onClick={() => onSkinChange(s.value)}
            type="button"
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
