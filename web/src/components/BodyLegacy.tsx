import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyBodyMorphs, type BodyMorphState } from '../avatar/bodyMorphs';
import { useAvatarContext } from '../avatar/AvatarContext';

/**
 * LEGACY comparison version of Body - see pages/AvatarToolPageLegacy.tsx.
 * Loads the pre-fix body.glb (old skin texture, no lips Base-Color rewire)
 * and skips primeIdleAnimationRestPose since this page never runs
 * IdleAnimation at all.
 */
export function BodyLegacy({ morphs }: { morphs: BodyMorphState }) {
  const { scene } = useGLTF('/models-legacy/body.glb');
  const { setHeadBone, registerPosableScene, unregisterPosableScene } = useAvatarContext();
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material && ((mesh.material as THREE.Material).side = THREE.FrontSide);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    setHeadBone(scene.getObjectByName('head') ?? null);
    registerPosableScene(scene);
    return () => {
      setHeadBone(null);
      unregisterPosableScene(scene);
    };
  }, [scene, setHeadBone, registerPosableScene, unregisterPosableScene]);

  useEffect(() => {
    applyBodyMorphs(scene, morphs);
  }, [scene, morphs]);

  return <primitive ref={rootRef} object={scene} dispose={null} />;
}

useGLTF.preload('/models-legacy/body.glb');
