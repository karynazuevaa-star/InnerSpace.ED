import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CafeEnvironment } from './CafeEnvironment';
import { NpcAvatar, type NpcConfig } from './NpcAvatar';
import { PlayerControls, type RoomBounds } from './PlayerControls';
import { SceneLoader } from '../SceneLoader';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ConversationConfig } from '../../avatar/idleAnimation';

// Builds one `ConversationConfig` per seat, sharing the same `peers` list
// (every seat's own XZ position, table height doesn't matter - see
// ConversationConfig's own comment) in a fixed order, so the whole table
// agrees on the turn-taking clock without any of them needing to know
// about each other at render time. `positions` order IS turn order.
function conversationGroup(positions: [number, number, number][]): ConversationConfig[] {
  const peers: [number, number][] = positions.map(([x, , z]) => [x, z]);
  return positions.map((_, selfIndex) => ({ peers, selfIndex }));
}

// The Chair prop's own backrest sits on its -Z side (see CafeEnvironment.tsx),
// so a chair at rotationY=0 has its seat facing +Z, not -Z - confirmed
// directly (screenshots of 5 NPCs sitting with their backs to their own
// table, chair included) after an earlier attempt got this backwards by
// assuming 0 meant -Z. Every "north" seat (higher z than its table) needs
// rotationY=PI to face the table (-Z); the "east"/"west" (+-PI/2) seats
// were already correct, since they were never flagged.
// Table 1's handhold pose - both npc_lace_ruffle and npc_male_heavier reach
// for the same spot on the table instead of resting a hand on their own
// thigh. Used to be ONE shared point for both hands, which closed the gap
// between them but left the two hand meshes occupying the same space -
// clipping through each other and, since the point sat right at table
// height, into the tabletop too (reported directly, with a screenshot).
// Split into two points, a few cm apart vertically so the hands stack
// instead of merging into each other (reported directly, with a
// screenshot, at 2.5cm - widened to 3cm). Also nudged closer to
// lace_ruffle's OWN seat specifically for her point: logging each hand's
// actual unclamped reach shortfall (see aimBoneAtPointExact) showed hers
// falling ~5.5cm short of the shared center point even though it's the
// same distance away as male_heavier's, whose own shortfall was only
// ~1.2cm - her arm's natural reach is shorter than his, so the shared
// center point was always going to leave her hand short of it once the
// 3.5cm reach-correction clamp couldn't fully cover the gap (reported
// directly, with a screenshot of her hand floating short of the table/his
// hand instead of resting on it). Pulling just her target ~5cm back
// toward her own seat brings it inside her actual reach without changing
// his.
//
// Both seats then moved another ~7cm further from the table on top of
// that (see CafeEnvironment.tsx) - male_heavier's own belly was visibly
// poking through the tabletop at the original tighter distance (reported
// directly, with a screenshot). These two points were recomputed for
// that new distance, same relative pattern as before (shared midpoint,
// lace_ruffle's own point pulled back toward her).
const TABLE1_HAND_LOWER: [number, number, number] = [1.945, 0.785, -3.125];
const TABLE1_HAND_UPPER: [number, number, number] = [1.84, 0.815, -3.02];

// Table1's OTHER (non-handhold) hand for each of them - requested
// directly: rest it on the table too, holding a fork (`holdsFork`, see
// idleAnimation.tsx), rather than defaulting onto the thigh like an arm
// with no override at all. Placed clear of both the handhold points above
// and the decorative FoodPlate near the table's unused south side -
// lace_ruffle's toward her own (north) side away from the handhold pair,
// male_heavier's toward his own (east) side likewise. Y=0.785 matches
// TABLE1_HAND_LOWER - the same "one hand resting flat at table height"
// case, not stacked on another hand.
const TABLE1_LACE_FORK_HAND: [number, number, number] = [1.4, 0.785, -3.15];
const TABLE1_HEAVIER_FORK_HAND: [number, number, number] = [1.85, 0.785, -3.55];

