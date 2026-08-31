import * as THREE from 'three';

/**
 * The body glb ships raw MakeHuman shape-key morph targets (see
 * pipeline/scripts/02_generate_body.py). Each UI slider drives one or more
 * raw targets together rather than mapping 1:1 - e.g. "weight" spreads
 * across torso, hip and limb girth targets at once, and "belly" also pulls
 * the waist/torso wider (not just forward) so a bigger belly reads as an
 * "apple" shape instead of a pregnancy silhouette. Every pair is a
 * decr/incr (or min/max) pair around the neutral average body, driven from
 * -1..1.
 */
export interface BodyMorphState {
  weight: number; // -1 (thinner) .. 1 (heavier) - overall quick control
  belly: number; // -1 (flatter/toned) .. 1 (rounder - "apple" emphasis)
  breast: number; // -1 (smaller) .. 1 (larger)
  waist: number; // -1 (narrower) .. 1 (wider)
  arms: number; // -1 (slimmer) .. 1 (thicker)
  legs: number; // -1 (slimmer) .. 1 (thicker) - thighs
  butt: number; // -1 (smaller) .. 1 (bigger)
  face: number; // -1 (slimmer) .. 1 (fuller) - cheek volume
}

export const DEFAULT_BODY_MORPHS: BodyMorphState = {
  weight: 0,
  belly: 0,
  breast: 0,
  waist: 0,
  arms: 0,
  legs: 0,
  butt: 0,
  face: 0,
};

function applyPair(setter: (name: string, value: number) => void, base: string, signed: number) {
  const v = THREE.MathUtils.clamp(signed, -1, 1);
  setter(`${base}_incr`, Math.max(0, v));
  setter(`${base}_decr`, Math.max(0, -v));
}

/**
 * Applies a BodyMorphState to every mesh in the body scene. The exporter
 * splits the body into several primitives by material (skin, eyes socket
 * detail, etc.) - each one carries its own copy of the same morph targets,
 * so every mesh needs the influence set, not just the first one found.
 *
 * Several sliders can feed the same raw target (e.g. "weight" and "waist"
 * both touch weight_waist) - each `applyPair` call sums every contributor
 * for that target first, so they stack instead of overwriting each other,
 * then clamps once to -1..1.
 */
export function applyBodyMorphs(bodyRoot: THREE.Object3D, state: BodyMorphState) {
  const meshes: THREE.Mesh[] = [];
  bodyRoot.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      meshes.push(mesh);
    }
  });

  const setNamed = (name: string, value: number) => {
    for (const mesh of meshes) {
      const idx = mesh.morphTargetDictionary![name];
      if (idx === undefined) continue;
      mesh.morphTargetInfluences![idx] = value;
    }
  };

  applyPair(setNamed, 'weight_waist', state.weight + state.waist + state.belly * 0.45);
  // Hips and thighs are capped a bit under the raw 1.0 the other targets
  // allow - at the full combined weight+legs extreme, the hip-to-thigh
  // shape key creates a sharp pinch/crease right below the glutes instead
  // of a smooth curve. Softening just the top of this one pair's range
  // avoids that crease without touching how any other slider behaves.
  applyPair(setNamed, 'weight_hips', Math.min(state.weight, 0.85));
  applyPair(setNamed, 'weight_torso_horiz', state.weight + state.belly * 0.35);
  applyPair(setNamed, 'weight_torso_depth', state.weight + state.belly * 0.25);
  applyPair(setNamed, 'weight_arm', state.weight * 0.7 + state.arms);
  applyPair(setNamed, 'weight_thigh', Math.min(state.weight * 0.8 + state.legs, 0.85));

  applyPair(setNamed, 'belly', state.belly);
  applyPair(setNamed, 'belly_soft', state.belly * 0.6);

  setNamed('breast_bigger', Math.max(0, state.breast));
  setNamed('breast_smaller', Math.max(0, -state.breast));

  applyPair(setNamed, 'butt', state.butt);

  applyPair(setNamed, 'face_l', state.face);
  applyPair(setNamed, 'face_r', state.face);
}
