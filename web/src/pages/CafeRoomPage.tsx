import { Link } from 'react-router-dom';
import { CafeScene } from '../components/rooms/CafeScene';
import { useLanguage } from '../i18n/LanguageContext';

export function CafeRoomPage() {
  const { t } = useLanguage();
  return (
    <div className="home-page">
      <div className="scene-pane">
        <CafeScene />
        <div className="room-overlay">
          <Link to="/rooms" className="room-overlay__back">
            {t('rooms.back')}
          </Link>
          <p className="room-overlay__hint">{t('rooms.cafeHint')}</p>
        </div>
      </div>
    </div>
  );
}