// Table 2's non-eating (left) hand - reported directly that it should
// rest on the table, gently bent at the elbow, rather than default onto
// the thigh like an arm with no override at all. Reuses the same `target`
// mechanism as table1's handhold (a fixed point, aimed at once - see the
// `posed.current` block in idleAnimation.tsx), which already applies a
// palm-down orientation and the same gently-curled resting fingers table1
// uses, for free.
// Y=0.75 (1cm above the table's top face at 0.74) wasn't enough clearance
// - aimPalmNormal turns the palm to face straight down, so the actual
// palm/finger mesh sits BELOW the wrist point this target aims, and at
// only 1cm the whole hand read as sunk into the tabletop (reported
// directly, with a screenshot). Matched to TABLE1_HAND_LOWER's already-
// correct height instead of a fresh guess - that's the same "one hand
// resting flat at table height" case (the other table1 point, _UPPER, is
// higher because it stacks a second hand on top of that one).
// The original 0.15m-off-center points then read as the hand overlapping
// its own plate (reported directly, with a screenshot) - table2's default
// 0.42 table radius genuinely doesn't have room for both a plate and a
// resting hand on the same side without crowding, at least not while both
// stay a comfortable distance from the shared center. See
// CafeEnvironment.tsx for the matching radius bump this table got (0.46,
// same idea as table5's bigger bump) - these points, and the FoodPlate
// positions there, were recomputed together for the extra room: hand
// pushed out further to each side (0.22m lateral, up from 0.15m) and the
// plates pulled a bit closer to center (0.15m offset, down from 0.2m),
// leaving ~17cm of clearance between a hand and its own plate instead of
// the original ~8cm.
const TABLE2_AVERAGE_LEFT_HAND: [number, number, number] = [3.18, 0.785, -0.05];
const TABLE2_CASUALSUIT_LEFT_HAND: [number, number, number] = [3.62, 0.785, -0.75];

// Turn-taking groups (see ConversationConfig) - one call per table that
// should read as mid-conversation. Table 3 (solo) is left out on purpose:
// nobody to talk to.
const [TABLE1_TALK_LACE, TABLE1_TALK_HEAVIER] = conversationGroup([
  [1.6, 0, -2.78],
  [2.22, 0, -3.4],
]);
const [TABLE2_TALK_AVERAGE, TABLE2_TALK_CASUALSUIT] = conversationGroup([
  [3.4, 0, 0.22],
  [3.4, 0, -1.02],
]);
// Table 4 - requested directly: give these two the same speak/listen/eat
// animation the table5 trio has. Only two of them, so there's no separate
// "third" seat for computeConversationRole's eat role to land on - it
// falls back to a plain speak/listen split (see its own comment) the same
// way table1/table2's pairs already do. tiered_dress's own rightArm
// activity below still supplies the "eat" half of that, same static-
// eating-that-pauses-for-her-own-turn pattern table2's guys use.
const [TABLE4_TALK_POLKA, TABLE4_TALK_TIERED] = conversationGroup([
  [0.5, 0, 2.7],
  [1.4, 0, 1.8],
]);
const [TABLE5_TALK_ASIAN, TABLE5_TALK_NATIVE, TABLE5_TALK_KNIT] = conversationGroup([
  [-3.6, 0, -1.24],
  [-2.84, 0, -2.0],
  [-4.36, 0, -2.0],
]);

