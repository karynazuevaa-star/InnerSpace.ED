import { NavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/translations';

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
];

export function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang-switch">
      {LANGS.map((l) => (
        <button
          key={l.value}
          className={`lang-pill${l.value === lang ? ' lang-pill-active' : ''}`}
          onClick={() => setLang(l.value)}
          type="button"
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function TopNav() {
  const { t } = useLanguage();
  return (
    <header className="top-nav">
      <div className="top-nav-brand">
        <span className="top-nav-title">InnerSpace.ED</span>
      </div>
      <nav className="top-nav-links">
        <NavLink to="/" end className={({ isActive }) => `top-nav-link${isActive ? ' top-nav-link-active' : ''}`}>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/avatar" data-tour="avatar" className={({ isActive }) => `top-nav-link${isActive ? ' top-nav-link-active' : ''}`}>
          {t('nav.avatar')}
        </NavLink>
        <NavLink to="/materials" data-tour="materials" className={({ isActive }) => `top-nav-link${isActive ? ' top-nav-link-active' : ''}`}>
          {t('nav.materials')}
        </NavLink>
        <NavLink to="/tests" data-tour="tests" className={({ isActive }) => `top-nav-link${isActive ? ' top-nav-link-active' : ''}`}>
          {t('nav.tests')}
        </NavLink>
      </nav>
      <LanguageSwitch />
    </header>
  );
}
