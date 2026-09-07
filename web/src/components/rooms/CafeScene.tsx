import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CafeEnvironment } from './CafeEnvironment';
import { NpcAvatar, type NpcConfig } from './NpcAvatar';
import { PlayerControls, type RoomBounds } from './PlayerControls';
import { SceneLoader } from '../SceneLoader';
import { useLanguage } from '../../i18n/LanguageContext';

// rotationY -> facing direction (derived from SeatedPose's own forward
// formula, forward = (-sin(rotationY), 0, -cos(rotationY))): 0 faces -Z,
// +PI/2 faces -X, -PI/2 faces +X, PI faces +Z. A chair/NPC positioned
// EAST of its table (higher x) needs to face -X to look at the table, so
// that's +PI/2, not -PI/2 - and WEST needs +X, i.e. -PI/2, not +PI/2. Got
// this backwards the first time around (copied the static Chair prop's
// own rotationY directly, which turned out to use the opposite
// convention from the avatar rig) - confirmed directly, screenshots
// showed one of each pair sitting turned away from their own table.
const NPCS: NpcConfig[] = [
  // Table 1 (1.6,-3.4): lace_ruffle + male_heavier together
  { position: [1.6, 0, -2.5], rotationY: 0, preset: 'npc_lace_ruffle', seated: true },
  { position: [2.5, 0, -3.4], rotationY: Math.PI / 2, preset: 'npc_male_heavier', seated: true },

  // Table 2 (3.4,-0.4): the other two guys together
  { position: [3.4, 0, 0.5], rotationY: 0, preset: 'npc_male_average', seated: true },
  { position: [4.3, 0, -0.4], rotationY: Math.PI / 2, preset: 'npc_male_casualsuit', seated: true },

  // Table 3 (-2.6,1.4): thinner alone
  { position: [-2.6, 0, 2.3], rotationY: 0, preset: 'npc_thinner', seated: true },

  // Table 4 (0.5,1.8): polka_skirt + tiered_dress together
  { position: [0.5, 0, 2.7], rotationY: 0, preset: 'npc_polka_skirt', seated: true },
  { position: [1.4, 0, 1.8], rotationY: Math.PI / 2, preset: 'npc_tiered_dress', seated: true },

  // Table 5 (-3.6,-2.0): the remaining three together - now with a 3rd chair
  { position: [-3.6, 0, -1.1], rotationY: 0, preset: 'npc_asian_dress', seated: true },
  { position: [-2.7, 0, -2.0], rotationY: Math.PI / 2, preset: 'npc_native_skirt', seated: true },
  { position: [-4.5, 0, -2.0], rotationY: -Math.PI / 2, preset: 'npc_knit_sweater', seated: true },
];

const BOUNDS: RoomBounds = { minX: -4.5, maxX: 4.5, minZ: -5, maxZ: 3.2 };

/**
 * Exposure-practice cafe: a place people with EDs often avoid (eating in
 * public, being around others while eating). Entirely separate from the
 * dressing-room tool's Canvas/scene tree (AvatarSceneLegacy.tsx /
 * AvatarScene.tsx) - the NPCs are pre-baked (see NpcAvatar.tsx and
 * pipeline/scripts/09_bake_npc_presets.py), sharing only generic,
 * non-visual avatar rigging infra (AvatarContext, idleAnimation's pose
 * helpers) and the SceneLoader overlay, none of which this room modifies.
 */
export function CafeScene() {
  const { t } = useLanguage();
  return (
    <>
      <SceneLoader label={t('loading.room')} />
      <Canvas shadows camera={{ position: [0, 1.6, 2.6], fov: 60, near: 0.05 }} style={{ background: '#25201c' }}>
        <ambientLight intensity={0.55} color="#fff2e2" />
        <directionalLight
          position={[3, 5, 2]}
          intensity={0.6}
          color="#fff0d6"
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.0006}
        />
        <Suspense fallback={null}>
          <CafeEnvironment />
          {NPCS.map((npc, i) => (
            <NpcAvatar key={i} config={npc} />
          ))}
        </Suspense>
        <PlayerControls start={[0, 2.6]} startYaw={0} bounds={BOUNDS} />
      </Canvas>
    </>
  );
}
