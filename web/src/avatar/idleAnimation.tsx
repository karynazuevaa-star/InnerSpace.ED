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
// SeatedPose's own per-scene "which way is this NPC facing" - computed
// once (the hip line it's derived from doesn't move once seated), then
// reused every frame by the activity animation loop instead of
// re-deriving it each time.
const seatedForwardCache = new WeakMap<THREE.Object3D, THREE.Vector3>();
// Per-scene spring state easing the head toward computeHeadTurnTarget's
// output - keeps a turn-change from snapping straight to the new target
// the instant the conversation clock ticks over (see the constants near
// ConversationConfig for why).
const headTurnSpring = new WeakMap<THREE.Object3D, { pitch: SpringMotion; yaw: SpringMotion }>();

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

// Same idea as applyRel - a rest-relative delta, recomputed fresh from
// REST every call rather than compounding onto whatever's already there -
// but for a delta expressed in WORLD space instead of the bone's own
// local axes. applyRel's plain local Euler works fine for a few-degree
// sway on a bone whose rest orientation is close to identity, but 'head'
// (like nearly everything else in this rig - see aimBoneAt's own comment
// on the legs) turned out to carry a large twist of its own: logging its
// rest quaternion directly showed a -20..-60deg tilt already baked into
// the local X axis, so a guessed local "yaw" ended up rotating around
// some skewed combination of world axes instead of a clean vertical turn
// - heads read as tipping/looking down instead of turning to face a
// tablemate (reported directly, with a screenshot). Converts the world
// delta into the bone's local space via the same parent-quaternion
// conjugation aimBoneAt uses for its own world-to-local step.
function applyRelWorld(
  scenes: Iterable<THREE.Object3D>,
  restMap: WeakMap<THREE.Object3D, Map<string, THREE.Quaternion>>,
  name: string,
  worldDeltaQuat: THREE.Quaternion,
) {
  for (const scene of scenes) {
    const bone = scene.getObjectByName(name);
    if (!bone || !bone.parent) continue;
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
    const parentWorldQuat = new THREE.Quaternion();
    bone.parent.getWorldQuaternion(parentWorldQuat);
    const localDelta = parentWorldQuat.clone().invert().multiply(worldDeltaQuat).multiply(parentWorldQuat);
    bone.quaternion.copy(localDelta).multiply(rest);
  }
}

// A local-frame `Euler(x,y,z)` delta (applyRel's rest*delta) is fine for
// the few-degree standing sway elsewhere in this file, but this rig's leg
// bones carry a large twist in their own rest orientation relative to
// their parent (confirmed directly: upperleg01L's rest quaternion is
// nowhere near identity) - a guessed "rotate N degrees about local X"
// spins around whatever oddly-tilted axis that bone's own X happens to be,
// not any anatomically meaningful direction. Tried compensating with a
// world/parent-frame axis instead (axisRotation * rest, not rest * delta) -
// better (recognizably bent knees instead of collapsed/prone), but still
// wrong on inspection: this bends only upperleg01/lowerleg01, the SHORT
// first segment of a two-segment thigh/shin (upperleg01+02,
// lowerleg01+02) - the same fixed-angle guess doesn't account for
// whatever twist upperleg02/lowerleg02 carry relative to THEIR parents,
// so the second segment doesn't reliably continue in the direction the
// first segment's rotation assumed, which is what threw entire shins out
// sideways/upward instead of settling under the character.
//
// This instead measures where the bone chain's own end point ACTUALLY is
// (in world space, in whatever pose it's currently in) and computes
// exactly the rotation that carries it to where it's supposed to be -
// self-correcting regardless of any bone's own twist, since it never
// assumes what "90 degrees" even means for this rig. `fromBoneName`
// (typically the same bone being rotated, e.g. upperleg01 - its own head
// is the pivot) and `endBoneName` (lowerleg01 for the hip, foot for the
// knee) give the two points the current direction is measured between;
// `desiredWorldDir` is the direction that segment should end up pointing.
function aimBoneAt(
  scene: THREE.Object3D,
  boneName: string,
  fromBoneName: string,
  endBoneName: string,
  desiredWorldDir: THREE.Vector3,
) {
  const bone = scene.getObjectByName(boneName);
  const fromBone = scene.getObjectByName(fromBoneName);
  const endBone = scene.getObjectByName(endBoneName);
  if (!bone || !fromBone || !endBone || !bone.parent) return;

  const fromPos = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  fromBone.getWorldPosition(fromPos);
  endBone.getWorldPosition(endPos);
  const currentDir = endPos.sub(fromPos).normalize();

  // Rotation, expressed in WORLD space, that carries the segment's current
  // direction to the desired one - independent of any bone's own local
  // axis conventions.
  const worldDelta = new THREE.Quaternion().setFromUnitVectors(currentDir, desiredWorldDir.clone().normalize());

  // Convert that world-space delta into `bone`'s LOCAL space: applying a
  // rotation in the world requires "un-rotating" by the parent's current
  // world orientation first, applying the delta, then "re-rotating" back -
  // the standard conjugation for moving a rotation between frames.
  const parentWorldQuat = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(parentWorldQuat);
  const localDelta = parentWorldQuat.clone().invert().multiply(worldDelta).multiply(parentWorldQuat);

  bone.quaternion.premultiply(localDelta);
  bone.updateMatrixWorld(true);
}

// Same idea as aimBoneAt, but for a specific WORLD point (a table's
// center, a prop in the character's own hand) rather than a fixed
// direction - used for activity poses (holding hands across a table,
// bringing a hand up to the face) where the target only makes sense as an
// actual place in the room, not an abstract "forward". Computes the
// direction from the bone's current position to that point, then reuses
// aimBoneAt's own world-to-local conversion.
function aimBoneAtPoint(
  scene: THREE.Object3D,
  boneName: string,
  fromBoneName: string,
  endBoneName: string,
  targetWorldPos: THREE.Vector3,
) {
  const fromBone = scene.getObjectByName(fromBoneName);
  if (!fromBone) return;
  const fromPos = new THREE.Vector3();
  fromBone.getWorldPosition(fromPos);
  const dir = targetWorldPos.clone().sub(fromPos);
  if (dir.lengthSq() < 1e-8) return;
  aimBoneAt(scene, boneName, fromBoneName, endBoneName, dir.normalize());
}

