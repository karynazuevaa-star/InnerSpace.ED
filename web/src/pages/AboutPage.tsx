import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { AboutGarden } from '../components/AboutGarden';
import type { Folder } from './MaterialsPage';

const CONTACT_EMAIL = 'info.innerspace.ed@gmail.com';

// "What the platform is built on" as Euler circles: four overlapping
// fields with InnerSpace.ED where they all meet. Each circle sits in one
// quadrant and keeps its label in the part no other circle covers.
const BASIS_ITEMS = [
  { key: 'cbt', cx: 150, cy: 110, lx: 92, ly: 72, color: '#8b6cff' },
  { key: 'neuro', cx: 250, cy: 110, lx: 308, ly: 72, color: '#5b9cff' },
  { key: 'bodyImage', cx: 150, cy: 190, lx: 92, ly: 232, color: '#5fd3c4' },
  { key: 'cyber', cx: 250, cy: 190, lx: 308, ly: 232, color: '#f0a476' },
] as const;

function BasisVenn() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const item = BASIS_ITEMS[active];

  return (
    <div className="about-venn">
      <svg viewBox="0 0 400 300" className="about-venn-svg" role="group" aria-label={t('about.basisHeading')}>
        {BASIS_ITEMS.map((c, i) => (
          <circle
            key={c.key}
            cx={c.cx}
            cy={c.cy}
            r={100}
            fill={c.color}
            stroke={c.color}
            className={`about-venn-circle${i === active ? ' about-venn-circle-active' : ''}`}
          />
        ))}
        {BASIS_ITEMS.map((c, i) => (
          <g
            key={c.key}
            className="about-venn-hit"
            role="button"
            tabIndex={0}
            aria-pressed={i === active}
            aria-label={t(`about.basis.${c.key}`)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            {/* Invisible hit area over the circle's own, non-shared corner. */}
            <circle cx={c.lx} cy={c.ly} r={52} fill="transparent" />
            <text x={c.lx} y={c.ly} className={`about-venn-label${i === active ? ' about-venn-label-active' : ''}`}>
              {t(`about.basis.${c.key}Short`)
                .split('\n')
                .map((line, j, lines) => (
                  <tspan key={j} x={c.lx} dy={j === 0 ? `${-(lines.length - 1) * 0.6 + 0.35}em` : '1.2em'}>
                    {line}
                  </tspan>
                ))}
            </text>
          </g>
        ))}
        <text x={200} y={150} className="about-venn-center" dy="0.35em">
          InnerSpace.ED
        </text>
      </svg>
      <div className="about-venn-detail" aria-live="polite">
        <strong style={{ color: item.color }}>{t(`about.basis.${item.key}`)}</strong>
        <span>{t(`about.basis.${item.key}Text`)}</span>
      </div>
    </div>
  );
}

const FOUNDER_DEGREES = ['bsc', 'mscCyber', 'mscAi', 'phd', 'clinical'] as const;
// Degrees still being completed get a small star with an "in progress" hint.
const IN_PROGRESS = new Set<string>(['mscAi', 'phd']);
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
              <li key={key}>
                {t(`about.founder.${key}`)}
                {IN_PROGRESS.has(key) && (
                  <span className="about-in-progress" tabIndex={0} aria-label={t('about.founder.inProgress')}>
                    *<span className="about-in-progress-hint" aria-hidden="true">{t('about.founder.inProgress')}</span>
                  </span>
                )}
              </li>
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
      <BasisVenn />
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
