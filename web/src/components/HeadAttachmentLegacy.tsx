import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useAttachToHead, useAvatarContext } from '../avatar/AvatarContext';

/**
 * LEGACY comparison version of HeadAttachment - see
 * pages/AvatarToolPageLegacy.tsx for why this exists. Deliberately skips
 * every material patch added while chasing the eye rendering bugs
 * (clearcoat softening, mipmap-disable, alphaTest overrides): eyes here
 * render however the raw glTF export/GLTFLoader defaults would show them,
 * for an honest "before" comparison against the current, fixed
 * HeadAttachment.tsx.
 */
export function HeadAttachmentLegacy({
  url,
  transparent = false,
}: {
  url: string;
  transparent?: boolean;
}) {
  const { scene } = useGLTF(url);
  const { headBone } = useAvatarContext();

  useEffect(() => {
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.side = THREE.FrontSide;
      if (transparent) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.alphaTest = 0.3;
      }
      // Non-transparent (eyes) case: no overrides at all, unlike the
      // current HeadAttachment.tsx - left exactly as GLTFLoader parsed it.
    });
  }, [scene, transparent]);

  useAttachToHead(scene, headBone);

  return null;
}
