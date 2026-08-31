import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarContext } from './AvatarContext';

/**
 * Procedural "waiting" idle: a weight-shifting stance, relaxed arms/hands
 * with the occasional small gesture, breathing, and blinking. The stance/
 * arms/breathing part is ported from the sibling Innerspace project's
 * src/components/avatarAnimation.tsx (NaturalIdleController / RelaxedArm-
 * Pose / Breathing), which targets the same MPFB "default" rig our MPFB2-
 * generated body/outfits use, including bone names: even though the source
 * .blend/.mhclo files carry a dotted `upperarm01.L`, three.js's GLTFLoader
 * strips the dot on import (sanitizeNodeName, since a literal `.` would
 * collide with AnimationClip's dot-separated track-path syntax) - so at
 * runtime both projects' rigs expose the same bare `upperarm01L` form. The
 * spring-physics and timing constants there are otherwise unchanged from
 * the source.
 *
 * Blinking is new here, not ported directly: that project's AutoBlink
 * drives an `eye-left-closure`/`eye-right-closure` morph target - our own
 * body.glb didn't bake one at first, so blinking here started out rotating
 * the `orbicularis03/04` eyelid-muscle bones instead. That never looked
 * right (no rotation axis/sign made the lids visibly close rather than
 * widen mid-blink), so pipeline/scripts/02_generate_body.py now bakes the
 * same `eye_left_closure`/`eye_right_closure` MakeHuman expression targets
 * as real morph targets and blinking drives those directly - a proper mesh
 * deformation instead of posing bones to fake one. SpeakingArmGesture/
 * ExpressionFace/AutoBlink's cursor-tracking sibling were tied to that
 * project's speech feature and aren't ported at all.
 */

type SpringMotion = { value: number; velocity: number };

function springStep(motion: SpringMotion, target: number, delta: number, frequency: number, damping: number) {
  const acceleration = (target - motion.value) * frequency * frequency - 2 * damping * frequency * motion.velocity;
  motion.velocity += acceleration * delta;
  motion.value += motion.velocity * delta;
}

// Module-level, not a component ref: useGLTF's Suspense cache hands back
// the SAME scene object across an AvatarToolPage unmount/remount (e.g. navigating
// to another page and back) - the glTF is never refetched or reset. A
// per-component ref would start a fresh, empty rest-capture on every
// remount and re-"capture" whatever pose the bones were LAST left in
// (mid weight-shift, mid blink...) as the new baseline, then layer this
// frame's rotation on top of that already-posed state - compounding every
// time, which is exactly what put the arms behind the back and the eyelids
// stuck wide open after a page switch. Keyed on the scene object itself, so
// it naturally captures once, ever, per (scene, bone) pair and lets the
// WeakMap garbage-collect if that scene is ever actually discarded.
const restMap = new WeakMap<THREE.Object3D, Map<string, THREE.Quaternion>>();
const restChestState = new WeakMap<THREE.Object3D, { quaternion: THREE.Quaternion; position: THREE.Vector3 }>();

// Lazily captures each bone's rest quaternion the first time it's seen (the
// glTF bind pose, since nothing poses these scenes before this runs) and
// applies the same rest-relative rotation across every registered scene, so
// a garment's sleeve tracks the arm underneath instead of lagging behind.
function applyRel(
  scenes: Iterable<THREE.Object3D>,
  restMap: WeakMap<THREE.Object3D, Map<string, THREE.Quaternion>>,
  name: string,
  x: number,
  y: number,
  z: number,
) {
  const rel = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  for (const scene of scenes) {
    const bone = scene.getObjectByName(name);
    if (!bone) continue;
    let rests = restMap.get(scene);
    if (!rests) {
      rests = new Map();
      restMap.set(scene, rests);
    }
    let rest = rests.get(name);
    if (!rest) {
      rest = bone.quaternion.clone();
      rests.set(name, rest);
    }
    bone.quaternion.copy(rest).multiply(rel);
  }
}

// Meshes that carry morph targets, cached per scene the first time they're
// looked up (called every frame for blinking, unlike bodyMorphs.ts's own
// version of this traversal which only runs when a slider changes).
const morphMeshCache = new WeakMap<THREE.Object3D, THREE.Mesh[]>();

