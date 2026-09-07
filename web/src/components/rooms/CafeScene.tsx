import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CafeEnvironment } from './CafeEnvironment';
import { NpcAvatar, type NpcConfig } from './NpcAvatar';
import { PlayerControls, type RoomBounds } from './PlayerControls';
import { SceneLoader } from '../SceneLoader';
import { useLanguage } from '../../i18n/LanguageContext';

// The Chair prop's own backrest sits on its -Z side (see CafeEnvironment.tsx),
// so a chair at rotationY=0 has its seat facing +Z, not -Z - confirmed
// directly (screenshots of 5 NPCs sitting with their backs to their own
// table, chair included) after an earlier attempt got this backwards by
// assuming 0 meant -Z. Every "north" seat (higher z than its table) needs
// rotationY=PI to face the table (-Z); the "east"/"west" (+-PI/2) seats
// were already correct, since they were never flagged.
// Table 1's shared point for the handhold pose - both npc_lace_ruffle and
// npc_male_heavier aim a hand at this exact spot instead of resting it on
// their own thigh. Originally the table's own geometric center (1.6,-3.4),
// but aimBoneAtPoint only orients the forearm toward a direction - it
// doesn't stretch it - so a target further away than the character's own
// natural reach left visible gaps between the two hands (reported
// directly, with a screenshot). The midpoint between the two actual seat
// positions ((1.6,-2.5) and (2.5,-3.4)) is much closer to each character's
// own reach, and still reads as "hands meeting on the table" between them.
const TABLE1_HANDS: [number, number, number] = [2.05, 0.76, -2.95];

const NPCS: NpcConfig[] = [
  // Table 1 (1.6,-3.4): lace_ruffle + male_heavier together, holding hands
  // on the table
  { position: [1.6, 0, -2.5], rotationY: Math.PI, preset: 'npc_lace_ruffle', seated: true, rightArm: { target: TABLE1_HANDS } },
  { position: [2.5, 0, -3.4], rotationY: -Math.PI / 2, preset: 'npc_male_heavier', seated: true, leftArm: { target: TABLE1_HANDS } },

  // Table 2 (3.4,-0.4): the other two guys together, eating
  { position: [3.4, 0, 0.5], rotationY: Math.PI, preset: 'npc_male_average', seated: true, rightArm: { activity: 'eating' } },
  { position: [4.3, 0, -0.4], rotationY: -Math.PI / 2, preset: 'npc_male_casualsuit', seated: true, rightArm: { activity: 'eating' } },

  // Table 3 (-2.6,1.4): thinner alone, coffee on the table
  { position: [-2.6, 0, 2.3], rotationY: Math.PI, preset: 'npc_thinner', seated: true },

  // Table 4 (0.5,1.8): polka_skirt on her phone, tiered_dress with food
  { position: [0.5, 0, 2.7], rotationY: Math.PI, preset: 'npc_polka_skirt', seated: true, rightArm: { activity: 'phone' } },
  { position: [1.4, 0, 1.8], rotationY: -Math.PI / 2, preset: 'npc_tiered_dress', seated: true },

  // Table 5 (-3.6,-2.0): the remaining three together, mid-conversation -
  // now with a 3rd chair
  { position: [-3.6, 0, -1.1], rotationY: Math.PI, preset: 'npc_asian_dress', seated: true, rightArm: { activity: 'gesture' } },
  { position: [-2.7, 0, -2.0], rotationY: -Math.PI / 2, preset: 'npc_native_skirt', seated: true },
  { position: [-4.5, 0, -2.0], rotationY: Math.PI / 2, preset: 'npc_knit_sweater', seated: true },
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
