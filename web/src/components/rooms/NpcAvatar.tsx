import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarProvider, useAvatarContext } from '../../avatar/AvatarContext';
import {
  primeIdleAnimationRestPose,
  IdleAnimation,
  SeatedPose,
  SEATED_HIP_DROP_METERS,
  type SeatedArmOverride,
  type ConversationConfig,
} from '../../avatar/idleAnimation';
import { cloneGltfScene } from '../../avatar/cloneGltf';

/**
 * A background person for the exposure-practice rooms (see CafeScene.tsx).
 * Unlike the dressing-room tool's Body/OutfitPiece/Hair/HeadAttachment,
 * which reassemble body+hair+outfit+eyes from separate glb files and
 * reparent hair/eyes onto the head bone at runtime (so the tool can swap
 * any piece live), each NPC preset here is ALREADY a single glb - body,
 * hair, outfit and eyes baked into one mesh hierarchy sharing one skeleton
 * by pipeline/scripts/09_bake_npc_presets.py. That sidesteps the bug the
 * runtime-reassembly approach hit once several NPCs needed independent
 * hair at once (see git history - some rendered bald, one as a solid black
 * silhouette): there's no runtime attach step left to get wrong. Each
 * preset still needs cloning (see cloneGltf.ts) so several NPCs can use
 * the same preset file without fighting over one shared Object3D.
 */
export const NPC_PRESET_NAMES = [
  'npc_thinner', 'npc_heavier', 'npc_average', 'npc_curvier', 'npc_lean',
  'npc_male_lean', 'npc_male_average', 'npc_male_heavier', 'npc_male_muscular',
  'npc_polka_skirt', 'npc_asian_dress', 'npc_tiered_dress', 'npc_knit_sweater',
  'npc_native_skirt', 'npc_lace_ruffle', 'npc_male_casualsuit',
] as const;
export type NpcPresetName = (typeof NPC_PRESET_NAMES)[number];

export interface NpcConfig {
  position: [number, number, number];
  rotationY: number;
  preset: NpcPresetName;
  /** Bends the legs into a chair pose and drops the pelvis to seat height
   * (SEATED_HIP_DROP_METERS) instead of standing - see idleAnimation.tsx's
   * SeatedPose for how the drop amount was derived from the rig's own bone
   * lengths. `position` still names the floor spot under the chair, same
   * as a standing NPC - the seat drop is applied on top of it here. */
  seated?: boolean;
  /** Only meaningful when seated - replaces the shared SEATED_HIP_DROP_
   * METERS for this one NPC. That constant was measured off one reference
   * body's own bone lengths - a preset built from noticeably different
   * body-shape morphs (macro_weight, muscle, etc. in the bake pipeline)
   * can have slightly different actual proportions, and the shared drop
   * then sits this specific NPC visibly low in - or high above - the
   * chair seat (reported directly, with a screenshot: npc_thinner sunk
   * about halfway into hers). Per-NPC, not a change to the shared
   * constant, so it can't affect anyone else's already-correct seating. */
  seatedHipDropOverride?: number;
  /** Only meaningful when seated - overrides that hand's default rest-on-
   * the-thigh pose with an activity (phone/eating/gesture) or a fixed
   * point to reach for (a shared handhold spot on the table). See
   * SeatedArmOverride. */
  leftArm?: SeatedArmOverride;
  rightArm?: SeatedArmOverride;
  /** Only meaningful when seated - shares this NPC into a table-wide
   * speak/listen turn-taking system (see ConversationConfig). Omitted for
   * solo NPCs, who have no one to look at. */
  conversation?: ConversationConfig;
}

function presetUrl(preset: NpcPresetName): string {
  return `/models/npc/${preset}.glb`;
}

function NpcPreset({ preset }: { preset: NpcPresetName }) {
  const { scene: template } = useGLTF(presetUrl(preset));
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  const { registerPosableScene, unregisterPosableScene } = useAvatarContext();

  useEffect(() => {
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        (mesh.material as THREE.Material).side = THREE.FrontSide;
      }
    });
    primeIdleAnimationRestPose(scene);
    registerPosableScene(scene);
    // TEMP DEBUG - remove once the stuck-right-arm report is diagnosed.
    // Doesn't depend on the render loop (unlike the useFrame-based
    // [roleDbg] logs in idleAnimation.tsx), so it fires even where rAF is
    // stalled.
    if (preset === 'npc_tiered_dress') {
      const names = ['lowerarm01R', 'wristR', 'upperarm01R', 'finger3-1R', 'finger2-1R', 'head'];
      console.log('[boneDbg] npc_tiered_dress bone lookup:', Object.fromEntries(
        names.map((n) => [n, !!scene.getObjectByName(n)]),
      ));
    }
    return () => unregisterPosableScene(scene);
  }, [scene, registerPosableScene, unregisterPosableScene]);

  return <primitive object={scene} dispose={null} />;
}

export function NpcAvatar({ config }: { config: NpcConfig }) {
  const [x, y, z] = config.position;
  const groupY = config.seated ? y - (config.seatedHipDropOverride ?? SEATED_HIP_DROP_METERS) : y;
  return (
    <group position={[x, groupY, z]} rotation={[0, config.rotationY, 0]}>
      <AvatarProvider>
        <NpcPreset preset={config.preset} />
        {config.seated ? (
          <SeatedPose leftArm={config.leftArm} rightArm={config.rightArm} conversation={config.conversation} />
        ) : (
          <IdleAnimation weight={0} butt={0} legs={0} />
        )}
      </AvatarProvider>
    </group>
  );
}