// Sets a named morph target's influence (0..1) on every mesh in every
// registered scene that actually has it - the body glb is split into
// several primitives by material and each one carries its own copy of the
// same morph targets.
function applyMorphInfluence(scenes: Iterable<THREE.Object3D>, name: string, value: number) {
  for (const scene of scenes) {
    let meshes = morphMeshCache.get(scene);
    if (!meshes) {
      meshes = [];
      scene.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) meshes!.push(mesh);
      });
      morphMeshCache.set(scene, meshes);
    }
    for (const mesh of meshes) {
      const idx = mesh.morphTargetDictionary![name];
      if (idx !== undefined) mesh.morphTargetInfluences![idx] = value;
    }
  }
}

const LEG_WEIGHT_SHIFT_BONES = {
  upperlegL: 'upperleg01L',
  upperlegR: 'upperleg01R',
  lowerlegL: 'lowerleg01L',
  lowerlegR: 'lowerleg01R',
  footL: 'footL',
  footR: 'footR',
} as const;

const FINGER_RELAX_DEGREES: Record<number, [number, number, number]> = {
  2: [5, 3, 2],
  3: [7, 4, 2],
  4: [8, 5, 3],
  5: [10, 6, 4],
};

const FINGER_CURL_BONES: { name: string; degrees: [number, number, number] }[] = (['L', 'R'] as const).flatMap((side) =>
  [2, 3, 4, 5].flatMap((finger) =>
    FINGER_RELAX_DEGREES[finger].map((curl, segmentIndex) => ({
      name: `finger${finger}-${segmentIndex + 1}${side}`,
      degrees: [
        curl + (side === 'R' ? 2 : 0),
        0,
        segmentIndex === 0
          ? (side === 'L' ? 1 : -1) * ({ 2: -3, 3: -1, 4: 0.8, 5: 2.5 }[finger] ?? 0)
          : 0,
      ] as [number, number, number],
    })),
  ),
);

const RELAXED_ARM_BONES: { name: string; degrees: [number, number, number] }[] = [
  { name: 'upperarm01L', degrees: [-1, 4, -34] },
  { name: 'upperarm01R', degrees: [-1.5, -5, 32] },
  { name: 'lowerarm01L', degrees: [-29, 0, -0.5] },
  { name: 'lowerarm01R', degrees: [-28.5, 0, 0.8] },
  { name: 'wristL', degrees: [0.4, 1, -0.3] },
  { name: 'wristR', degrees: [0.5, -1.5, 0.3] },
  { name: 'finger1-1L', degrees: [5, 0, -9] },
  { name: 'finger1-2L', degrees: [4, 0, 0] },
  { name: 'finger1-1R', degrees: [7, 0, 11] },
  { name: 'finger1-2R', degrees: [5, 0, 0] },
  { name: 'metacarpal1L', degrees: [0, 0, -9] },
  { name: 'metacarpal2L', degrees: [0, 0, -3] },
  { name: 'metacarpal3L', degrees: [0, 0, 2] },
  { name: 'metacarpal4L', degrees: [0, 0, 7] },
  { name: 'metacarpal1R', degrees: [0, 0, 9] },
  { name: 'metacarpal2R', degrees: [0, 0, 3] },
  { name: 'metacarpal3R', degrees: [0, 0, -2] },
  { name: 'metacarpal4R', degrees: [0, 0, -7] },
  ...FINGER_CURL_BONES,
];

const REST_CAPTURE_BONE_NAMES: string[] = [
  'root', 'spine01', 'spine03',
  ...Object.values(LEG_WEIGHT_SHIFT_BONES),
  ...RELAXED_ARM_BONES.map((b) => b.name),
];

/**
 * Snapshots every bone this module ever rotates, for one newly-registered
 * scene, synchronously - called from Body.tsx/OutfitPiece.tsx's own mount
 * effect, so it runs before that scene has been through a single animation
 * frame. applyRel's lazy "capture on first use" was the same idea but timed
 * to whichever frame happened to first touch a given bone. That was the
 * original home of the eyelid-muscle bones this module used to pose for
 * blinking - only touched during an actual blink, so their "rest" could get
 * lazily captured mid-blink rather than at the true bind pose, if a blink's
 * timing happened to line up with a bone's first-ever touch. Blinking has
 * since moved to a real `eye_left_closure`/`eye_right_closure` morph target
 * (see the blinking block below), which sidesteps that failure mode
 * entirely - but priming every OTHER bone here eagerly, before animation
 * starts, is still worth keeping: it removes the same class of timing
 * dependency for anything future code adds to this list.
 */
