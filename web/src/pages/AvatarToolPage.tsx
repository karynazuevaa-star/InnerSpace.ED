import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AvatarScene } from '../components/AvatarScene';
import { BodySliders } from '../components/BodySliders';
import { HairPicker } from '../components/HairPicker';
import { SkinPicker } from '../components/SkinPicker';
import { TechniqueGuide } from '../components/TechniqueGuide';
import { GazeTracker } from '../gaze/GazeTracker';
import { DEFAULT_BODY_MORPHS, type BodyMorphState } from '../avatar/bodyMorphs';
import { bodyUrl, skinSuffix, type Skin } from '../avatar/skin';
import { TECHNIQUES } from '../content/techniques';
import { assetUrl } from '../lib/assetUrl';
import type { HairStyle } from '../components/Hair';

function outfitUrl(part: string, skin: Skin): string {
  return assetUrl(`/models/outfits/${part}${skinSuffix(skin)}.glb?v=8`);
}

// The outfit is fixed - jeans and a tank top, no other choice and no "no
// clothes" state in this tool.
const TOP = 'croptop';
const BOTTOM = 'tightjeans';

export function AvatarToolPage() {
  const [morphs, setMorphs] = useState<BodyMorphState>(DEFAULT_BODY_MORPHS);
  const [skin, setSkin] = useState<Skin>('caucasian');
  const [hairStyle, setHairStyle] = useState<HairStyle | ''>('long');
  const [hairColor, setHairColor] = useState('#5a3222');
  const [gazeActive, setGazeActive] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapResetKey, setHeatmapResetKey] = useState(0);
  const [activeTechniqueId, setActiveTechniqueId] = useState<string | null>(null);
  const location = useLocation();

  // A technique's "Попробовать"/"Try it" button (MaterialsPage.tsx) sends
  // its id here via route state rather than a prop - this page stays
  // permanently mounted across navigation (see App.tsx's own comment on
  // why), so there's no prop chain from Materials to receive it through.
  // Picked up into local state rather than read from location.state
  // directly so it survives a plain nav-link visit to /avatar afterward
  // (which carries no state at all, and shouldn't clear an in-progress
  // guide).
  useEffect(() => {
    const id = (location.state as { techniqueId?: string } | null)?.techniqueId;
    if (id) setActiveTechniqueId(id);
  }, [location.state]);

  const activeTechnique = activeTechniqueId ? TECHNIQUES.find((tech) => tech.id === activeTechniqueId) ?? null : null;

  return (
    <div className="home-page">
      <div className="scene-pane">
        <AvatarScene
          config={{
            morphs,
            bodyUrl: bodyUrl(skin),
            hairStyle,
            hairColor,
            topUrl: outfitUrl(TOP, skin),
            bottomUrl: outfitUrl(BOTTOM, skin),
            gazeActive,
            heatmapVisible,
            heatmapResetKey,
          }}
        />
        {/* Floats over the 3D view itself (top-right, clear of the
            bottom-left orbit pad AvatarScene renders) rather than sitting
            in the sidebar above BodySliders - reported directly that
            having it push the body parameters down every time was
            awkward, since checking a hint step and adjusting a slider
            happen right after each other. */}
        {activeTechnique && <TechniqueGuide technique={activeTechnique} onClose={() => setActiveTechniqueId(null)} />}
      </div>
      <aside className="panel">
        <SkinPicker skin={skin} onSkinChange={setSkin} />
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
