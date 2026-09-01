import { Html } from '@react-three/drei';

/**
 * Suspense fallback for a scene's model-loading boundary. Rendered via
 * drei's <Html fullscreen>, so it's a real DOM overlay covering the
 * <Canvas> - not a 3D object - while every mesh in that Suspense boundary
 * (body, hair, eyes, outfits, etc. for the avatar; shell + regions for the
 * brain) is still loading. Once everything resolves, Suspense swaps this
 * out for the real scene in one frame instead of pieces popping in one at
 * a time as each asset happens to finish.
 */
export function SceneLoader({ label }: { label: string }) {
  return (
    <Html fullscreen>
      <div className="scene-loader">
        <div className="scene-loader__spinner" />
        <p className="scene-loader__label">{label}</p>
      </div>
    </Html>
  );
}
