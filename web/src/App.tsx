import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import { TopNav } from './components/TopNav';
import { LandingPage } from './pages/LandingPage';
import { AvatarToolPageLegacy } from './pages/AvatarToolPageLegacy';
import { AvatarConsentGate } from './components/AvatarConsentGate';
import { MaterialsPage } from './pages/MaterialsPage';
import { TestsPage } from './pages/TestsPage';
import { LanguageProvider } from './i18n/LanguageContext';
import { TourProvider } from './tour/TourContext';
import { TourOverlay } from './components/TourOverlay';

/**
 * AvatarToolPageLegacy's <Canvas> is never unmounted by navigating to another
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
  return (
    <div className="app-shell">
      <TopNav />
      <TourOverlay />
      <main className="app-main">
        <div style={{ display: isAvatarTool ? 'contents' : 'none' }}>
          <AvatarToolPageLegacy />
          {isAvatarTool && <AvatarConsentGate />}
        </div>
        {!isAvatarTool && (
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/tests" element={<TestsPage />} />
          </Routes>
        )}
      </main>
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