// Captured once per end-bone (the glTF bind-pose local position, since
// nothing else ever moves this bone's own position - only its rotation),
// reused by aimBoneAtPointExact below every time it runs so a per-frame
// caller always measures its "how far off am I" error from the same
// untouched baseline instead of compounding an already-patched position.
const reachRestPosition = new WeakMap<THREE.Object3D, THREE.Vector3>();

// aimBoneAtPoint only orients the segment toward a target - it never
// stretches it, so the hand lands wherever this character's own fixed
// forearm length happens to put it, short of (or past) the actual target.
// For two characters reaching for the same handhold spot from different
// distances, that means two hands that both point at the target but never
// actually meet (reported directly, with a screenshot: a visible gap
// between the reaching hands even after moving the shared target closer).
// This does the same direction-aim, then patches the END bone's own local
// position (in its parent's space) so its world position lands EXACTLY on
// target - a simple one-joint "stretchy" nudge, not a real IK solve.
//
// The correction is clamped to MAX_REACH_CORRECTION_METERS: moving a
// SKINNED bone's own local position doesn't just move the bone, it
// stretches the skin between it and its parent (the same mechanism a
// stretchy-IK rig relies on deliberately) - fine for a couple of
// centimeters of precision nudge, but a target genuinely out of reach
// (seats too far apart, an offset larger than the arm) turned the whole
// forearm into a visibly warped, elongated blob (reported directly, with
// a screenshot). Clamping means an out-of-reach target is approached but
// not forced - the real fix for those cases is moving the target/seating
// closer, not stretching harder.
const MAX_REACH_CORRECTION_METERS = 0.035;

function aimBoneAtPointExact(
  scene: THREE.Object3D,
  boneName: string,
  fromBoneName: string,
  endBoneName: string,
  targetWorldPos: THREE.Vector3,
) {
  aimBoneAtPoint(scene, boneName, fromBoneName, endBoneName, targetWorldPos);
  const endBone = scene.getObjectByName(endBoneName);
  if (!endBone || !endBone.parent) return;

  let rest = reachRestPosition.get(endBone);
  if (!rest) {
    rest = endBone.position.clone();
    reachRestPosition.set(endBone, rest);
  }
  endBone.position.copy(rest);
  endBone.updateMatrixWorld(true);
  const naturalPos = new THREE.Vector3();
  endBone.getWorldPosition(naturalPos);
  const worldError = targetWorldPos.clone().sub(naturalPos);
  if (worldError.length() > MAX_REACH_CORRECTION_METERS) {
    worldError.setLength(MAX_REACH_CORRECTION_METERS);
  }

  const parentWorldQuat = new THREE.Quaternion();
  endBone.parent.getWorldQuaternion(parentWorldQuat);
  const localError = worldError.applyQuaternion(parentWorldQuat.invert());
  endBone.position.copy(rest).add(localError);
  endBone.updateMatrixWorld(true);
}

// Rotates the WRIST bone itself (not the forearm) so the palm faces a
// given world direction - aimBoneAtPointExact only ever pointed the
// forearm at the target, leaving the wrist's own twist wherever the rig's
// rest pose happened to put it, which read as a stiff, spread-open hand
// rather than one resting flat on a table (reported directly, with a
// screenshot). Measures the hand's own current "palm normal" from three
// live points (wrist, thumb base, pinky base) rather than assuming what
// the wrist bone's local axes mean - this rig's bones have repeatedly
// turned out to carry unpredictable twists in their own rest orientation
// (see aimBoneAt's own comment above), so a guessed local rotation would
// have been just as likely to turn the palm the wrong way.
function aimPalmNormal(scene: THREE.Object3D, side: 'L' | 'R', desiredWorldNormal: THREE.Vector3) {
  const wrist = scene.getObjectByName(`wrist${side}`);
  const thumbBase = scene.getObjectByName(`finger1-1${side}`);
  const pinkyBase = scene.getObjectByName(`finger5-1${side}`);
  if (!wrist || !thumbBase || !pinkyBase || !wrist.parent) return;

  const wristPos = new THREE.Vector3();
  const thumbPos = new THREE.Vector3();
  const pinkyPos = new THREE.Vector3();
  wrist.getWorldPosition(wristPos);
  thumbBase.getWorldPosition(thumbPos);
  pinkyBase.getWorldPosition(pinkyPos);

  const acrossPalm = thumbPos.clone().sub(wristPos);
  const alongPalm = pinkyPos.clone().sub(wristPos);
  // The winding that puts the normal on the palm side for a right hand
  // puts it on the back-of-hand side for a left hand, since the two
  // hands mirror each other - flipped per side rather than guessed once.
  const currentNormal = side === 'R'
    ? new THREE.Vector3().crossVectors(acrossPalm, alongPalm).normalize()
    : new THREE.Vector3().crossVectors(alongPalm, acrossPalm).normalize();

  const worldDelta = new THREE.Quaternion().setFromUnitVectors(currentNormal, desiredWorldNormal.clone().normalize());
  const parentWorldQuat = new THREE.Quaternion();
  wrist.parent.getWorldQuaternion(parentWorldQuat);
  const localDelta = parentWorldQuat.clone().invert().multiply(worldDelta).multiply(parentWorldQuat);
  wrist.quaternion.premultiply(localDelta);
  wrist.updateMatrixWorld(true);
}

// A gentle, relaxed curl for a hand resting palm-down on a table - much
// lighter than EATING_GRIP_DEGREES's closed-fist curl (see the eating-hand
// loop below), since a resting hand isn't gripping anything, just settled
// with its fingers not held rigidly flat either. The first pass at this
// (18/14/10) read as too curled - closer to a soft fist than a hand
// simply laid flat on the table (reported directly, with a screenshot) -
// pulled back to a subtler bend.
const HANDHOLD_CURL_DEGREES: Record<number, number> = { 1: 7, 2: 5, 3: 3 };

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

// Hip pivot (upperleg01 head) sits at local Y~0.815 standing, measured
// directly off the rig's edit-bone rest positions (see git history for the
// measurement script/output) - thigh (upperleg01+02) is ~0.377m,
// shin (lowerleg01+02) ~0.379m. A seated pose bends the hip +90°
// (thigh swings from hanging straight down to horizontal-forward) and the
// knee an equal and opposite -90° (relative to the now-horizontal thigh,
// bringing the shin back to hanging straight down from the knee) - since
// these two deltas cancel, the ANKLE ends up at hip_height - shin_length,
// almost exactly back at its own standing height (measured ~0.068 either
// way, a ~2mm difference), and the foot needs no extra compensation to stay
// flat: the net rotation carried down the chain to it is back to zero.
// Only the knee moves forward by the thigh length, tucking the shins under
// the character as expected. To land the pelvis at a chair's seat height
// (0.45 in CafeEnvironment.tsx) without moving the ankle, the character's
// own group position needs to drop by (hip standing height - seat height)
// - see SEATED_HIP_DROP_METERS, applied in NpcAvatar.tsx, not here (this
// component only ever poses bones, never repositions the group).
const SEATED_LEG_BONES = {
  upperlegL: 'upperleg01L',
  upperlegR: 'upperleg01R',
  lowerlegL: 'lowerleg01L',
  lowerlegR: 'lowerleg01R',
} as const;

