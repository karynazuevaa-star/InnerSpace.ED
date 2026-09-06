import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

/**
 * useGLTF caches by url and hands back the SAME Object3D every time -
 * exactly what the single-avatar dressing-room tool wants (see Body.tsx's
 * dispose={null} comment), but wrong for a scene with several NPCs sharing
 * one body.glb/hair glb/etc: Three only lets an Object3D live under one
 * parent at a time, and mutating shared morphTargetInfluences or a shared
 * hair-tint material would make every instance flash to whichever NPC's
 * state was applied last. SkeletonUtils.clone gives each instance its own
 * skeleton/bones (a plain Object3D.clone() leaves SkinnedMeshes bound to
 * the ORIGINAL skeleton) and, since THREE.Mesh.copy() slices
 * morphTargetInfluences into a fresh array per clone, morph targets already
 * come out independent for free. Materials don't - clone() still shares
 * them by reference - so this also clones every mesh's material explicitly,
 * which per-NPC hair tinting needs.
 */
export function cloneGltfScene(scene: THREE.Object3D): THREE.Object3D {
  const clone = SkeletonUtils.clone(scene);
  clone.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m.clone())
      : (mesh.material as THREE.Material).clone();
  });
  return clone;
}
