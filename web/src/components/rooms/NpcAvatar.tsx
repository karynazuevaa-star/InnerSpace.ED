import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarProvider, useAvatarContext } from '../../avatar/AvatarContext';
import { primeIdleAnimationRestPose, IdleAnimation } from '../../avatar/idleAnimation';
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
export const NPC_PRESET_NAMES = ['npc_thinner', 'npc_heavier', 'npc_average', 'npc_curvier', 'npc_lean'] as const;
export type NpcPresetName = (typeof NPC_PRESET_NAMES)[number];

export interface NpcConfig {
  position: [number, number, number];
  rotationY: number;
  preset: NpcPresetName;
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
    return () => unregisterPosableScene(scene);
  }, [scene, registerPosableScene, unregisterPosableScene]);

  return <primitive object={scene} dispose={null} />;
}

export function NpcAvatar({ config }: { config: NpcConfig }) {
  return (
    <group position={config.position} rotation={[0, config.rotationY, 0]}>
      <AvatarProvider>
        <NpcPreset preset={config.preset} />
        <IdleAnimation weight={0} butt={0} legs={0} />
      </AvatarProvider>
    </group>
  );
}
