import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const STORAGE_KEY = 'innerspace_ed_avatar_consent';

/**
 * Mandatory gate shown on top of the avatar tool until the user confirms
 * they're a licensed ED specialist. No close button, no click-outside or
 * Escape dismissal - the only way past it is the confirm button. Renders
 * as a blurred overlay over the avatar scene (which stays mounted and
 * visible underneath, just obscured) rather than hiding it outright, per
 * how it was asked for.
 *
 * Mounts fresh every time the /avatar route becomes active (see App.tsx),
 * so it re-asks on every visit unless "remember" was checked, in which
 * case the confirmation persists in localStorage and this renders nothing.
 */
export function AvatarConsentGate() {
  const { t } = useLanguage();
  const [remember, setRemember] = useState(false);
  const [confirmed, setConfirmed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  if (confirmed) return null;

  const handleConfirm = () => {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setConfirmed(true);
  };

  return (
    <div className="avatar-consent-overlay">
      <div className="avatar-consent-modal">
        <h2>{t('avatarConsent.title')}</h2>
        <p>{t('avatarConsent.text')}</p>
        <label className="avatar-consent-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          {t('avatarConsent.remember')}
        </label>
        <button type="button" className="avatar-consent-confirm" onClick={handleConfirm}>
          {t('avatarConsent.confirm')}
        </button>
      </div>
    </div>
  );
}