export const SEATED_HIP_DROP_METERS = 0.365;

const SEATED_ARM_BONES: { name: string; degrees: [number, number, number] }[] = [
  // Own baseline (not RELAXED_ARM_BONES's standing one - that swings the
  // upper arm out from the shoulder for hip clearance a seated pose with
  // hands in the lap doesn't need). Just the shoulder/upper-arm hang and a
  // small wrist tweak - the elbow bend itself is aimed at runtime (see
  // SeatedPose below), same as the legs: a guessed Euler delta here bent
  // the forearm down alongside the chair leg rather than forward onto the
  // thigh (reported directly - the hand read as tucked behind the hip
  // instead of resting in front of it), the same twisted-rest-frame issue
  // the legs already hit.
  { name: 'upperarm01L', degrees: [4, 6, -14] },
  { name: 'upperarm01R', degrees: [4, -6, 14] },
  { name: 'wristL', degrees: [-4, 2, 0] },
  { name: 'wristR', degrees: [-4, -2, 0] },
];

export type SeatedArmActivity = 'phone' | 'eating' | 'gesture';

export interface SeatedArmOverride {
  /** A named activity - computed at runtime relative to this character's
   * OWN current head position, so it works regardless of where the NPC
   * actually is (unlike `target`, which is one fixed spot in the room). */
  activity?: SeatedArmActivity;
  /** A fixed world-space point instead - for something that's genuinely
   * the same place for every character reaching for it, like the middle
   * of a shared table for a handhold pose. */
  target?: [number, number, number];
  /** Hold a fork in this hand too (see the fork-attachment block in
   * SeatedPose) even though it isn't the 'eating' activity - for a
   * `target` hand (a fixed table-resting point) that should still read as
   * holding something, like the couple at table1's non-handhold hand. */
  holdsFork?: boolean;
}

/**
 * Turns a static table of seated NPCs into something that reads as mid
 * conversation - deliberately head-only (see the turn-taking block in
 * SeatedPose below for why): every member of a table shares this same
 * `peers` list (their own world XZ seat positions, in a fixed order) and
 * each just needs to know which entry is their own. A shared, purely
 * time-based turn clock (no cross-NPC message-passing needed) then lets
 * every member independently agree on who's "speaking" this instant -
 * everyone else turns to look at that person (with an occasional gentle
 * nod), and the speaker themselves looks back at whoever they're
 * addressing too (people mostly hold eye contact while talking, not just
 * while listening - reported directly). `peers` only needs XZ: a seated
 * head sits directly above its own seat, and the look-at math here only
 * ever turns on the horizontal (yaw) axis.
 */
export interface ConversationConfig {
  peers: [number, number][];
  selfIndex: number;
}

// One speaking/listening/eating turn, in seconds - long enough that the
// rotation itself stays unnoticeable (requested directly: "растянуть
// каждую часть подольше, чтобы не было видно как сменяются"). Was 6s,
// which read fine for a plain two-way speak/listen switch but was too
// quick once a third role (eating) got layered on top of it.
const CONVERSATION_TURN_SECONDS = 15;
// Clamped so a peer seated at an awkward angle (nearly behind) doesn't
// spin the head to face fully backward - reads as "glancing toward" past
// this, which is about as far as a real seated turn comfortably goes.
const CONVERSATION_MAX_LOOK_DEGREES = 55;
// A gentle attentive nod, not a bob - the first pass (4deg, 2.6s) read as
// nodding too hard and too often (reported directly). Small amplitude,
// slow period.
const CONVERSATION_NOD_DEGREES = 1.5;
const CONVERSATION_NOD_PERIOD_SECONDS = 3.4;
const CONVERSATION_SPEAK_BOB_DEGREES = 1.2;
const CONVERSATION_SPEAK_BOB_PERIOD_SECONDS = 1.6;
// Periodic break in eye contact to glance down at the table/food instead
// of staring fixedly at whoever's speaking the entire time - reported
// directly ("смотрели то друг на друга - то на стол, типо на еду"),
// applies to speaker and listeners alike. One glance every ~5.5s, held for
// ~1.8s - short enough to read as a glance, not a stare into the plate.
// Staggered per seat (selfIndex) below so a table's members don't all
// glance down in lockstep.
const CONVERSATION_TABLE_GLANCE_PERIOD_SECONDS = 5.5;
const CONVERSATION_TABLE_GLANCE_DURATION_SECONDS = 1.8;
// Rotation is about `rightAxis = forward x worldUp`; for forward=(0,0,-1)
// that's +X, and rotating a horizontal forward vector around +X by a
// positive angle lifts its Y component (tilts the head UP) - so a
// downward glance at the table needs a NEGATIVE pitch. Verified against
// the standard X-axis rotation matrix (y'=y*cosθ-z*sinθ), not eyeballed.
const CONVERSATION_TABLE_LOOK_PITCH_DEGREES = -18;
// No jaw bone in this rig (see mouth_open's own comment in
// 02_generate_body.py), so a `mouth_open` mesh-deformation morph target
// stands in for jaw articulation while speaking. First pass (0.32s period,
// max 0.4, sin^1.5) read as too hard and too fast - opening sharply on
// every cycle - reported directly. Slowed down and softened: a longer
// period, a much lower ceiling, and a steeper power (sin^2.2) that spends
// most of the cycle near-closed with only a brief, gentle part rather than
// swinging wide every beat.
const CONVERSATION_MOUTH_TALK_PERIOD_SECONDS = 0.55;
const CONVERSATION_MOUTH_OPEN_MAX = 0.2;
// How briskly the head eases toward a new look target - low frequency,
// critically damped (no overshoot/wobble) so a turn-change reads as a
// smooth, unhurried glance instead of snapping instantly to face the new
// speaker the moment the turn clock ticks over (reported directly - the
// switch itself was too abrupt, independent of the nod).
const HEAD_TURN_SPRING_FREQUENCY = 1.7;
const HEAD_TURN_SPRING_DAMPING = 1;
// How quickly a hand's aim TARGET eases toward wherever the current role
// (or activity/pause) says it should be, per second - an exponential ease
// (1 - e^-rate*dt), not a snap to the new point the instant the role
// changes. Needed once the speak/listen/eat rotation below started moving
// a hand between very different places (gesturing near the chest, resting
// on the lap, reaching for a plate) - a direct target swap read as an
// instant jump (reported directly: "важно чтобы были плавные переходы").
// ~1s to mostly settle at this rate, well within the 15s a role now holds.
const ARM_TARGET_EASE_RATE = 2.2;
const armTargetSmoothState = new WeakMap<THREE.Object3D, Partial<Record<'L' | 'R', THREE.Vector3>>>();

