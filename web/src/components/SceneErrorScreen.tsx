import { useLanguage } from '../i18n/LanguageContext';

/**
 * Plain HTML sibling of <Canvas> (same position:relative .scene-pane
 * wrapper as SceneLoader), shown instead of the loading spinner once a
 * required resource has failed to load - an opaque overlay so the broken
 * scene behind it never shows through.
 */
export function SceneErrorScreen() {
  const { t } = useLanguage();
  return (
    <div className="scene-error">
      <p className="scene-error__title">{t('scene.error.title')}</p>
      <p className="scene-error__body">{t('scene.error.body')}</p>
      <button type="button" className="scene-error__retry" onClick={() => window.location.reload()}>
        {t('scene.error.retry')}
      </button>
    </div>
  );
}