export function primeIdleAnimationRestPose(scene: THREE.Object3D) {
  let rests = restMap.get(scene);
  if (!rests) {
    rests = new Map();
    restMap.set(scene, rests);
  }
  for (const name of REST_CAPTURE_BONE_NAMES) {
    if (rests.has(name)) continue;
    const bone = scene.getObjectByName(name);
    if (bone) rests.set(name, bone.quaternion.clone());
  }
  if (!restChestState.has(scene)) {
    const chestBone = scene.getObjectByName('spine02');
    if (chestBone) {
      restChestState.set(scene, { quaternion: chestBone.quaternion.clone(), position: chestBone.position.clone() });
    }
  }
}

export function IdleAnimation({ weight, butt, legs }: { weight: number; butt: number; legs: number }) {
  const { posableScenes } = useAvatarContext();

  // --- weight-shifting stance (hips/knees/spine) ---
  const targetSupport = useRef(-1);
  const previousSupport = useRef(-1);
  const sidePosesSinceCenter = useRef(1);
  const nextShiftAt = useRef(12 + Math.random() * 6);
  const stanceElapsed = useRef(0);
  const hips = useRef<SpringMotion>({ value: -1, velocity: 0 });
  const knees = useRef<SpringMotion>({ value: -1, velocity: 0 });

  // --- relaxed arms/hands + occasional idle gesture ---
  const armElapsed = useRef(0);
  const leftArm = useRef<SpringMotion>({ value: -0.25, velocity: 0 });
  const rightArm = useRef<SpringMotion>({ value: 0.35, velocity: 0 });
  const leftArmTarget = useRef(-0.25);
  const rightArmTarget = useRef(0.35);
  const leftWrist = useRef<SpringMotion>({ value: -0.15, velocity: 0 });
  const rightWrist = useRef<SpringMotion>({ value: 0.2, velocity: 0 });
  const nextLeftArmMove = useRef(1.8 + Math.random() * 2.2);
  const nextRightArmMove = useRef(2.4 + Math.random() * 2.5);
  const leftFingers = useRef<SpringMotion>({ value: 0.35, velocity: 0 });
  const rightFingers = useRef<SpringMotion>({ value: 0.65, velocity: 0 });
  const leftFingerTarget = useRef(0.35);
  const rightFingerTarget = useRef(0.65);
  const nextLeftFingerMove = useRef(1.2 + Math.random() * 2.2);
  const nextRightFingerMove = useRef(1.8 + Math.random() * 2.4);
  const scratchSide = useRef<'L' | 'R' | null>(null);
  const scratchStartedAt = useRef(0);
  const scratchEndsAt = useRef(0);
  const nextScratchAt = useRef(38 + Math.random() * 4);

  useFrame(({ clock }, frameDelta) => {
    const scenes = posableScenes;
    if (scenes.size === 0) return;
    const delta = Math.min(frameDelta, 1 / 30);

    // Weight shift
    stanceElapsed.current += delta;
    if (stanceElapsed.current >= nextShiftAt.current) {
      let next: number;
      if (previousSupport.current === 0) {
        next = Math.random() < 0.5 ? -1 : 1;
        sidePosesSinceCenter.current = 1;
      } else if (sidePosesSinceCenter.current >= 2 || Math.random() < 0.34) {
        next = 0;
        sidePosesSinceCenter.current = 0;
      } else {
        next = -previousSupport.current;
        sidePosesSinceCenter.current += 1;
      }
      previousSupport.current = next;
      targetSupport.current = next;
      nextShiftAt.current = stanceElapsed.current + (next === 0 ? 5 + Math.random() * 3 : 12 + Math.random() * 8);
    }
    springStep(hips.current, targetSupport.current, delta, 2.8, 0.96);
    springStep(knees.current, targetSupport.current, delta, 4.8, 0.86);
    const hip = hips.current.value;
    const kneeSupport = knees.current.value;
    const transferSpeed = THREE.MathUtils.clamp(Math.abs(hips.current.velocity) / 2.5, 0, 1);
    const kneeBendL = THREE.MathUtils.degToRad(0.2 + Math.max(0, kneeSupport) * 9.8 + transferSpeed * 0.35);
    const kneeBendR = THREE.MathUtils.degToRad(0.2 + Math.max(0, -kneeSupport) * 9.8 + transferSpeed * 0.35);
    const supportedSway = Math.abs(hip) * (
      Math.sin(stanceElapsed.current * 0.82 + 0.4) * 0.15 +
      Math.sin(stanceElapsed.current * 1.37 + 2.1) * 0.055
    );
    const postureDrift =
      Math.sin(stanceElapsed.current * 0.38 + 0.9) * 0.11 +
      Math.sin(stanceElapsed.current * 0.67 + 2.4) * 0.045;

    applyRel(scenes, restMap, 'root', THREE.MathUtils.degToRad(transferSpeed * 0.03 + supportedSway * 0.35), 0, 0);
    applyRel(
      scenes, restMap, 'spine03',
      THREE.MathUtils.degToRad(0.75 - transferSpeed * 0.05 + supportedSway * 0.85 + postureDrift), 0, 0,
    );
    applyRel(
      scenes, restMap, 'spine01',
      THREE.MathUtils.degToRad(0.35 - transferSpeed * 0.1 + supportedSway * 0.55 + postureDrift * 0.55), 0, 0,
    );
    applyRel(scenes, restMap, LEG_WEIGHT_SHIFT_BONES.upperlegL, -kneeBendL * 0.46, 0, THREE.MathUtils.degToRad(4.5));
    applyRel(scenes, restMap, LEG_WEIGHT_SHIFT_BONES.lowerlegL, kneeBendL, 0, 0);
    applyRel(scenes, restMap, LEG_WEIGHT_SHIFT_BONES.footL, -kneeBendL * 0.54, 0, 0);
    applyRel(scenes, restMap, LEG_WEIGHT_SHIFT_BONES.upperlegR, -kneeBendR * 0.46, 0, THREE.MathUtils.degToRad(-4.5));
    applyRel(scenes, restMap, LEG_WEIGHT_SHIFT_BONES.lowerlegR, kneeBendR, 0, 0);
    applyRel(scenes, restMap, LEG_WEIGHT_SHIFT_BONES.footR, -kneeBendR * 0.54, 0, 0);

    // Relaxed arms/hands
    armElapsed.current += delta;
    if (armElapsed.current >= nextLeftArmMove.current && scratchSide.current !== 'L') {
      leftArmTarget.current = -3.5 + Math.random() * 3;
      nextLeftArmMove.current = armElapsed.current + 2 + Math.random() * 2;
    }
    if (armElapsed.current >= nextRightArmMove.current && scratchSide.current !== 'R') {
      rightArmTarget.current = -3.5 + Math.random() * 3;
      nextRightArmMove.current = armElapsed.current + 2.2 + Math.random() * 2.1;
    }
    if (armElapsed.current >= nextLeftFingerMove.current) {
      leftFingerTarget.current = 0.15 + Math.random() * 0.85;
      nextLeftFingerMove.current = armElapsed.current + 0.9 + Math.random() * 2;
    }
    if (armElapsed.current >= nextRightFingerMove.current) {
      rightFingerTarget.current = 0.15 + Math.random() * 0.85;
      nextRightFingerMove.current = armElapsed.current + 1 + Math.random() * 2.2;
    }

    springStep(leftArm.current, leftArmTarget.current, delta, 2.6, 0.98);
    springStep(rightArm.current, rightArmTarget.current, delta, 2.45, 0.98);
    springStep(leftWrist.current, leftArm.current.value, delta, 2, 0.98);
    springStep(rightWrist.current, rightArm.current.value, delta, 1.85, 0.98);
    springStep(leftFingers.current, leftFingerTarget.current, delta, 3, 1);
    springStep(rightFingers.current, rightFingerTarget.current, delta, 2.7, 1);

    if (!scratchSide.current && armElapsed.current >= nextScratchAt.current) {
      const candidates: ('L' | 'R')[] = [];
      if (Math.abs(leftArm.current.value + 1.1) < 0.55) candidates.push('L');
      if (Math.abs(rightArm.current.value + 1.1) < 0.55) candidates.push('R');
      if (candidates.length) {
        const side = candidates[Math.floor(Math.random() * candidates.length)];
        scratchSide.current = side;
        scratchStartedAt.current = armElapsed.current;
        scratchEndsAt.current = armElapsed.current + 1.8 + Math.random() * 0.8;
        if (side === 'L') {
          leftArmTarget.current = -1.1;
          leftArm.current.velocity *= 0.45;
        } else {
          rightArmTarget.current = -1.1;
          rightArm.current.velocity *= 0.45;
        }
      }
    } else if (scratchSide.current && armElapsed.current >= scratchEndsAt.current) {
      scratchSide.current = null;
      nextScratchAt.current = armElapsed.current + 38 + Math.random() * 4;
    }

    const scratchDuration = Math.max(0.001, scratchEndsAt.current - scratchStartedAt.current);
    const scratchProgress = THREE.MathUtils.clamp((armElapsed.current - scratchStartedAt.current) / scratchDuration, 0, 1);
    const scratchEnvelope = scratchSide.current
      ? Math.min(
          THREE.MathUtils.smoothstep(scratchProgress, 0, 0.2),
          1 - THREE.MathUtils.smoothstep(scratchProgress, 0.78, 1),
        )
      : 0;
    const scratchContact = scratchSide.current
      ? Math.min(
          THREE.MathUtils.smoothstep(scratchProgress, 0.22, 0.36),
          1 - THREE.MathUtils.smoothstep(scratchProgress, 0.78, 0.94),
        )
      : 0;
    const scratchStroke = Math.sin((armElapsed.current - scratchStartedAt.current) * 15);
    // As the hips/thighs widen (weight, butt, or legs), the relaxed-arm
    // baseline alone isn't enough clearance and the hands/wrists start
    // clipping into them - swing the whole arm further out from the
    // shoulder to compensate. Each only kicks in above its own default,
    // never pulls the arms in tighter for a smaller body.
    const bodyClearance = Math.max(0, weight) * 12 + Math.max(0, butt) * 8 + Math.max(0, legs) * 5;

    RELAXED_ARM_BONES.forEach(({ name, degrees }) => {
      let [x, y, z] = degrees;
      const isLeft = name.endsWith('L');
      const isScratchingHand = scratchSide.current === (isLeft ? 'L' : 'R');
      const scratch = isScratchingHand ? scratchEnvelope : 0;
      const scratchGrip = (isScratchingHand ? scratchContact : 0) * (0.7 + (scratchStroke * 0.5 + 0.5) * 0.3);
      const armMotion = isLeft ? leftArm.current.value : rightArm.current.value;

      if (name.startsWith('upperarm01')) {
        x += armMotion * 1.4;
        y += armMotion * 0.14;
        z += scratch * (isLeft ? -0.85 : 0.85);
        z += bodyClearance * (isLeft ? 1 : -1);
        x -= scratch * 1.5;
      } else if (name.startsWith('lowerarm01')) {
        x += (armMotion + 3.5) * 2.5;
        x -= scratch * (3.2 - scratchStroke * 0.25);
        z += scratch * (isLeft ? -0.65 : 0.65);
      } else if (name.startsWith('wrist')) {
        const wristMotion = isLeft ? leftWrist.current.value : rightWrist.current.value;
        x += wristMotion * 0.35;
        z += wristMotion * (isLeft ? -0.1 : 0.1);
        y += scratch * (isLeft ? -5.5 : 5.5);
        x += scratch * scratchStroke * 0.3;
      } else if (name.startsWith('metacarpal')) {
        z *= 0.9 + scratch * 0.25;
      } else if (name.startsWith('finger1-')) {
        const thumbSegment = Number(name[8]);
        x += scratchGrip * (thumbSegment === 1 ? 14 : 9);
        z += scratchGrip * (isLeft ? 3 : -3);
      } else if (name.startsWith('finger') && !name.startsWith('finger1-')) {
        const fingerNumber = Number(name[6]);
        const segmentNumber = Number(name[8]);
        const fingerMotion = isLeft ? leftFingers.current.value : rightFingers.current.value;
        const armGather = THREE.MathUtils.clamp((armMotion + 3.5) / 3, 0, 1);
        const segmentInfluence = ({ 1: 1, 2: 0.72, 3: 0.5 }[segmentNumber] ?? 0.5);
        const fingerMicro = Math.sin(
          armElapsed.current * (0.72 + fingerNumber * 0.11) + fingerNumber * 1.63 + (isLeft ? 0 : 1.15),
        ) * 0.5;
        x += fingerMotion * (1.4 + (fingerNumber - 2) * 0.6) * segmentInfluence;
        x += fingerMicro * segmentInfluence;
        x += scratchGrip * ({ 1: 26, 2: 32, 3: 22 }[segmentNumber] ?? 22);
        x += (armGather - 0.5) * ({ 1: 3, 2: 2, 3: 1.2 }[segmentNumber] ?? 0);
        if (segmentNumber === 1) {
          z *= 0.62 + armGather * 0.56;
          z *= 1 + scratch * 0.55;
        }
      }

      applyRel(scenes, restMap, name, THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z));
    });

    // Breathing - spine02 is the chest's skinning root in this rig. Only a
    // position bob, no rotational tilt: a tilt here (tried up to 6°) leaks
    // through the spine03/neck03/head chain and rotates the eyes.glb asset
    // enough to expose its faceted low-poly edges, which the face's
    // painted-on eyeliner only camouflages from a near-exact frontal angle
    // (see the blink comment below - blinking breaks the same illusion the
    // same way, which is why that's disabled too). A head-orientation
    // counter-rotation was tried to cancel the leak-through instead of
    // removing the tilt, but the face is a skinned mesh (not just the
    // rigid eyes) - stabilizing the 'head' bone's own world orientation
    // didn't stabilize the skin deformation around the eye socket, so the
    // mismatch stayed. Cutting the tilt at the source is what actually
    // fixed it.
    const t = clock.getElapsedTime();
    const cycle = (t % 4.8) / 4.8;
    const breathe = cycle < 0.32
      ? THREE.MathUtils.smoothstep(cycle, 0, 0.32)
      : 1 - THREE.MathUtils.smoothstep(cycle, 0.32, 1);
    for (const scene of scenes) {
      const chestBone = scene.getObjectByName('spine02');
      if (!chestBone) continue;
      let restChest = restChestState.get(scene);
      if (!restChest) {
        restChest = { quaternion: chestBone.quaternion.clone(), position: chestBone.position.clone() };
        restChestState.set(scene, restChest);
      }
      chestBone.quaternion.copy(restChest.quaternion);
      chestBone.position.copy(restChest.position);
      chestBone.position.y += breathe * 0.016;
    }

    // No blinking: eye_left_closure/eye_right_closure stay at 0 (eyes fully
    // open) on purpose. The eyes.glb asset is a low-poly, faceted disc with
    // no real eyelid geometry of its own - the painted eyeliner on the
    // face skin only camouflages its edges when the eye is fully open. Any
    // partial closure (blinking) exposes the bare grey facets underneath,
    // which reads as a broken, googly-eyed look rather than a blink. A
    // proper fix would need a better eye asset with real eyelid coverage;
    // until then, not blinking looks far better than blinking badly.
    applyMorphInfluence(scenes, 'eye_left_closure', 0);
    applyMorphInfluence(scenes, 'eye_right_closure', 0);
  });

  return null;
}