const NPCS: NpcConfig[] = [
  // Table 1 (1.6,-3.4): lace_ruffle + male_heavier together, holding hands
  // on the table - seats pulled in close (see CafeEnvironment.tsx) so
  // their hands can actually reach each other. lace_ruffle's hand rests on
  // top, male_heavier's underneath.
  { position: [1.6, 0, -2.78], rotationY: Math.PI, preset: 'npc_lace_ruffle', seated: true, leftArm: { target: TABLE1_LACE_FORK_HAND, holdsFork: true }, rightArm: { target: TABLE1_HAND_UPPER }, conversation: TABLE1_TALK_LACE },
  { position: [2.22, 0, -3.4], rotationY: -Math.PI / 2, preset: 'npc_male_heavier', seated: true, leftArm: { target: TABLE1_HAND_LOWER }, rightArm: { target: TABLE1_HEAVIER_FORK_HAND, holdsFork: true }, conversation: TABLE1_TALK_HEAVIER },

  // Table 2 (3.4,-0.4): the other two guys together, eating - seats pulled
  // in to 0.62m from the table center (see CafeEnvironment.tsx), matching
  // table1, so they read as close enough to actually reach their plates.
  // Seated opposite each other (north/south) rather than at adjacent
  // corners, so they're still ~1.24m apart from EACH OTHER despite both
  // being close to the table - see CafeEnvironment.tsx's own comment.
  // Left hand rests on the table (TABLE2_*_LEFT_HAND) since only the right
  // is busy eating.
  { position: [3.4, 0, 0.22], rotationY: Math.PI, preset: 'npc_male_average', seated: true, leftArm: { target: TABLE2_AVERAGE_LEFT_HAND }, rightArm: { activity: 'eating' }, conversation: TABLE2_TALK_AVERAGE },
  { position: [3.4, 0, -1.02], rotationY: 0, preset: 'npc_male_casualsuit', seated: true, leftArm: { target: TABLE2_CASUALSUIT_LEFT_HAND }, rightArm: { activity: 'eating' }, conversation: TABLE2_TALK_CASUALSUIT },

  // Table 3 (-2.6,1.4): thinner alone, coffee on the table
  { position: [-2.6, 0, 2.3], rotationY: Math.PI, preset: 'npc_thinner', seated: true },

  // Table 4 (0.5,1.8): polka_skirt on her phone, tiered_dress with food -
  // now also mid-conversation (see TABLE4_TALK_* above), tiered_dress's
  // eating pausing for her own speaking turn the same way table2's does.
  { position: [0.5, 0, 2.7], rotationY: Math.PI, preset: 'npc_polka_skirt', seated: true, rightArm: { activity: 'phone' }, conversation: TABLE4_TALK_POLKA },
  { position: [1.4, 0, 1.8], rotationY: -Math.PI / 2, preset: 'npc_tiered_dress', seated: true, rightArm: { activity: 'eating' }, conversation: TABLE4_TALK_TIERED },

  // Table 5 (-3.6,-2.0): the remaining three together, mid-conversation -
  // speak/listen/eat rotates between all three (see computeConversationRole
  // in idleAnimation.tsx) rather than any one of them having a fixed
  // activity, so none of the three gets a rightArm override here - the
  // rotation drives the right hand for all of them automatically once
  // `conversation` has 3+ peers.
  { position: [-3.6, 0, -1.24], rotationY: Math.PI, preset: 'npc_asian_dress', seated: true, conversation: TABLE5_TALK_ASIAN },
  { position: [-2.84, 0, -2.0], rotationY: -Math.PI / 2, preset: 'npc_native_skirt', seated: true, conversation: TABLE5_TALK_NATIVE },
  { position: [-4.36, 0, -2.0], rotationY: Math.PI / 2, preset: 'npc_knit_sweater', seated: true, conversation: TABLE5_TALK_KNIT },
];

const BOUNDS: RoomBounds = { minX: -4.5, maxX: 4.5, minZ: -5, maxZ: 3.2 };

/**
 * Exposure-practice cafe: a place people with EDs often avoid (eating in
 * public, being around others while eating). Entirely separate from the
 * dressing-room tool's Canvas/scene tree (AvatarSceneLegacy.tsx /
 * AvatarScene.tsx) - the NPCs are pre-baked (see NpcAvatar.tsx and
 * pipeline/scripts/09_bake_npc_presets.py), sharing only generic,
 * non-visual avatar rigging infra (AvatarContext, idleAnimation's pose
 * helpers) and the SceneLoader overlay, none of which this room modifies.
 */
export function CafeScene() {
  const { t } = useLanguage();
  return (
    <>
      <SceneLoader label={t('loading.room')} />
      <Canvas shadows camera={{ position: [0, 1.6, 2.6], fov: 60, near: 0.05 }} style={{ background: '#25201c' }}>
        <ambientLight intensity={0.55} color="#fff2e2" />
        <directionalLight
          position={[3, 5, 2]}
          intensity={0.6}
          color="#fff0d6"
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.0006}
        />
        <Suspense fallback={null}>
          <CafeEnvironment />
          {NPCS.map((npc, i) => (
            <NpcAvatar key={i} config={npc} />
          ))}
        </Suspense>
        <PlayerControls start={[0, 2.6]} startYaw={0} bounds={BOUNDS} />
      </Canvas>
    </>
  );
}
