import type { GazeSample } from './gazeTypes';

// WebGazer's own type declarations are incomplete/absent for this version,
// and its API is accessed as a singleton instance rather than idiomatic
// ESM exports - this thin wrapper is the only place that touches it
// directly so the rest of the app can stay untyped-library-free.
type WebGazerInstance = {
  setRegression: (name: string) => WebGazerInstance;
  setGazeListener: (fn: (data: { x: number; y: number } | null, elapsedTime: number) => void) => WebGazerInstance;
  begin: () => Promise<void>;
  pause: () => WebGazerInstance;
  resume: () => WebGazerInstance;
  end: () => void;
  stopVideo: () => WebGazerInstance;
  showVideo: (show: boolean) => WebGazerInstance;
  showFaceOverlay: (show: boolean) => WebGazerInstance;
  showFaceFeedbackBox: (show: boolean) => WebGazerInstance;
  showPredictionPoints: (show: boolean) => WebGazerInstance;
  saveDataAcrossSessions: (value: boolean) => void;
  clearData: () => Promise<void>;
};

let webgazerPromise: Promise<WebGazerInstance> | null = null;

async function loadWebgazer(): Promise<WebGazerInstance> {
  if (!webgazerPromise) {
    webgazerPromise = import('webgazer').then((mod) => (mod.default ?? mod) as unknown as WebGazerInstance);
  }
  return webgazerPromise;
}

export interface GazeClientHandle {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Starts WebGazer (requests webcam access) and streams gaze estimates to
 * `onSample`. Everything runs client-side in the browser - no frame or
 * video data ever leaves the machine, which matters given the context
 * (clients reviewing their own body image).
 *
 * Two WebGazer defaults needed overriding for that same reason, since this
 * runs on a shared clinic machine across different clients:
 *  - it persists calibration data (including small eye-image crops used as
 *    regression features, not just click coordinates) to IndexedDB by
 *    default, across page reloads - so the NEXT client's session could
 *    silently start from a PREVIOUS client's face data. Disabling that,
 *    and clearing anything already stored before this fix shipped, means
 *    every session starts from a clean slate.
 *  - webgazer.end() does not actually release the camera hardware (its own
 *    stopVideo() call is dead code, commented out internally) - the webcam
 *    LED and the OS-level "in use" indicator would stay on after clicking
 *    Stop. stopVideo() is called explicitly here to make sure the camera
 *    is actually released, not just visually hidden.
 */
export async function startGazeTracking(onSample: (sample: GazeSample) => void): Promise<GazeClientHandle> {
  const webgazer = await loadWebgazer();

  webgazer.saveDataAcrossSessions(false);
  await webgazer.clearData();

  webgazer
    .setRegression('ridge')
    .setGazeListener((data) => {
      if (!data) return;
      onSample({ x: data.x, y: data.y, timestamp: performance.now() });
    })
    .showVideo(false)
    .showFaceOverlay(false)
    .showFaceFeedbackBox(false)
    .showPredictionPoints(false);

  await webgazer.begin();

  return {
    stop: () => {
      webgazer.end();
      webgazer.stopVideo();
    },
    pause: () => {
      webgazer.pause();
    },
    resume: () => {
      webgazer.resume();
    },
  };
}

export async function clearGazeCalibration() {
  const webgazer = await loadWebgazer();
  await webgazer.clearData();
}
