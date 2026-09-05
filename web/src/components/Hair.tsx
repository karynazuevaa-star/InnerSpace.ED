import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useAttachToHead, useAvatarContext } from '../avatar/AvatarContext';
import { makeHairTintable } from '../avatar/hairTint';

export type HairStyle = 'long' | 'medium' | 'short';

export function Hair({ style, color }: { style: HairStyle; color: string }) {
  const { scene } = useGLTF(`/models/hair/${style}.glb?v=22`);
  const { headBone } = useAvatarContext();

  useEffect(() => {
    const tinters: ReturnType<typeof makeHairTintable>[] = [];
    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.side = THREE.DoubleSide;
      // The hair card texture is an alpha-cutout strand pattern (~19%
      // fully transparent, the gaps between strands), and that "invisible"
      // 19% is baked as solid BLACK rather than a color that wouldn't
      // matter if alpha were respected. transparent=false with no
      // alphaTest ignores alpha entirely, so those black cutout pixels
      // render as solid black patches instead of disappearing.
      // alphaTest (a real cutoff, not 0) fixes that - MASK behavior, cutout
      // pixels discarded outright instead of drawn black.
      mat.transparent = false;
      mat.depthTest = true;
      mat.depthWrite = true;
      mat.alphaTest = 0.5;
      // A small polygonOffset nudges the hair just enough to win the depth
      // test against the near-coincident scalp underneath, closing the
      // crown gap that reads as "see-through" hair. Kept deliberately
      // modest - a stronger bias closed the gap fully but also made hair
      // strand tips win against the torso/shirt they should stay behind,
      // reading as thin dark lines bleeding through the fabric.
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -1;
      mat.polygonOffsetUnits = -1;
      // Mipmapping an alpha-cutout texture like this one (fine strand gaps,
      // one large fully-transparent background region) blurs the alpha
      // channel at lower mip levels - which mip level a given fragment
      // samples from is GPU/driver-dependent (fine on this session's own
      // sandboxed testing, but produced a large, sharply-bounded bald
      // patch on the user's real hardware, in both Safari AND Chrome, so
      // it isn't a browser-engine issue). Forcing linear (non-mipmapped)
      // filtering makes every fragment sample the same full-resolution
      // texel regardless of GPU, so the alphaTest cutoff above is
      // deterministic everywhere.
      const map = mat.map;
      if (map) {
        map.minFilter = THREE.LinearFilter;
        map.generateMipmaps = false;
        map.needsUpdate = true;
      }
      tinters.push(makeHairTintable(mat, color));
    });
    // Stash the setters on the object so the color effect below can reach
    // them without re-running the (expensive) shader patch every time the
    // color changes.
    (scene as unknown as { __tinters?: typeof tinters }).__tinters = tinters;
  }, [scene, style]);

  useAttachToHead(scene, headBone);

  useEffect(() => {
    const tinters = (scene as unknown as { __tinters?: ReturnType<typeof makeHairTintable>[] }).__tinters;
    tinters?.forEach((t) => t.setColor(color));
  }, [scene, color]);

  return null;
}
