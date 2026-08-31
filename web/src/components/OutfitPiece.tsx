import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyBodyMorphs, type BodyMorphState } from '../avatar/bodyMorphs';
import { useAvatarContext } from '../avatar/AvatarContext';
import { primeIdleAnimationRestPose } from '../avatar/idleAnimation';

/**
 * A clothing item ships with its OWN skeleton, bundled in the same glb,
 * matching the body's bind pose - it doesn't attach to the body's bones, it
 * just happens to share the same bone names. Registering it with
 * AvatarContext's posableScenes lets idleAnimation.tsx drive its arm/leg/
 * spine bones in lockstep with the body's, so sleeves and waistbands track
 * the body underneath instead of staying stuck in the T-pose bind.
 *
 * It also carries its own copy of whichever body morph targets matter for
 * it (see pipeline/scripts/07_bake_outfit_morphs.py) - corrective shape
 * keys baked once at asset-build time so the garment grows/shrinks with
 * the same weight/belly/breast sliders as the body, instead of staying a
 * fixed size while the body underneath changes shape.
 */
export function OutfitPiece({ url, morphs }: { url: string; morphs: BodyMorphState }) {
  const { scene } = useGLTF(url);
  const { registerPosableScene, unregisterPosableScene } = useAvatarContext();

  useEffect(() => {
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        (mesh.material as THREE.Material).side = THREE.FrontSide;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    primeIdleAnimationRestPose(scene);
    registerPosableScene(scene);
    return () => unregisterPosableScene(scene);
  }, [scene, registerPosableScene, unregisterPosableScene]);

  useEffect(() => {
    applyBodyMorphs(scene, morphs);
  }, [scene, morphs]);

  // dispose={null} - see Body.tsx's comment on the same prop.
  return <primitive object={scene} dispose={null} />;
}
