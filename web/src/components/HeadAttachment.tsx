import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarContext } from '../avatar/AvatarContext';

/**
 * Loads a rigid glb (eyes, eyebrows, eyelashes) and attaches it to the
 * head bone once available. These never need their own pose - they only
 * ever move as a single rigid piece following the head.
 */
export function HeadAttachment({
  url,
  transparent = false,
}: {
  url: string;
  transparent?: boolean;
}) {
  const { scene } = useGLTF(url);
  const { headBone } = useAvatarContext();

  useEffect(() => {
    // Don't modify the scene root transform - the MHCLO-fitted eye mesh
    // is positioned correctly in world space. Just update matrix and apply
    // material fixes, then attach as a child of the head bone.
    scene.updateMatrixWorld(true);

    scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.side = THREE.FrontSide;
      // The eyes' clearcoat layer (kept intentionally - see 04_assemble_eyes.py,
      // stripping the KHR_materials_clearcoat extension broke eye rendering
      // entirely) exports at full strength (clearcoat=1, clearcoatRoughness=0,
      // a perfect mirror). A mirror-sharp highlight on the cornea's curve is
      // bright enough to cross the scene's bloom threshold, which then
      // smears it into a visible glow - confirmed by disabling Bloom
      // entirely, which made the glow vanish outright. Weakening the
      // clearcoat keeps the cornea looking wet without a highlight bright
      // enough to bloom.
      const physMat = mesh.material as THREE.MeshPhysicalMaterial;
      if (physMat.clearcoat !== undefined && !transparent) {
        physMat.clearcoat = 0.05;
        physMat.clearcoatRoughness = 0.9;
      }
      // Belt-and-suspenders for the eye texture's real fix (desaturating the
      // iris ring in brown_eye.png - see 04_assemble_eyes.py): forcing
      // linear, non-mipmapped filtering means every fragment samples the
      // same full-resolution texel regardless of view angle, same as the
      // fix already used for hair's alpha-cutout texture. Scoped to the
      // eyes only (!transparent) - eyebrows/eyelashes are fine-grained
      // alpha-cutout hair-strand textures, and forcing non-mipmapped
      // sampling on those under-samples the sparse strand pattern at
      // normal viewing distance, reading as much fainter/patchier brows
      // than intended.
      if (mat.map && !transparent) {
        mat.map.minFilter = THREE.LinearFilter;
        mat.map.generateMipmaps = false;
        mat.map.needsUpdate = true;
      }
      // The "red eye socket" bug (a red patch flashing over the iris at
      // certain angles) turned out to be the fitted eyeball z-fighting with
      // the eye socket surface underneath it - the two sit fractions of a
      // millimeter apart, so which one wins the depth test flips with
      // viewing angle, and whichever loses shows through instead of the
      // iris. A units-only polygonOffset bias was tried here to force the
      // eyeball to reliably win that tiebreak - it fixed the socket flash,
      // but a strong enough bias to work at grazing/profile angles also
      // pushed the eyeball noticeably forward at straight-on angles,
      // reading as a wide, lidless, "startled" look. Reverted in favor of
      // the actual fix: the eye socket's OWN texture region (part of the
      // body skin texture, not this mesh) had a leftover reddish patch -
      // see 02_generate_body.py / the noeyes skin texture - that's what
      // made losing the z-fight so visually jarring in the first place.
      // With that patch neutralized to a plain skin tone, losing the
      // tiebreak now reads as an unremarkable, barely-visible texture
      // seam instead of a red flash, so no client-side depth trick is
      // needed at all.
      if (transparent) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.alphaTest = 0.3;
      } else {
        // The source .mhmat for these assets (eyes in particular) ships
        // with "transparent True", which Blender's glTF export carries
        // over as alphaMode=BLEND. Three's GLTFLoader then sets
        // material.transparent = true on import. Real alpha blending here
        // is wrong either way it's left: BLEND makes the whole eyeball
        // read as a washed-out, semi-see-through grey disc (sort-order
        // artifacts), while forcing transparent=false and alphaTest=0
        // (ignoring alpha entirely) turned out just as wrong for the
        // high-poly asset - its texture has genuinely fully-transparent
        // padding regions around the two eye photos with leftover garbage
        // RGB baked into them (a common PNG-export artifact - color in
        // fully-transparent pixels is usually undefined), and with alpha
        // ignored, any UV sample that lands in that padding renders as a
        // flat pale blue-grey instead of being discarded. alphaTest with a
        // real cutoff fixes both: it's MASK behavior (cheap, depth-correct,
        // no blend sort-order issues) that discards the transparent
        // padding instead of showing its garbage color, while anything
        // with real alpha (the actual eye photos) still renders solid.
        // Keep the eye texture visible: a cutoff of 0.5 is too aggressive for
        // the exported MakeHuman eye PNG, which uses soft alpha in the padded
        // regions; it discards too much of the actual eye and makes the mesh
        // disappear. The transparent padding is still removed, but the real eye
        // pixels remain visible.
        mat.transparent = false;
        mat.depthWrite = true;
        mat.alphaTest = 0.02;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = 1;
        mat.polygonOffsetUnits = 1;
      }
    });
  }, [scene, transparent]);

  const attachedRef = useRef<{ scene: THREE.Object3D; head: THREE.Object3D } | null>(null);

  // Attach the eye as a direct child of the head bone. The eye's local
  // transform will be preserved, so it sits at its MHCLO-fitted position
  // relative to the head.
  useFrame(() => {
    if (!headBone) return;
    const current = attachedRef.current;
    if (current && current.scene === scene && current.head === headBone) return;

    // Remove from old parent
    scene.parent?.remove(scene);
    // Add as child of head
    headBone.add(scene);
    attachedRef.current = { scene, head: headBone };
  });

  // Cleanup
  useEffect(() => {
    return () => {
      scene.parent?.remove(scene);
      if (attachedRef.current?.scene === scene) attachedRef.current = null;
    };
  }, [scene]);

  return null;
}

