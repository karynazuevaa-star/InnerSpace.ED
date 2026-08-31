import { useLanguage } from '../i18n/LanguageContext';
import { useTour } from '../tour/TourContext';
import { LandingModelCarousel } from '../components/LandingModelCarousel';

export function LandingPage() {
  const { t } = useLanguage();
  const { start } = useTour();

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <span className="landing-eyebrow">{t('landing.eyebrow')}</span>
        <h1 className="landing-title">
          <span>InnerSpace</span>
          <span className="landing-title-dot">
            <LandingModelCarousel />
          </span>
          <span>ED</span>
        </h1>
        <p className="landing-lead">{t('landing.lead')}</p>
        <button type="button" className="landing-cta" onClick={start}>
          {t('landing.cta')}
        </button>
      </section>

      <section className="landing-section landing-note">
        <p>{t('landing.disclaimer')}</p>
        <p>{t('landing.disclaimerPrivacy')}</p>
        <p className="landing-credit">{t('landing.modelCredit')}</p>
      </section>
    </div>
  );
}
