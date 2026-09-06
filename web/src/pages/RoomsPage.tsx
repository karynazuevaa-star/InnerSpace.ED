import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface RoomEntry {
  id: string;
  titleKey: string;
  descriptionKey: string;
  to: string | null;
}

const ROOMS: RoomEntry[] = [
  { id: 'cafe', titleKey: 'rooms.cafe.title', descriptionKey: 'rooms.cafe.description', to: '/rooms/cafe' },
  { id: 'pool', titleKey: 'rooms.pool.title', descriptionKey: 'rooms.pool.description', to: null },
  { id: 'gym', titleKey: 'rooms.gym.title', descriptionKey: 'rooms.gym.description', to: null },
];

export function RoomsPage() {
  const { t } = useLanguage();
  return (
    <div className="simple-page">
      <h1>{t('rooms.heading')}</h1>
      <p className="techniques-lang-note">{t('rooms.intro')}</p>

      <div className="techniques-grid">
        {ROOMS.map((room) =>
          room.to ? (
            <Link key={room.id} to={room.to} className="technique-card instrument-card">
              <h3>{t(room.titleKey)}</h3>
              <p>{t(room.descriptionKey)}</p>
            </Link>
          ) : (
            <div key={room.id} className="technique-card instrument-card room-card-disabled">
              <span className="room-card-badge">{t('rooms.comingSoon')}</span>
              <h3>{t(room.titleKey)}</h3>
              <p>{t(room.descriptionKey)}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
