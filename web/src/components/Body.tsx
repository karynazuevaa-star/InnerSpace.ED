import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyBodyMorphs, type BodyMorphState } from '../avatar/bodyMorphs';
import { useAvatarContext } from '../avatar/AvatarContext';
import { primeIdleAnimationRestPose, resetIdleLookState } from '../avatar/idleAnimation';

// url is which skin/ethnicity variant to load (see bodyUrl() in
// AvatarToolPage.tsx) - no module-level preload here anymore, since there
// are now three interchangeable body.glb files and eagerly fetching all of
// them would undo the whole point of only downloading the one the
// specialist actually picked.
export function Body({ morphs, url }: { morphs: BodyMorphState; url: string }) {
  const { scene } = useGLTF(url);
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
    // Before this scene has been through a single animation frame - see
    // primeIdleAnimationRestPose's own comment for why that timing matters.
    primeIdleAnimationRestPose(scene);
    // A skin switch swaps in a brand-new skeleton here, but IdleAnimation
    // itself never remounts (it sits outside this Suspense boundary) - see
    // resetIdleLookState's own comment for why that left the new head
    // snapped to whatever angle the old one was mid-turn to.
    resetIdleLookState();
    registerPosableScene(scene);
    return () => {
      setHeadBone(null);
      unregisterPosableScene(scene);
    };
  }, [scene, setHeadBone, registerPosableScene, unregisterPosableScene]);

  useEffect(() => {
    applyBodyMorphs(scene, morphs);
  }, [scene, morphs]);

  // dispose={null}: without it, R3F frees this object's (and everything
  // nested under it, including hair/eyes attached onto the head bone)
  // geometry/material/textures the instant this primitive unmounts - e.g.
  // navigating to another page. useGLTF's cache still hands back this same
  // scene object on the next mount, now holding disposed GPU resources,
  // which reads as garbled/missing textures on the face rather than
  // anything about the pose.
  return <primitive ref={rootRef} object={scene} dispose={null} />;
}
