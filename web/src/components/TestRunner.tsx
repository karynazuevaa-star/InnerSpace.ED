import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { RealTest, ScaleOption, TestQuestion, TestResult } from '../content/tests';

interface FlatQuestion {
  question: TestQuestion;
  options?: ScaleOption[];
  noteRu?: string;
  noteEn?: string;
}

function flattenQuestions(test: RealTest): FlatQuestion[] {
  const flat: FlatQuestion[] = [];
  for (const section of test.sections) {
    for (const q of section.questions) {
      flat.push({ question: q, options: q.options ?? section.options, noteRu: section.noteRu, noteEn: section.noteEn });
    }
  }
  return flat;
}

type Phase = 'intro' | 'instructions' | 'question' | 'result';

export function TestRunner({ test, onClose }: { test: RealTest; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<TestResult | null>(null);

  const flat = useMemo(() => flattenQuestions(test), [test]);
  const total = flat.length;
  const current = flat[index];
  const isLast = index === total - 1;
  const isAnswered = current?.question.kind === 'number' || answers[current?.question.id] !== undefined;

  const setAnswer = (id: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const setNumberAnswer = (id: string, raw: string) => {
    const value = raw === '' ? 0 : Math.max(0, Number(raw) || 0);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleStart = () => {
    setPhase('instructions');
  };

  const handleBeginQuestions = () => {
    setIndex(0);
    setPhase('question');
  };

  const handleBack = () => {
    if (index === 0) {
      setPhase('instructions');
    } else {
      setIndex((i) => i - 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setResult(test.computeResult(answers));
      setPhase('result');
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    setIndex(0);
    setPhase('intro');
  };

  const progress = phase === 'result' ? 100 : phase === 'question' ? ((index + 1) / total) * 100 : 0;

  return (
    <div className="technique-modal-overlay" onClick={onClose}>
      <div className="technique-modal test-runner-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="technique-modal-close" onClick={onClose}>
          {t('techniques.close')}
        </button>

        <div className="test-progress-bar">
          <div className="test-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {phase === 'intro' && (
          <>
            <h2>{lang === 'ru' ? test.titleRu : test.titleEn}</h2>
            <p className="technique-modal-description">{lang === 'ru' ? test.descriptionRu : test.descriptionEn}</p>
            <div className="test-submit-row">
              <button type="button" className="test-submit-button" onClick={handleStart}>
                {t('tests.start')}
              </button>
            </div>
          </>
        )}

        {phase === 'instructions' && (
          <>
            <h2>{lang === 'ru' ? test.titleRu : test.titleEn}</h2>
            <p className="technique-modal-description">{lang === 'ru' ? test.instructionsRu : test.instructionsEn}</p>
            <div className="test-nav-row">
              <button type="button" className="test-nav-back" onClick={() => setPhase('intro')}>
                {t('tests.back')}
              </button>
              <button type="button" className="test-submit-button" onClick={handleBeginQuestions}>
                {t('tests.next')}
              </button>
            </div>
          </>
        )}

        {phase === 'question' && current && (
          <div className="test-question-page">
            <p className="test-progress-label">{t('tests.questionOf', { n: index + 1, m: total })}</p>
            {(current.noteRu || current.noteEn) && (
              <p className="test-section-note">{lang === 'ru' ? current.noteRu : current.noteEn}</p>
            )}
            <p className="test-question-text">{lang === 'ru' ? current.question.ru : current.question.en}</p>

            {current.question.kind === 'number' ? (
              <div className="test-number-row">
                <input
                  type="number"
                  min={0}
                  className="test-number-input"
                  value={answers[current.question.id] ?? ''}
                  onChange={(e) => setNumberAnswer(current.question.id, e.target.value)}
                  placeholder="0"
                  autoFocus
                />
                <span className="test-number-unit">{lang === 'ru' ? current.question.unitRu : current.question.unitEn}</span>
              </div>
            ) : (
              <div className="test-scale-row">
                {current.options?.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`test-scale-option${answers[current.question.id] === opt.value ? ' test-scale-option-active' : ''}`}
                    onClick={() => setAnswer(current.question.id, opt.value)}
                  >
                    <span className="test-scale-option-value">{opt.value}</span>
                    {(lang === 'ru' ? opt.ru : opt.en) && (
                      <span className="test-scale-option-label">{lang === 'ru' ? opt.ru : opt.en}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="test-nav-row">
              <button type="button" className="test-nav-back" onClick={handleBack}>
                {t('tests.back')}
              </button>
              <button type="button" className="test-submit-button" onClick={handleNext} disabled={!isAnswered}>
                {isLast ? t('tests.calculate') : t('tests.next')}
              </button>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="test-result">
            <h2>{lang === 'ru' ? test.titleRu : test.titleEn}</h2>
            <h4>{t('tests.results')}</h4>
            <div className="test-result-subscales">
              {result.subscales.map((s, i) => (
                <div className="test-result-subscale" key={i}>
                  <span className="test-result-subscale-label">{lang === 'ru' ? s.labelRu : s.labelEn}</span>
                  <span className="test-result-subscale-score">
                    {s.score} <span className="test-result-subscale-range">/ {s.range}</span>
                  </span>
                  {(s.typicalRu || s.typicalEn) && (
                    <span className="test-result-subscale-typical">{lang === 'ru' ? s.typicalRu : s.typicalEn}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="test-result-overall">{lang === 'ru' ? result.overallRu : result.overallEn}</p>
            <button type="button" className="test-retake-button" onClick={handleRetake}>
              {t('tests.retake')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
