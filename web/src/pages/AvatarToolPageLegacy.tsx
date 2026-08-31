import { useState } from 'react';
import { AvatarSceneLegacy } from '../components/AvatarSceneLegacy';
import { BodySliders } from '../components/BodySliders';
import { HairPicker } from '../components/HairPicker';
import { GazeTracker } from '../gaze/GazeTracker';
import { DEFAULT_BODY_MORPHS, type BodyMorphState } from '../avatar/bodyMorphs';
import type { HairStyle } from '../components/Hair';

/**
 * LEGACY comparison page, live at /avatar-legacy - a copy of
 * AvatarToolPage.tsx pointed at AvatarSceneLegacy instead of AvatarScene,
 * so it renders the avatar as it looked before IdleAnimation and every fix
 * made since (eye clearcoat/material tuning, the eye-socket texture fix,
 * the lips Base-Color export fix). Requested as a side-by-side reference
 * point, not a replacement for the real /avatar tool - the outfit/hair
 * picker still works here so both pages can be compared at the same pose.
 */
function outfitUrl(part: string): string {
  return `/models/outfits/${part}.glb?v=7`;
}

const TOP = 'croptop';
const BOTTOM = 'tightjeans';

export function AvatarToolPageLegacy() {
  const [morphs, setMorphs] = useState<BodyMorphState>(DEFAULT_BODY_MORPHS);
  const [hairStyle, setHairStyle] = useState<HairStyle | ''>('long');
  const [hairColor, setHairColor] = useState('#5a3222');
  const [gazeActive, setGazeActive] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapResetKey, setHeatmapResetKey] = useState(0);

  return (
    <div className="home-page">
      <div className="scene-pane">
        <AvatarSceneLegacy
          config={{
            morphs,
            hairStyle,
            hairColor,
            topUrl: outfitUrl(TOP),
            bottomUrl: outfitUrl(BOTTOM),
            gazeActive,
            heatmapVisible,
            heatmapResetKey,
          }}
        />
      </div>
      <aside className="panel">
        <BodySliders value={morphs} onChange={setMorphs} />
        <HairPicker style={hairStyle} color={hairColor} onStyleChange={setHairStyle} onColorChange={setHairColor} />
        <GazeTracker
          onActiveChange={setGazeActive}
          onVisibleChange={setHeatmapVisible}
          onHeatmapResetKeyChange={setHeatmapResetKey}
        />
      </aside>
    </div>
  );
}