/**
 * A third role layered on top of the plain speak/listen split above,
 * requested directly: "говорит - слушает - ест ... чередовать" (with a
 * worked example - a three-person table where the speaker, listener and
 * eater roles all rotate together every turn). Only meaningful with 3+
 * peers - there's no separate "third person" to eat at a table of two, so
 * those keep whatever static per-seat activity CafeScene.tsx already gives
 * them (table2/table4's eating or phone, switching to a gesture for their
 * own speaking turn - see isConversationSpeaker's other call site) instead
 * of this rotation.
 */
type ConversationRole = 'speak' | 'listen' | 'eat';

function computeConversationRole(conversation: ConversationConfig, t: number): ConversationRole {
  const { peers, selfIndex } = conversation;
  const n = peers.length;
  const speakerIndex = Math.floor(t / CONVERSATION_TURN_SECONDS) % n;
  if (n < 3) return selfIndex === speakerIndex ? 'speak' : 'listen';
  const offset = (selfIndex - speakerIndex + n) % n;
  if (offset === 0) return 'speak';
  if (offset === 1) return 'listen';
  return 'eat';
}

// Per-role hand TARGET for the 3-role rotation - reuses computeActivityTarget
// for 'speak' (gesture) and 'eat' (the same food-to-mouth cycle table2's
// static eaters use); 'listen' has no existing activity to borrow, so it
// reaches for the same head-relative point EATING_PLATE_OFFSET already
// describes (a hand set down near the plate/lap) rather than inventing a
// new offset - it's already tuned to look like a calmly-resting hand, not
// just food-specific.
function computeConversationArmTarget(
  scene: THREE.Object3D,
  forward: THREE.Vector3,
  role: ConversationRole,
  t: number,
): THREE.Vector3 | null {
  if (role === 'speak') return computeActivityTarget(scene, forward, 'gesture', t);
  if (role === 'eat') return computeActivityTarget(scene, forward, 'eating', t);
  const head = scene.getObjectByName('head');
  if (!head) return null;
  const headPos = new THREE.Vector3();
  head.getWorldPosition(headPos);
  const UP = new THREE.Vector3(0, 1, 0);
  return headPos
    .add(forward.clone().multiplyScalar(EATING_PLATE_OFFSET.forward))
    .add(UP.clone().multiplyScalar(EATING_PLATE_OFFSET.up));
}

// Offsets are forward/up from the character's own head position, in
// meters - tuned by eye against the rig's own proportions, not measured
// off anything. `forward` component brings the hand out in front of the
// body; the (usually negative) `up` component drops it to the right
// height for that activity. `phone`'s forward offset was reported as too
// small - the hand read as resting against the stomach instead of held up
// to look at - and increased accordingly.
const ARM_ACTIVITY_OFFSETS: Record<SeatedArmActivity, { forward: number; up: number }> = {
  phone: { forward: 0.24, up: -0.12 },
  eating: { forward: 0.14, up: -0.08 },
  // Was 0.34 forward - reached further than this rig's arm actually
  // spans, so even the clamped exact-reach correction couldn't close the
  // gap and the forearm read as visibly stretched/warped toward the
  // target (reported directly, with a screenshot of the mesh distorting
  // across the table). Pulled in to within natural reach.
  gesture: { forward: 0.22, up: -0.16 },
};

// The "low" end of the eating cycle - roughly table height, further out
// in front - alternates with ARM_ACTIVITY_OFFSETS.eating (the "at the
// mouth" end), so the hand actually travels food-to-mouth-and-back
// instead of freezing at the mouth.
const EATING_PLATE_OFFSET = { forward: 0.34, up: -0.56 };

// A slow, unevenly-paced bite cycle instead of a fast symmetric back-and-
// forth - reported directly that the hand moved too quickly and looked
// mechanical. Modeled as four named phases (lift to mouth, pause there
// while "chewing", lower to the plate, pause there before the next bite)
// rather than one continuous oscillation, so the motion visibly alternates
// between two held poses with real pauses instead of endlessly sweeping
// between them - the "something to swap to" a single faster cycle was
// missing.
const EATING_LIFT_SECONDS = 1.3;
const EATING_CHEW_SECONDS = 1.6;
const EATING_LOWER_SECONDS = 1.3;
const EATING_REST_SECONDS = 4.3;
const EATING_PERIOD_SECONDS =
  EATING_LIFT_SECONDS + EATING_CHEW_SECONDS + EATING_LOWER_SECONDS + EATING_REST_SECONDS;

// Small continuous motion for the other two activities - reported
// directly that a single frozen pose read as static/lifeless. Neither
// needs a real destination the way eating does, just a subtle live drift
// around the base pose: phone gets a small vertical bob (a thumb
// scrolling), gesture a slightly larger forward/back one (emphasis while
// talking).
const PHONE_BOB_METERS = 0.018;
const PHONE_BOB_PERIOD_SECONDS = 2.3;
const GESTURE_SWAY_METERS = 0.04;
const GESTURE_SWAY_PERIOD_SECONDS = 1.9;

