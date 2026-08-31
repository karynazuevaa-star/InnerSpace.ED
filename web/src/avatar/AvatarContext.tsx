import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AvatarContextValue {
  headBone: THREE.Object3D | null;
  setHeadBone: (bone: THREE.Object3D | null) => void;
  /**
   * Every skinned piece (body, and each outfit item) ships with its OWN
   * independent skeleton copied from the same rig at bake time - clothing
   * isn't attached to the body's bones, it just happens to share the same
   * bone names. So the idle animation (see idleAnimation.tsx) has to walk
   * ALL of these root scenes each frame and apply the identical rotation to
   * each one's matching bone, or a sleeve would stay still while the arm
   * underneath it moves. This registry is a plain mutable Set (not React
   * state) since it's only ever read from inside a useFrame loop, never
   * from a render - registering/unregistering shouldn't trigger a
   * re-render of anything.
   */
  posableScenes: Set<THREE.Object3D>;
  registerPosableScene: (scene: THREE.Object3D) => void;
  unregisterPosableScene: (scene: THREE.Object3D) => void;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [headBone, setHeadBone] = useState<THREE.Object3D | null>(null);
  const posableScenes = useRef(new Set<THREE.Object3D>()).current;
  const registerPosableScene = (scene: THREE.Object3D) => posableScenes.add(scene);
  const unregisterPosableScene = (scene: THREE.Object3D) => posableScenes.delete(scene);
  return (
    <AvatarContext.Provider
      value={{ headBone, setHeadBone, posableScenes, registerPosableScene, unregisterPosableScene }}
    >
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatarContext() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatarContext must be used within AvatarProvider');
  return ctx;
}

// useGLTF's Suspense cache hands back the SAME object instance every time a
// component re-mounts for the same url, so an object can go through
// attach -> unmount -> attach again across its lifetime. head.attach()
// reads `object`'s CURRENT local transform to work out its new one, which
// only makes sense as long as that transform still means "world-space
// position" (true for a freshly-loaded glTF scene, never before attached).
// Once it's been attached once, its local transform means "offset from
// head" instead - a plain `.remove()` on cleanup doesn't convert that back,
// so a second attach would misinterpret a small head-relative offset as if
// it were still a world-space position and land the object near the origin
// (this is exactly what put hair/eyes far below the feet after toggling a
// piece off and back on). Snapshotting the transform the first time we ever
// see an object and restoring it before every attach keeps that "world-
// space" meaning intact no matter how many times it gets reattached.
const originalTransforms = new WeakMap<
  THREE.Object3D,
  { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }
>();

/** Reparents `object` onto `head`, preserving its original world transform. */
function attachToHead(head: THREE.Object3D, object: THREE.Object3D) {
  let original = originalTransforms.get(object);
  if (!original) {
    original = { position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() };
    originalTransforms.set(object, original);
  }
  object.parent?.remove(object);
  object.position.copy(original.position);
  object.quaternion.copy(original.quaternion);
  object.scale.copy(original.scale);
  object.updateMatrix();

  head.updateWorldMatrix(true, false);
  object.updateMatrixWorld(true);
  head.attach(object);
}

/**
 * Attaches `object` to `head` once both are available, deferred to the R3F
 * render loop instead of a plain useEffect. attach() bakes in `object`'s new
 * local transform from head's CURRENT matrixWorld - correct only if that
 * matrix already reflects the fully-settled skeleton. Inside a commit-phase
 * useEffect that isn't guaranteed yet (most visible under React StrictMode's
 * synthetic double-mount, which can invoke the attach before the skeleton's
 * matrices have been walked for the current tree), and produced exactly
 * that: hair/eyes landing reparented but at the wrong world position. A
 * useFrame callback runs after the renderer's own updateMatrixWorld pass
 * has already run at least once, so head's matrix is always trustworthy by
 * then. The ref just makes sure the (cheap) reparent only actually runs
 * once per (object, head) pair rather than every frame.
 */
export function useAttachToHead(object: THREE.Object3D, head: THREE.Object3D | null) {
  const attachedRef = useRef<{ object: THREE.Object3D; head: THREE.Object3D } | null>(null);

  useFrame(() => {
    if (!head) return;
    const current = attachedRef.current;
    if (current && current.object === object && current.head === head) return;
    attachToHead(head, object);
    attachedRef.current = { object, head };
  });

  useEffect(() => {
    return () => {
      object.parent?.remove(object);
      if (attachedRef.current?.object === object) attachedRef.current = null;
    };
  }, [object]);
}
