import type { GazeSample } from './gazeTypes';

// WebGazer lives outside the R3F <Canvas> (it's a DOM/webcam concern), but
// the heatmap that turns gaze into "which point on the 3D body was this"
// has to run inside the Canvas to access the camera/scene via useThree().
// A tiny pub/sub is the simplest bridge between the two without routing
// every gaze sample through React state (which would re-render on every
// frame of gaze data).
type Listener = (sample: GazeSample) => void;

const listeners = new Set<Listener>();

export function emitGaze(sample: GazeSample) {
  for (const l of listeners) l(sample);
}

export function subscribeGaze(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Lets the raycast+heatmap pipeline be exercised without a real webcam/face
// in front of it (used to verify this during development). Stripped from
// production builds since it's gated on import.meta.env.DEV.
if (import.meta.env.DEV) {
  (window as unknown as { __debugEmitGaze: Listener }).__debugEmitGaze = emitGaze;
}
