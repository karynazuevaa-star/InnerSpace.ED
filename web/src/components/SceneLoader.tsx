import { useProgress } from '@react-three/drei';

/**
 * Loading overlay shown over a <Canvas> while its assets are still
 * fetching. Rendered as a PLAIN HTML sibling of the <Canvas> (inside the
 * same position:relative .scene-pane wrapper), not as a 3D object inside
 * the canvas - an earlier version used drei's <Html fullscreen> as the
 * Suspense fallback, but "fullscreen" centers itself on the screen
 * projection of wherever that object sits in the scene graph (the
 * avatar's feet, at local origin), not on the true canvas center. Once
 * OrbitControls re-aimed the camera at chest height, that anchor no
 * longer projected to screen center, so the overlay was offset and left
 * a strip of the raw (black) canvas showing at the bottom. useProgress
 * reads three.js's shared loading manager instead, so this has no
 * anchor/projection to get wrong.
 */
export function SceneLoader({ label }: { label: string }) {
  const active = useProgress((state) => state.active);
  if (!active) return null;
  return (
    <div className="scene-loader">
      <div className="scene-loader__spinner" />
      <p className="scene-loader__label">{label}</p>
    </div>
  );
}
