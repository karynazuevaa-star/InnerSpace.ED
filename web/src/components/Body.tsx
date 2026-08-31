import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyBodyMorphs, type BodyMorphState } from '../avatar/bodyMorphs';
import { useAvatarContext } from '../avatar/AvatarContext';
import { primeIdleAnimationRestPose } from '../avatar/idleAnimation';

export function Body({ morphs }: { morphs: BodyMorphState }) {
  const { scene } = useGLTF('/models/body.glb?v=10');
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

useGLTF.preload('/models/body.glb?v=10');
