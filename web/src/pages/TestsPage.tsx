import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { REAL_TESTS, type RealTest } from '../content/tests';
import { TestRunner } from '../components/TestRunner';

export function TestsPage() {
  const { t, lang } = useLanguage();
  const [active, setActive] = useState<RealTest | null>(null);

  return (
    <div className="simple-page">
      <h1>{t('tests.heading')}</h1>
      <p className="techniques-lang-note">{t('tests.intro')}</p>

      <div className="techniques-grid">
        {REAL_TESTS.map((test) => (
          <button
            key={test.id}
            type="button"
            className="technique-card instrument-card"
            onClick={() => setActive(test)}
          >
            <h3>{lang === 'ru' ? test.titleRu : test.titleEn}</h3>
            <p>{lang === 'ru' ? test.summaryRu : test.summaryEn}</p>
          </button>
        ))}
      </div>

      {active && <TestRunner test={active} onClose={() => setActive(null)} />}
    </div>
  );
}
