import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

/**
 * Loading overlay for room scenes (CafeScene.tsx, and any future room) - a
 * spinning ring instead of AvatarScene/BrainViewer's pixel-sprite fill
 * (SceneLoader.tsx), with a caption that cycles through what the room is
 * "doing" right now. Requested directly: a room can take a real moment to
 * load, and a bare percentage read as passive - naming what's happening
 * ("Loading the food…", "Adding people…") gives a sense of following
 * actual progress. The captions cycle on a plain timer, not real load
 * phases - useProgress's percentage (still shown in the bar/label below)
 * has no per-asset breakdown to drive them from, so this is deliberately
 * atmosphere, not a literal readout.
 */
const CAPTION_INTERVAL_MS = 1400;

export function RoomLoader({ captions }: { captions: string[] }) {
  const { active, progress } = useProgress();
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setCaptionIndex(0);
    const id = window.setInterval(() => {
      setCaptionIndex((i) => (i + 1) % captions.length);
    }, CAPTION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, captions.length]);

  if (!active) return null;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="scene-loader room-loader">
      <div className="room-loader__spinner" aria-hidden="true" />
      {/* key remounts the <p> on every caption change so the fade-in
          animation replays instead of only firing once on first mount. */}
      <p className="room-loader__caption" key={captionIndex}>
        {captions[captionIndex]}
      </p>
      <div className="scene-loader__bar">
        <div className="scene-loader__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="scene-loader__label">{pct}%</p>
    </div>
  );
}
