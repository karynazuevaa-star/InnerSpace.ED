import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyBodyMorphs, type BodyMorphState } from '../../avatar/bodyMorphs';
import { AvatarProvider, useAvatarContext, useAttachToHead } from '../../avatar/AvatarContext';
import { primeIdleAnimationRestPose, StaticRelaxedPose } from '../../avatar/idleAnimation';
import type { HairStyle } from '../Hair';
import { cloneGltfScene } from '../../avatar/cloneGltf';

/**
 * A background person for the exposure-practice rooms (see CafeScene.tsx) -
 * same body/hair/outfit assets and material fixes as the dressing-room
 * tool's Body/OutfitPiece/HeadAttachment/Hair, but every glTF is cloned
 * per instance (see cloneGltf.ts) so several of these can stand in one
 * scene at once with independent body shapes, each wrapped in its own
 * AvatarProvider since headBone/posableScenes are meant to describe one
 * figure, not several sharing a rig.
 */
export interface NpcConfig {
  position: [number, number, number];
  rotationY: number;
  morphs: BodyMorphState;
  hairStyle: HairStyle | '';
  hairColor: string;
  topUrl: string;
  bottomUrl: string;
}

function NpcBody({ morphs }: { morphs: BodyMorphState }) {
  const { scene: template } = useGLTF('/models/body.glb?v=10');
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  const { setHeadBone, registerPosableScene, unregisterPosableScene } = useAvatarContext();

  useEffect(() => {
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material && ((mesh.material as THREE.Material).side = THREE.FrontSide);
      }
    });
    setHeadBone(scene.getObjectByName('head') ?? null);
    primeIdleAnimationRestPose(scene);
    registerPosableScene(scene);
    return () => {
      setHeadBone(null);
      unregisterPosableScene(scene);
    };
  }, [scene, setHeadBone, registerPosableScene, unregisterPosableScene]);

  useEffect(() => {
    applyBodyMorphs(scene, morphs);
  }, [scene, morphs]);

  return <primitive object={scene} dispose={null} />;
}

function NpcOutfit({ url, morphs }: { url: string; morphs: BodyMorphState }) {
  const { scene: template } = useGLTF(url);
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

  useEffect(() => {
    applyBodyMorphs(scene, morphs);
  }, [scene, morphs]);

  return <primitive object={scene} dispose={null} />;
}

function NpcHeadAttachment({ url, transparent = false }: { url: string; transparent?: boolean }) {
  const { scene: template } = useGLTF(url);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  const { headBone } = useAvatarContext();

  useEffect(() => {
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.side = THREE.FrontSide;
      const physMat = mesh.material as THREE.MeshPhysicalMaterial;
      if (physMat.clearcoat !== undefined && !transparent) {
        physMat.clearcoat = 0.05;
        physMat.clearcoatRoughness = 0.9;
      }
      if (mat.map && !transparent) {
        mat.map.minFilter = THREE.LinearFilter;
        mat.map.generateMipmaps = false;
        mat.map.needsUpdate = true;
      }
      if (transparent) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.alphaTest = 0.3;
      } else {
        mat.transparent = false;
        mat.depthWrite = true;
        mat.alphaTest = 0.02;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = 1;
        mat.polygonOffsetUnits = 1;
      }
    });
  }, [scene, transparent]);

  useAttachToHead(scene, headBone);

  return null;
}

// NpcHair is deliberately not wired up yet. Hair attached this way (cloned
// per instance, reparented onto each NPC's own head bone via
// useAttachToHead - see NpcHeadAttachment above, which uses the identical
// mechanism successfully) came out wrong once several NPCs were mounted at
// once: some heads stayed bald, one rendered as a solid black silhouette
// engulfing the figure. Neither of two fixes tried - giving each tinted
// material its own shader-program cache key, then dropping the custom tint
// shader for a plain material.color multiply - changed the result, and a
// debug probe on the attached hair's own world position/scale came back
// with the scale correct (1,1,1) but a garbage, inconsistent-looking local
// position, which points at something in the attach step itself rather
// than the material. Given this room is for ED exposure practice, an NPC
// that might render as a dark, hooded-looking shape is worse than one with
// no hair at all, so every NPC is bald for now - a real fix (or an asset-
// level workaround, e.g. baking hair into the head mesh per style) is
// follow-up work, not something to ship half-verified.
// function NpcHair({ style, color }: { style: HairStyle; color: string }) { ... }

export function NpcAvatar({ config }: { config: NpcConfig }) {
  return (
    <group position={config.position} rotation={[0, config.rotationY, 0]}>
      <AvatarProvider>
        <NpcBody morphs={config.morphs} />
        <NpcOutfit url={config.topUrl} morphs={config.morphs} />
        <NpcOutfit url={config.bottomUrl} morphs={config.morphs} />
        <NpcHeadAttachment url="/models/eyes.glb?v=15" />
        <NpcHeadAttachment url="/models/eyebrows.glb?v=4" transparent />
        <NpcHeadAttachment url="/models/eyelashes.glb?v=4" transparent />
        <StaticRelaxedPose weight={config.morphs.weight} butt={config.morphs.butt} legs={config.morphs.legs} />
      </AvatarProvider>
    </group>
  );
}
