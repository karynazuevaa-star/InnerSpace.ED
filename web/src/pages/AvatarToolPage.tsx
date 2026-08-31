import { useState } from 'react';
import { AvatarScene } from '../components/AvatarScene';
import { BodySliders } from '../components/BodySliders';
import { HairPicker } from '../components/HairPicker';
import { GazeTracker } from '../gaze/GazeTracker';
import { DEFAULT_BODY_MORPHS, type BodyMorphState } from '../avatar/bodyMorphs';
import type { HairStyle } from '../components/Hair';

function outfitUrl(part: string): string {
  return `/models/outfits/${part}.glb?v=6`;
}

// The outfit is fixed - jeans and a tank top, no other choice and no "no
// clothes" state in this tool.
const TOP = 'croptop';
const BOTTOM = 'tightjeans';

export function AvatarToolPage() {
  const [morphs, setMorphs] = useState<BodyMorphState>(DEFAULT_BODY_MORPHS);
  const [hairStyle, setHairStyle] = useState<HairStyle | ''>('long');
  const [hairColor, setHairColor] = useState('#5a3222');
  const [gazeActive, setGazeActive] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapResetKey, setHeatmapResetKey] = useState(0);

  return (
    <div className="home-page">
      <div className="scene-pane">
        <AvatarScene
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