function computeActivityTarget(
  scene: THREE.Object3D,
  forward: THREE.Vector3,
  activity: SeatedArmActivity,
  t: number,
) {
  const head = scene.getObjectByName('head');
  if (!head) return null;
  const headPos = new THREE.Vector3();
  head.getWorldPosition(headPos);
  const UP = new THREE.Vector3(0, 1, 0);

  if (activity === 'eating') {
    const mouth = ARM_ACTIVITY_OFFSETS.eating;
    const phase = t % EATING_PERIOD_SECONDS;
    let blend: number;
    if (phase < EATING_LIFT_SECONDS) {
      blend = THREE.MathUtils.smoothstep(phase / EATING_LIFT_SECONDS, 0, 1);
    } else if (phase < EATING_LIFT_SECONDS + EATING_CHEW_SECONDS) {
      blend = 1;
    } else if (phase < EATING_LIFT_SECONDS + EATING_CHEW_SECONDS + EATING_LOWER_SECONDS) {
      const lowerPhase = (phase - EATING_LIFT_SECONDS - EATING_CHEW_SECONDS) / EATING_LOWER_SECONDS;
      blend = 1 - THREE.MathUtils.smoothstep(lowerPhase, 0, 1);
    } else {
      blend = 0;
    }
    // A small wobble around the plate-rest position, faded out by (1 -
    // blend) as the hand lifts toward the mouth - reads as pushing food
    // around the plate between bites instead of the hand freezing dead
    // still whenever it isn't actively rising or falling (requested
    // directly - "as if sorting through the food with the fork").
    const stirFade = 1 - blend;
    const stirF = Math.sin(t / 0.85) * 0.03 * stirFade;
    const stirUp = Math.cos(t / 1.15) * 0.02 * stirFade;
    const f = THREE.MathUtils.lerp(EATING_PLATE_OFFSET.forward, mouth.forward, blend) + stirF;
    const up = THREE.MathUtils.lerp(EATING_PLATE_OFFSET.up, mouth.up, blend) + stirUp;
    return headPos.add(forward.clone().multiplyScalar(f)).add(UP.clone().multiplyScalar(up));
  }
  if (activity === 'phone') {
    const { forward: f, up } = ARM_ACTIVITY_OFFSETS.phone;
    const bob = Math.sin((t / PHONE_BOB_PERIOD_SECONDS) * Math.PI * 2) * PHONE_BOB_METERS;
    return headPos.add(forward.clone().multiplyScalar(f)).add(UP.clone().multiplyScalar(up + bob));
  }
  // gesture
  const { forward: f, up } = ARM_ACTIVITY_OFFSETS.gesture;
  const sway = Math.sin((t / GESTURE_SWAY_PERIOD_SECONDS) * Math.PI * 2) * GESTURE_SWAY_METERS;
  return headPos.add(forward.clone().multiplyScalar(f + sway)).add(UP.clone().multiplyScalar(up));
}

// Turns `conversation` (see its own comment above) into this frame's
// TARGET head pose (pitch, yaw) - a pure function of elapsed time, so
// every member of a table computes the same "who's speaking" answer
// independently without any shared mutable state. Only a target: the
// caller (SeatedPose) eases the actual bone toward this every frame with
// a critically-damped spring rather than snapping straight to it, so a
// turn-change reads as a smooth glance instead of an instant snap
// (reported directly).
function computeHeadTurnTarget(forward: THREE.Vector3, conversation: ConversationConfig, t: number): [number, number] {
  const { peers, selfIndex } = conversation;
  const speakerIndex = Math.floor(t / CONVERSATION_TURN_SECONDS) % peers.length;
  const isSpeaking = speakerIndex === selfIndex;

  // Who to look at: the speaker if listening, or - since people mostly
  // hold eye contact with who they're addressing while talking too, not
  // just while listening (reported directly) - whoever else is at the
  // table if it's this NPC's own turn to speak. A pair just looks at
  // each other either way; a trio's speaker looks toward the midpoint
  // between the other two rather than picking a side.
  let lookX: number;
  let lookZ: number;
  if (isSpeaking) {
    let sumX = 0;
    let sumZ = 0;
    let count = 0;
    peers.forEach(([px, pz], i) => {
      if (i === selfIndex) return;
      sumX += px;
      sumZ += pz;
      count += 1;
    });
    if (count === 0) return [0, 0];
    lookX = sumX / count;
    lookZ = sumZ / count;
  } else {
    [lookX, lookZ] = peers[speakerIndex];
  }

  const [selfX, selfZ] = peers[selfIndex];
  const dx = lookX - selfX;
  const dz = lookZ - selfZ;
  let yaw = 0;
  if (dx * dx + dz * dz > 1e-6) {
    const dir = new THREE.Vector3(dx, 0, dz).normalize();
    // Signed angle from `forward` to `dir` about the world Y axis - a
    // plain 2D atan2 in the horizontal plane, not a full aimBoneAt solve,
    // since this only ever needs a yaw (never leans the head toward a
    // peer). NOT the textbook 2D-cross atan2(fx*dz-fz*dx, dot) - checked
    // against Three.js's own +Y rotation matrix (x'=x*cosθ+z*sinθ,
    // z'=-x*sinθ+z*cosθ, e.g. +X rotates toward -Z under +90°): that
    // textbook formula measures the opposite rotational sense from
    // Three.js's actual +Y convention, so heads were turning away from
    // (or past, in the wrong direction from) whoever they should have
    // been looking at - reported directly, with screenshots of everyone
    // looking down/forward instead of at each other. This is the sign
    // that actually matches +Y.
    const cross = forward.z * dir.x - forward.x * dir.z;
    const dot = forward.x * dir.x + forward.z * dir.z;
    const maxYaw = THREE.MathUtils.degToRad(CONVERSATION_MAX_LOOK_DEGREES);
    yaw = THREE.MathUtils.clamp(Math.atan2(cross, dot), -maxYaw, maxYaw);
  }

  // A small head bob for "actively talking" while speaking (now paired
  // with real mouth movement - see computeMouthOpen - rather than standing
  // in for it alone); a much gentler nod for "attentive listening"
  // otherwise.
  const pitch = isSpeaking
    ? Math.sin((t / CONVERSATION_SPEAK_BOB_PERIOD_SECONDS) * Math.PI * 2) *
      THREE.MathUtils.degToRad(CONVERSATION_SPEAK_BOB_DEGREES)
    : Math.sin((t / CONVERSATION_NOD_PERIOD_SECONDS) * Math.PI * 2) *
      THREE.MathUtils.degToRad(CONVERSATION_NOD_DEGREES);

  // Overrides both of the above: whether speaking or listening, everyone
  // periodically breaks eye contact for a moment to glance down at their
  // own plate (straight ahead - the food is already directly in front of
  // a seated person, no yaw needed) instead of staying locked onto
  // whoever's speaking for the entire conversation.
  const glancePhase = (t + selfIndex * 1.9) % CONVERSATION_TABLE_GLANCE_PERIOD_SECONDS;
  if (glancePhase < CONVERSATION_TABLE_GLANCE_DURATION_SECONDS) {
    return [THREE.MathUtils.degToRad(CONVERSATION_TABLE_LOOK_PITCH_DEGREES), 0];
  }

  return [pitch, yaw];
}

