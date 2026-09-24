import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import { TopNav } from './components/TopNav';
import { AvatarConsentGate } from './components/AvatarConsentGate';
import { LanguageProvider } from './i18n/LanguageContext';
import { useLanguage } from './i18n/LanguageContext';
import { TourProvider } from './tour/TourContext';
import { TourOverlay } from './components/TourOverlay';

// Route-level code-splitting: each page (and, notably, the legacy avatar
// tool's own body.glb preload buried inside AvatarSceneLegacy) now only
// downloads when its route is actually visited, instead of every page's JS
// - and every page's eagerly-preloaded assets - loading on every visit.
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AvatarToolPage = lazy(() => import('./pages/AvatarToolPage').then((m) => ({ default: m.AvatarToolPage })));
const AvatarToolPageLegacy = lazy(() =>
  import('./pages/AvatarToolPageLegacy').then((m) => ({ default: m.AvatarToolPageLegacy }))
);
const MaterialsPage = lazy(() => import('./pages/MaterialsPage').then((m) => ({ default: m.MaterialsPage })));
const TestsPage = lazy(() => import('./pages/TestsPage').then((m) => ({ default: m.TestsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const RoomsPage = lazy(() => import('./pages/RoomsPage').then((m) => ({ default: m.RoomsPage })));
const CafeRoomPage = lazy(() => import('./pages/CafeRoomPage').then((m) => ({ default: m.CafeRoomPage })));

// Copyright line, requested directly - shown only on the landing page (a
// fixed-height flex sibling of .app-main, not absolutely positioned over
// it). .app-main is flex:1 with min-height:0, so it just shrinks to leave
// room for this instead of the footer overlapping the canvas.
function AppFooter() {
  const { t } = useLanguage();
  return (
    <footer className="app-footer">
      <p>
        {t('footer.copyright')}{' '}
        <a href="/privacy-policy.pdf" target="_blank" rel="noopener noreferrer">
          {t('footer.privacyPolicy')}
        </a>
        {' · '}
        <a href="/terms-of-use.pdf" target="_blank" rel="noopener noreferrer">
          {t('footer.termsOfUse')}
        </a>
      </p>
    </footer>
  );
}

/**
 * AvatarToolPage's <Canvas> is never unmounted by navigating to another
 * page - only hidden with CSS. Letting React Router unmount/remount it tore
 * down and recreated the whole WebGL context on every visit; the cached
 * body/hair/outfit glTFs (kept alive by useGLTF's cache) got reused under a
 * context that no longer had their textures uploaded, which read as
 * corrupted, torn-looking patches on the face rather than anything about
 * the avatar's pose. Keeping the canvas permanently mounted sidesteps that
 * whole class of bug, and as a bonus the body sliders/hair choice now
 * survive a trip to another page instead of resetting. The avatar tool
 * lives at /avatar rather than / - / is a plain landing page introducing
 * InnerSpace.ED, so the "keep mounted, hide with CSS" trick now targets
 * that route instead of the root.
 */
function AppShell() {
  const location = useLocation();
  const isAvatarTool = location.pathname === '/avatar';
  const isLanding = location.pathname === '/';

  // Mounting AvatarScene (and therefore fetching body/hair/outfit glTFs)
  // used to happen unconditionally on every single page, since this div
  // was always in the tree just hidden with CSS - see the "keep mounted
  // forever" comment below for why it can't simply be routed. Gating the
  // first mount on an actual /avatar visit means every other page (and
  // first-time visitors who never open the avatar tool at all) no longer
  // downloads its ~8MB body model for nothing. Once true this never goes
  // back to false, so the "stay mounted forever afterward" behavior below
  // is unaffected.
  const [hasVisitedAvatar, setHasVisitedAvatar] = useState(isAvatarTool);
  useEffect(() => {
    if (isAvatarTool) setHasVisitedAvatar(true);
  }, [isAvatarTool]);

  return (
    <div className="app-shell">
      <TopNav />
      <TourOverlay />
      <main className="app-main">
        {hasVisitedAvatar && (
          <div style={{ display: isAvatarTool ? 'contents' : 'none' }}>
            <Suspense fallback={null}>
              <AvatarToolPage />
            </Suspense>
            {isAvatarTool && <AvatarConsentGate />}
          </div>
        )}
        {!isAvatarTool && (
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route
                path="/rooms/cafe"
                element={
                  <>
                    <CafeRoomPage />
                    <AvatarConsentGate />
                  </>
                }
              />
              <Route
                path="/avatar-legacy"
                element={
                  <>
                    <AvatarToolPageLegacy />
                    <AvatarConsentGate />
                  </>
                }
              />
            </Routes>
          </Suspense>
        )}
      </main>
      {isLanding && <AppFooter />}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TourProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </TourProvider>
    </LanguageProvider>
  );
}
