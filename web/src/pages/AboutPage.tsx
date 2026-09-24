import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { AboutGarden } from '../components/AboutGarden';
import type { Folder } from './MaterialsPage';

const CONTACT_EMAIL = 'info.innerspace.ed@gmail.com';

const BASIS_ITEMS = ['cbt', 'neuro', 'bodyImage', 'cyber'] as const;

const FOUNDER_DEGREES = ['bsc', 'mscCyber', 'mscAi', 'phd', 'clinical'] as const;
const FOUNDER_TAGS = ['tum', 'experience', 'lecturer', 'lab'] as const;

// Each way of using the platform links to where it lives. Psychoeducation
// and screening are folders on Materials, opened via route state; eye
// tracking is part of the avatar tool.
const USAGE_ITEMS: { key: string; to: string; folder?: Folder }[] = [
  { key: 'psycho', to: '/materials', folder: 'psychoeducation' },
  { key: 'avatar', to: '/avatar' },
  { key: 'rooms', to: '/rooms' },
  { key: 'screening', to: '/materials', folder: 'screening' },
  { key: 'eyetracking', to: '/avatar' },
];

// "About us" page. Visual design borrowed from the marketing site's 404
// page: the dark, mouse-reactive flower garden with the sitting character
// fills the bottom of the page. The text sits above it in a 3D carousel -
// one card is read at a time, the others stay visible behind it.
export function AboutPage() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);

  const slides = [
    <>
      <h2>{t('about.whoHeading')}</h2>
      <p>{t('about.whoText1')}</p>
      <p>{t('about.whoText2')}</p>
      <div className="about-founder">
        <img className="about-founder-photo" src="/about/founder.webp" alt={t('about.founderPhotoAlt')} />
        <div className="about-founder-body">
          <span className="landing-eyebrow">Our founder</span>
          <ul className="about-founder-degrees">
            {FOUNDER_DEGREES.map((key) => (
              <li key={key}>{t(`about.founder.${key}`)}</li>
            ))}
          </ul>
          <ul className="about-founder-tags">
            {FOUNDER_TAGS.map((key) => (
              <li key={key}>#{t(`about.founder.tag.${key}`)}</li>
            ))}
          </ul>
        </div>
      </div>
    </>,
    <>
      <h2>{t('about.whatHeading')}</h2>
      <p>{t('about.whatText1')}</p>
      <p>{t('about.whatText2')}</p>
    </>,
    <>
      <h2>{t('about.howHeading')}</h2>
      <p>{t('about.howText')}</p>
      <ul className="about-usage">
        {USAGE_ITEMS.map(({ key, to, folder }) => (
          <li key={key}>
            <Link to={to} state={folder ? { folder } : undefined} className="about-usage-link">
              {t(`about.use.${key}`)}
              <span aria-hidden="true">→</span>
            </Link>
            <span>{t(`about.use.${key}For`)}</span>
          </li>
        ))}
      </ul>
    </>,
    <>
      <h2>{t('about.basisHeading')}</h2>
      <ul className="about-usage">
        {BASIS_ITEMS.map((key) => (
          <li key={key}>
            <strong>{t(`about.basis.${key}`)}</strong>
            <span>{t(`about.basis.${key}Text`)}</span>
          </li>
        ))}
      </ul>
    </>,
    <>
      <h2>{t('about.noteHeading')}</h2>
      <p>{t('about.noteSpecialist')}</p>
      <p>{t('about.noteData')}</p>
    </>,
  ];
  const n = slides.length;
  const go = (delta: number) => setActive((i) => (i + delta + n) % n);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };
  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="about-page">
      <div className="about-scene">
        <AboutGarden />

        <div className="about-content">
          <h1 className="about-title">{t('about.title')}</h1>

          <div
            className="about-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label={t('about.title')}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button type="button" className="about-arrow about-arrow-prev" onClick={() => go(-1)} aria-label={t('about.prev')}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="about-stage">
              {slides.map((content, i) => {
                // Signed distance from the active card, wrapped so the
                // cards form a ring: -1 is behind on the left, +1 on the right.
                let offset = i - active;
                if (offset > n / 2) offset -= n;
                if (offset < -n / 2) offset += n;
                const isActive = offset === 0;
                return (
                  <article
                    key={i}
                    className={`about-card${isActive ? ' about-card-active' : ''}`}
                    style={{ '--offset': offset, '--abs': Math.abs(offset) } as React.CSSProperties}
                    aria-hidden={!isActive}
                    inert={!isActive}
                    onClick={isActive ? undefined : () => setActive(i)}
                  >
                    {content}
                  </article>
                );
              })}
            </div>

            <button type="button" className="about-arrow about-arrow-next" onClick={() => go(1)} aria-label={t('about.next')}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="about-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`about-dot${i === active ? ' about-dot-active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`${i + 1} / ${n}`}
              />
            ))}
          </div>

          <section className="about-contact">
            <p>{t('about.contactText')}</p>
            <a className="landing-cta" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