// Same clock, computed independently by every seat (see ConversationConfig's
// own comment) - shared by the mouth-open pulse below and by SeatedPose's
// eating-activity pause, so a busy hand and an open mouth agree on whose
// turn it is without threading state between them.
function isConversationSpeaker(conversation: ConversationConfig, t: number): boolean {
  const { peers, selfIndex } = conversation;
  return Math.floor(t / CONVERSATION_TURN_SECONDS) % peers.length === selfIndex;
}

// Doesn't depend on `forward` (mouth movement isn't a world-space
// rotation) and is applied once per frame across all of an NPC's scenes
// via applyMorphInfluence, not per-scene like the head turn - see the
// SeatedPose call site.
function computeMouthOpen(conversation: ConversationConfig, t: number): number {
  if (!isConversationSpeaker(conversation, t)) return 0;
  const cycle = Math.max(0, Math.sin((t / CONVERSATION_MOUTH_TALK_PERIOD_SECONDS) * Math.PI * 2));
  return cycle ** 2.2 * CONVERSATION_MOUTH_OPEN_MAX;
}

// A held fork for the eating activity - plain low-poly primitives, same
// style as CafeEnvironment.tsx's own food props, not a new asset. Built
// once per hand the first time that hand's activity is 'eating', then
// left alone - it's parented directly onto the wrist bone (a plain
// THREE.Object3D child, not one of this file's own posed bones), so it
// automatically follows every subsequent frame's forearm re-aim for
// free, the same way a garment's sleeve already follows the arm
// underneath it without needing its own per-frame code.
const HELD_FORK_NAME = 'heldFork';

function buildForkProp(): THREE.Group {
  const group = new THREE.Group();
  group.name = HELD_FORK_NAME;
  const metal = new THREE.MeshStandardMaterial({ color: '#cfcfcf', roughness: 0.3, metalness: 0.7 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.1, 8), metal);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, -0.03);
  group.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.003, 0.035), metal);
  head.position.set(0, 0, 0.035);
  group.add(head);
  for (const dx of [-0.007, -0.0025, 0.0025, 0.007]) {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.026, 6), metal);
    prong.position.set(dx, 0, 0.062);
    group.add(prong);
  }
  return group;
}

// Recomputed every frame (see the SeatedPose call sites) rather than
// baked once at attach time - aimBoneAtPointExact's roll/twist around the
// aim direction isn't necessarily consistent across different target
// directions (eating vs gesture vs a fixed table point), so a fixed
// local offset baked from ONE sampled pose drifted out of alignment
// whenever the wrist later sat at a different roll than the moment it
// was sampled at - reported directly, with screenshots showing an
// inconsistent fork angle across different poses/tables even after
// changing WHICH pose got sampled a couple of times. Recomputing from the
// actual current wrist/gripFinger world positions every frame sidesteps
// the inconsistency entirely instead of chasing it with a better sample.
function updateHeldForkPose(scene: THREE.Object3D, side: 'L' | 'R') {
  const wrist = scene.getObjectByName(`wrist${side}`);
  const gripFinger = scene.getObjectByName(`finger3-1${side}`);
  const fork = wrist?.getObjectByName(HELD_FORK_NAME);
  if (!wrist || !gripFinger || !fork) return;

  const wristPos = new THREE.Vector3();
  const gripFingerPos = new THREE.Vector3();
  wrist.getWorldPosition(wristPos);
  gripFinger.getWorldPosition(gripFingerPos);
  const rawZAxis = gripFingerPos.clone().sub(wristPos).normalize();
  // A real grip's exit angle out of a closed fist is roughly constant
  // relative to the palm, however the arm itself happens to be angled -
  // but aligning the fork straight to raw wrist->knuckle tracks the ARM's
  // angle directly, so whenever the arm reached down toward a table-
  // height target (a plate, or a fixed on-table hand target) the fork
  // pointed almost straight down out of the fist, like a blade rather
  // than a held utensil ("как у россомахи" - like Wolverine's claws).
  // Damping the vertical component keeps the fork closer to a natural
  // forward-diagonal angle regardless of how steeply the arm is reaching.
  const zAxis = new THREE.Vector3(rawZAxis.x, rawZAxis.y * 0.35, rawZAxis.z).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const yAxis = worldUp.clone().sub(zAxis.clone().multiplyScalar(worldUp.dot(zAxis))).normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  const desiredWorldQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
  const wristWorldQuat = new THREE.Quaternion();
  wrist.getWorldQuaternion(wristWorldQuat);
  fork.quaternion.copy(wristWorldQuat.clone().invert().multiply(desiredWorldQuat));

  // Extends past the curled fingertips (not just to their base), so the
  // handle actually crosses through the closed grip instead of stopping
  // short of it - see the fork-attachment block's own comment for the
  // 0.14 tuning.
  const desiredWorldPos = wristPos.clone().add(zAxis.clone().multiplyScalar(0.14)).add(yAxis.clone().multiplyScalar(0.01));
  fork.position.copy(wrist.worldToLocal(desiredWorldPos));
}

/**
 * Static seated pose (legs bent into a chair, hands resting on the thighs)
 * plus the same breathing bob IdleAnimation uses - no weight-shift/arm-
 * gesture/finger-fidget layer, since those are all standing-specific
 * (built around a supporting-leg concept that doesn't apply once both legs
 * are already bent under a chair). Re-poses only when first mounted (the
 * bend angles are fixed), same guarded-useFrame pattern StaticRelaxedPose
 * uses for the same reason - no per-frame work needed for a pose that
 * never changes. `leftArm`/`rightArm` override that hand's default onto-
 * the-thigh rest with either a named activity or a fixed point to reach
 * for - see SeatedArmOverride. `conversation` (optional - solo NPCs like
 * table 3's don't get one) turns the head-only speak/listen system on -
 * see ConversationConfig and computeHeadTurnTarget.
 */