/**
 * The T-pose bind stance read as stiff/robotic on the legacy comparison
 * page, which deliberately has no IdleAnimation (see AvatarSceneLegacy.tsx).
 * This applies the same RELAXED_ARM_BONES baseline IdleAnimation uses -
 * elbows bent, hands relaxed, arms swung further out as weight/butt/legs
 * grow so the hands clear a wider body - but only re-poses when those
 * values actually change (or the first time the posable scenes are
 * populated), instead of every frame with springs/breathing/gestures
 * layered on top. A useFrame guarded by a ref (rather than a plain
 * useEffect) is what IdleAnimation itself relies on for "scenes are
 * registered by now" - Body/OutfitPiece register themselves in their own
 * effects, whose relative order isn't guaranteed, but the render loop
 * always runs after every effect for that frame has settled.
 */
export function StaticRelaxedPose({ weight, butt, legs }: { weight: number; butt: number; legs: number }) {
  const { posableScenes } = useAvatarContext();
  const lastApplied = useRef<{ weight: number; butt: number; legs: number } | null>(null);

  useFrame(() => {
    if (posableScenes.size === 0) return;
    const last = lastApplied.current;
    if (last && last.weight === weight && last.butt === butt && last.legs === legs) return;
    // A flat 4deg baseline, not just the weight/butt/legs-scaled term below -
    // even at every slider at 0 the relaxed hand still sinks its fingers
    // into the hip/thigh fabric, since RELAXED_ARM_BONES was tuned for the
    // animated page's own base body shape, slightly slimmer at the hip than
    // this legacy body.
    const bodyClearance = 4 + Math.max(0, weight) * 12 + Math.max(0, butt) * 8 + Math.max(0, legs) * 5;
    RELAXED_ARM_BONES.forEach(({ name, degrees }) => {
      let [x, y, z] = degrees;
      if (name.startsWith('upperarm01')) {
        z += bodyClearance * (name.endsWith('L') ? 1 : -1);
      }
      applyRel(posableScenes, restMap, name, THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z));
    });
    lastApplied.current = { weight, butt, legs };
  });

  return null;
}
