import { useId } from 'react';
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
 *
 * The sprite below is a small pixel-art figure that fills in from the
 * feet up as useProgress's real percentage advances - requested directly
 * ("как в симс или пиксельную типо загрузку", a Sims-style or pixel-art
 * loading animation) instead of the plain spinning ring this used to be.
 * It's plain SVG rects, not an image asset, so it stays crisp at any
 * size with no sprite sheet to ship.
 */
const SPRITE_ROWS = [
  '..XXX..',
  '..XXX..',
  '.XXXXX.',
  'XXXXXXX',
  'XXXXXXX',
  '.XXXXX.',
  '.XXXXX.',
  '.XX.XX.',
  '.XX.XX.',
  '.XX.XX.',
];
const SPRITE_COLS = 7;
const SPRITE_CELL = 8;
const SPRITE_WIDTH = SPRITE_COLS * SPRITE_CELL;
const SPRITE_HEIGHT = SPRITE_ROWS.length * SPRITE_CELL;

const SPRITE_CELLS = SPRITE_ROWS.flatMap((row, y) =>
  [...row].flatMap((char, x) => (char === 'X' ? [{ x: x * SPRITE_CELL, y: y * SPRITE_CELL }] : [])),
);

export function SceneLoader({ label }: { label: string }) {
  const { active, progress } = useProgress();
  const clipId = useId();
  if (!active) return null;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  // Reveals the filled (accent-colored) sprite from the feet up - the clip
  // rect's top edge starts at the bottom (pct=0, nothing revealed) and
  // rises toward y=0 as pct approaches 100.
  const clipTop = SPRITE_HEIGHT * (1 - pct / 100);

  return (
    <div className="scene-loader">
      <svg
        className="scene-loader__sprite"
        viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`}
        width={SPRITE_WIDTH * 4}
        height={SPRITE_HEIGHT * 4}
        aria-hidden="true"
      >
        <g className="scene-loader__sprite-outline">
          {SPRITE_CELLS.map((cell, i) => (
            <rect key={i} x={cell.x} y={cell.y} width={SPRITE_CELL} height={SPRITE_CELL} />
          ))}
        </g>
        <clipPath id={clipId}>
          <rect x={0} y={clipTop} width={SPRITE_WIDTH} height={SPRITE_HEIGHT - clipTop} />
        </clipPath>
        <g className="scene-loader__sprite-fill" clipPath={`url(#${clipId})`}>
          {SPRITE_CELLS.map((cell, i) => (
            <rect key={i} x={cell.x} y={cell.y} width={SPRITE_CELL} height={SPRITE_CELL} />
          ))}
        </g>
      </svg>
      <div className="scene-loader__bar">
        <div className="scene-loader__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="scene-loader__label">
        {label} {pct}%
      </p>
    </div>
  );
}