export function SeatedPose({
  leftArm,
  rightArm,
  conversation,
}: {
  leftArm?: SeatedArmOverride;
  rightArm?: SeatedArmOverride;
  conversation?: ConversationConfig;
}) {
  const { posableScenes } = useAvatarContext();
  const posed = useRef(false);

  useFrame(({ clock }, frameDelta) => {
    const scenes = posableScenes;
    if (scenes.size === 0) return;

    if (!posed.current) {
      const DOWN = new THREE.Vector3(0, -1, 0);
      for (const scene of scenes) {
        const hipL = scene.getObjectByName(SEATED_LEG_BONES.upperlegL);
        const hipR = scene.getObjectByName(SEATED_LEG_BONES.upperlegR);
        if (!hipL || !hipR) continue;
        // "Forward" derived from the character's own current hip-to-hip
        // line (perpendicular to it and to world up) instead of assumed
        // from some fixed model-space axis - self-correcting regardless of
        // which way this particular NPC's group is rotated to face.
        const hipLPos = new THREE.Vector3();
        const hipRPos = new THREE.Vector3();
        hipL.getWorldPosition(hipLPos);
        hipR.getWorldPosition(hipRPos);
        const sideways = hipRPos.clone().sub(hipLPos).normalize();
        // crossVectors(sideways, up) pointed the knees backward instead of
        // forward (reported directly, with screenshots - the torso leaning
        // forward to compensate for knees tucked behind was the tell) -
        // this is the other perpendicular horizontal direction from that
        // same pair of vectors.
        const forward = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sideways).normalize();
        seatedForwardCache.set(scene, forward);

        aimBoneAt(scene, SEATED_LEG_BONES.upperlegL, SEATED_LEG_BONES.upperlegL, SEATED_LEG_BONES.lowerlegL, forward);
        aimBoneAt(scene, SEATED_LEG_BONES.upperlegR, SEATED_LEG_BONES.upperlegR, SEATED_LEG_BONES.lowerlegR, forward);
        aimBoneAt(scene, SEATED_LEG_BONES.lowerlegL, SEATED_LEG_BONES.lowerlegL, 'footL', DOWN);
        aimBoneAt(scene, SEATED_LEG_BONES.lowerlegR, SEATED_LEG_BONES.lowerlegR, 'footR', DOWN);

        // Upper arm's baseline hang first (a small Euler delta - fine here,
        // this bone only ever needed a few degrees of adjustment, not a
        // full re-aim like the elbow below), then aim the forearm at a
        // forward-and-down target (onto the thigh) computed from the same
        // per-character forward direction the legs use, so it tracks
        // whichever way this NPC actually ended up facing.
        SEATED_ARM_BONES.forEach(({ name, degrees: [x, y, z] }) => {
          applyRel([scene], restMap, name, THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z));
        });
        const armForwardDown = forward.clone().add(DOWN.clone().multiplyScalar(0.4)).normalize();
        aimBoneAt(scene, 'lowerarm01L', 'lowerarm01L', 'wristL', armForwardDown);
        aimBoneAt(scene, 'lowerarm01R', 'lowerarm01R', 'wristR', armForwardDown);

        // A fixed-point override (the handhold) replaces that default
        // thigh-rest and never changes again, so it's applied once here.
        // Activity overrides (phone/eating/gesture) need to move every
        // frame instead - see the per-frame block below, which reuses the
        // `forward` just cached above via seatedForwardCache.
        for (const [side, override] of [['L', leftArm] as const, ['R', rightArm] as const]) {
          if (!override?.target) continue;
          aimBoneAtPointExact(scene, `lowerarm01${side}`, `lowerarm01${side}`, `wrist${side}`, new THREE.Vector3(...override.target));
          // Palm down onto the table, fingers gently curled rather than
          // held rigidly flat - see aimPalmNormal's own comment for why
          // this needs measuring rather than guessing.
          aimPalmNormal(scene, side, new THREE.Vector3(0, -1, 0));
          for (const finger of [2, 3, 4, 5]) {
            for (const segment of [1, 2, 3]) {
              applyRel(
                [scene], restMap, `finger${finger}-${segment}${side}`,
                THREE.MathUtils.degToRad(HANDHOLD_CURL_DEGREES[segment]), 0, 0,
              );
            }
          }
          applyRel([scene], restMap, `finger1-1${side}`, THREE.MathUtils.degToRad(4), 0, 0);
          applyRel([scene], restMap, `finger1-2${side}`, THREE.MathUtils.degToRad(3), 0, 0);
        }

        // Prototype: give an 'eating' hand something to actually hold,
        // rather than just aiming an empty hand at the mouth - attached
        // once, directly onto the wrist bone, so it inherits that bone's
        // transform automatically every frame (same idea as a garment
        // sleeve tracking the arm underneath it, just via real parenting
        // here instead of applyRel's copy-the-rotation trick).
        for (const [side, override] of [['L', leftArm] as const, ['R', rightArm] as const]) {
          // A static 'eating' override (table2's guys) always gets a fork.
          // A 3+-peer conversation's right hand (nothing else claiming it)
          // also gets one pre-emptively, even on a turn where this seat
          // starts out speaking or listening - the eat role will reach it
          // eventually, and swapping a whole fork prop in and out with the
          // rotation would be its own can of worms; simpler for everyone at
          // that kind of table to just be holding one throughout, the way
          // people don't usually put a fork all the way down between bites
          // of a conversation.
          const dynamicRoleEats =
            side === 'R' && !override?.activity && !override?.target && !!conversation && conversation.peers.length >= 3;
          const isActivityFork = override?.activity === 'eating' || dynamicRoleEats;
          if (!isActivityFork && !override?.holdsFork) continue;
          const wrist = scene.getObjectByName(`wrist${side}`);
          const gripFinger = scene.getObjectByName(`finger3-1${side}`);
          if (!wrist || !gripFinger) continue;

          // Curl the gripping fingers (not the thumb, which wraps less)
          // into a closed-around-a-handle shape - a static pose, applied
          // once here rather than per frame, since the grip itself doesn't
          // change as the arm moves. Without this the fingers stayed in
          // their flat seated-rest shape while a fork sat between them,
          // reading as balanced-on-the-hand rather than held (reported
          // directly).
          const GRIP_CURL_DEGREES: Record<number, number> = { 1: 52, 2: 42, 3: 32 };
          for (const finger of [2, 3, 4, 5]) {
            for (const segment of [1, 2, 3]) {
              applyRel(
                [scene], restMap, `finger${finger}-${segment}${side}`,
                THREE.MathUtils.degToRad(GRIP_CURL_DEGREES[segment]), 0, 0,
              );
            }
          }
          applyRel([scene], restMap, `finger1-1${side}`, THREE.MathUtils.degToRad(24), 0, 0);
          applyRel([scene], restMap, `finger1-2${side}`, THREE.MathUtils.degToRad(20), 0, 0);

          // Built and parented once - the actual pose (position and
          // orientation, both dependent on the current wrist/gripFinger
          // world transform) is computed fresh every frame instead, by
          // updateHeldForkPose below, right after this block runs for the
          // first time and every frame after via the per-frame activity
          // loop.
          const fork = buildForkProp();
          wrist.add(fork);
          updateHeldForkPose(scene, side);
        }
      }
      posed.current = true;
    }

    // Activity overrides move every frame (food-to-mouth cycle, a small
    // phone bob, a gesture sway, or the speak/listen/eat rotation below) -
    // reported directly that a single frozen pose read as static/lifeless,
    // so unlike the handhold target above these can't be posed once inside
    // the `posed.current` guard. Uses the exact/stretchy variant, not plain
    // aimBoneAtPoint: the phone offset in particular reaches further
    // forward than this rig's natural forearm length, and direction-only
    // aiming left the hand short of it - the same "points at the target
    // but never gets there" gap reported for the handhold pose, just less
    // obvious here since there's no second hand to visibly miss. Reported
    // directly as the phone hand reading as still resting against the
    // stomach.
    {
      const activityTime = clock.getElapsedTime();
      const armDelta = Math.min(frameDelta, 1 / 30);
      // A static activity (table2/table4's eating or phone) switches to
      // gesturing for whoever's own turn it is to speak, instead of
      // continuing to eat/scroll straight through it - requested directly,
      // with a reference screenshot of two women visibly gesturing while
      // talking. Reads as more animated conversational body language than
      // the earlier version, which just froze the eating hand at the
      // plate and left the phone hand scrolling the whole time regardless
      // of who was talking. A conversation's rotating eat role (3+ peers)
      // already only ever lands on whoever ISN'T currently speaking, so it
      // needs no separate handling here.
      const isSpeaking = !!conversation && isConversationSpeaker(conversation, activityTime);
      const role = conversation && conversation.peers.length >= 3
        ? computeConversationRole(conversation, activityTime)
        : null;
      for (const scene of scenes) {
        const forward = seatedForwardCache.get(scene);
        if (!forward) continue;
        for (const [side, override] of [['L', leftArm] as const, ['R', rightArm] as const]) {
          let rawTarget: THREE.Vector3 | null = null;
          if (override?.activity) {
            const activity = isSpeaking ? 'gesture' : override.activity;
            rawTarget = computeActivityTarget(scene, forward, activity, activityTime);
          } else if (side === 'R' && !override?.target && role) {
            rawTarget = computeConversationArmTarget(scene, forward, role, activityTime);
          }
          if (rawTarget) {
            // Ease toward rawTarget instead of snapping straight to it -
            // see ARM_TARGET_EASE_RATE's own comment.
            let smoothed = armTargetSmoothState.get(scene);
            if (!smoothed) {
              smoothed = {};
              armTargetSmoothState.set(scene, smoothed);
            }
            if (!smoothed[side]) {
              smoothed[side] = rawTarget.clone();
            } else {
              smoothed[side]!.lerp(rawTarget, 1 - Math.exp(-ARM_TARGET_EASE_RATE * armDelta));
            }
            aimBoneAtPointExact(scene, `lowerarm01${side}`, `lowerarm01${side}`, `wrist${side}`, smoothed[side]!);
          }
          // A held fork's pose depends on the wrist's CURRENT world
          // transform (see updateHeldForkPose's own comment for why this
          // has to be live, not baked once) - runs regardless of whether
          // this side's arm target moved this frame, since a `target`-
          // based `holdsFork` hand (never touched by the block above)
          // still needs it just as much as an activity-based one.
          const dynamicRoleEats =
            side === 'R' && !override?.activity && !override?.target && !!conversation && conversation.peers.length >= 3;
          if (override?.activity === 'eating' || dynamicRoleEats || override?.holdsFork) {
            updateHeldForkPose(scene, side);
          }
        }
      }
    }

    // Head-only speak/listen turn-taking - see ConversationConfig's own
    // comment for why this doesn't touch the arms. Eased toward the
    // target with a spring (see HEAD_TURN_SPRING_FREQUENCY's own comment)
    // rather than applied directly, so a turn-change reads as a smooth
    // glance instead of snapping the instant the speaking turn changes.
    if (conversation) {
      const headDelta = Math.min(frameDelta, 1 / 30);
      for (const scene of scenes) {
        const forward = seatedForwardCache.get(scene);
        if (!forward) continue;
        let spring = headTurnSpring.get(scene);
        if (!spring) {
          spring = { pitch: { value: 0, velocity: 0 }, yaw: { value: 0, velocity: 0 } };
          headTurnSpring.set(scene, spring);
        }
        const [targetPitch, targetYaw] = computeHeadTurnTarget(forward, conversation, clock.getElapsedTime());
        springStep(spring.pitch, targetPitch, headDelta, HEAD_TURN_SPRING_FREQUENCY, HEAD_TURN_SPRING_DAMPING);
        springStep(spring.yaw, targetYaw, headDelta, HEAD_TURN_SPRING_FREQUENCY, HEAD_TURN_SPRING_DAMPING);
        // Yaw is always a turn about world (vertical) Y - it doesn't
        // matter which way the character faces. Pitch (the nod/bob) needs
        // to tip the face down/up regardless of facing direction too, so
        // it rotates about this character's own horizontal "right" axis
        // (perpendicular to `forward` and world up), not a fixed world
        // axis - a fixed world X/Z would nod some characters forward and
        // others sideways depending on which way their chair faces.
        const worldUp = new THREE.Vector3(0, 1, 0);
        const rightAxis = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        const worldDelta = new THREE.Quaternion()
          .setFromAxisAngle(worldUp, spring.yaw.value)
          .multiply(new THREE.Quaternion().setFromAxisAngle(rightAxis, spring.pitch.value));
        applyRelWorld([scene], restMap, 'head', worldDelta);
      }
    }

    // Same breathing bob as IdleAnimation - see that function's own comment
    // on why this is a position bob only, no rotational tilt.
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

    applyMorphInfluence(scenes, 'eye_left_closure', 0);
    applyMorphInfluence(scenes, 'eye_right_closure', 0);
    applyMorphInfluence(scenes, 'mouth_open', conversation ? computeMouthOpen(conversation, t) : 0);
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
