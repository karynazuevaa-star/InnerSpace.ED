import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { CafeEnvironment, MENU_FOOD_ITEMS, type MenuFoodId } from './CafeEnvironment';
import { NpcAvatar, type NpcConfig } from './NpcAvatar';
import { PlayerControls, type RoomBounds, type Seat } from './PlayerControls';
import { SceneLoader } from '../SceneLoader';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ConversationConfig } from '../../avatar/idleAnimation';

// Builds one `ConversationConfig` per seat, sharing the same `peers` list
// (every seat's own XZ position, table height doesn't matter - see
// ConversationConfig's own comment) in a fixed order, so the whole table
// agrees on the turn-taking clock without any of them needing to know
// about each other at render time. `positions` order IS turn order.
// `table` (center + radius, matching the actual <Table> prop in
// CafeEnvironment.tsx) lets the listen/eat-rest hand pose stay inset from
// that specific table's real edge instead of guessing - see
// ConversationConfig's own comment. Omitted for table1, whose seats never
// use the role-based rest pose at all (fixed handhold `target`s instead).
function conversationGroup(
  positions: [number, number, number][],
  table?: { center: [number, number]; radius: number },
): ConversationConfig[] {
  const peers: [number, number][] = positions.map(([x, , z]) => [x, z]);
  return positions.map((_, selfIndex) => ({
    peers, selfIndex, tableCenter: table?.center, tableRadius: table?.radius,
  }));
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

// tiered_dress's right hand, resting on the table - a fixed point instead
// of the generic per-role rest target every other non-overridden seat
// uses (computeListenRestTarget/computeConversationArmTarget in
// idleAnimation.tsx). That generic version kept landing short of the
// table or, once pulled closer, dragging the whole arm in toward her body
// (reported directly, with screenshots of both) for her specifically -
// same category of per-rig mismatch this file already handles with a
// fixed point elsewhere (TABLE2_*_LEFT_HAND above, TABLE1's handhold
// points) rather than fighting a shared formula for one character.
// Requested directly: reuse TABLE2_AVERAGE_LEFT_HAND's own already-correct
// reach (a hand resting alone on a table, not part of a handhold) rather
// than guessing a new one - same 0.785 height, and the same ~0.35m
// reach/~0.22m lateral shape, translated to her own seat and forward
// direction (+Z, she faces north - CafeEnvironment.tsx's own comment on
// table4's chairs), offset to her own LEFT (-X) instead of the guys'
// right, so it clears the plate/fork sitting on her right at x=0.5/0.65
// instead of reaching toward them.
// Shifted again along with table4's own second move (requested directly -
// the table2/EmptyB/table4/EmptyA stretch was crowding together, see
// CafeEnvironment.tsx's own comment on EmptyB) - same offset FROM her seat
// as always, just translated along with the table.
const TABLE4_TIERED_RIGHT_HAND: [number, number, number] = [-0.82, 0.785, 0.55];

// Same fixed-point treatment for two of table5's trio (asian_dress,
// native_skirt) - requested directly, everyone but knit_sweater, who
// keeps the full speak/listen/eat rotation (including the food-to-mouth
// eating cycle) unchanged. Computed the same way as TABLE4_TIERED_RIGHT_
// HAND: 0.785 height, landing ~5cm inside the table's own edge (table5's
// own radius is 0.55) along the straight line from each seat to the
// table center [-3.6,-2.0] - not reused verbatim from TABLE2_AVERAGE_
// LEFT_HAND like tiered_dress's point was, since table5's bigger radius
// and different seat layout put each of these two on that line clear of
// their own plate/fork already, without needing a lateral offset to dodge
// them the way tiered_dress's point did.
const TABLE5_ASIAN_RIGHT_HAND: [number, number, number] = [-3.6, 0.785, -1.5];
// Originally had an invented +0.10 lateral (Z) nudge off this same
// straight seat-to-center line, guessed (not measured against any
// working reference the way tiered_dress's point was) as clearance for
// her own fork - reported directly, with a screenshot, that it instead
// swung her arm across her own body, clipping into it. Reverted to the
// same plain, un-offset line asian_dress already uses without issue -
// her fork sits close enough to this point to plausibly need a nudge
// eventually, but a wrong-direction guess is worse than the fork-
// proximity problem it was meant to solve.
const TABLE5_NATIVE_RIGHT_HAND: [number, number, number] = [-3.1, 0.785, -2.0];

// Turn-taking groups (see ConversationConfig) - one call per table that
// should read as mid-conversation. Table 3 (solo) is left out on purpose:
// nobody to talk to.
const [TABLE1_TALK_LACE, TABLE1_TALK_HEAVIER] = conversationGroup([
  [1.6, 0, -2.78],
  [2.22, 0, -3.4],
]);
// table center/radius here must match the matching <Table> in
// CafeEnvironment.tsx - see conversationGroup's own comment.
const [TABLE2_TALK_AVERAGE, TABLE2_TALK_CASUALSUIT] = conversationGroup(
  [
    [3.4, 0, 0.22],
    [3.4, 0, -1.02],
  ],
  { center: [3.4, -0.4], radius: 0.46 },
);
// Table 4 - requested directly: give these two the same speak/listen
// animation the table5 trio has. Only two of them, so there's no separate
// "third" seat for computeConversationRole's eat role to land on - it
// falls back to a plain speak/listen split (see its own comment) the same
// way table1/table2's pairs already do.
const [TABLE4_TALK_POLKA, TABLE4_TALK_TIERED] = conversationGroup(
  [
    [-0.6, 0, 1.52],
    [-0.6, 0, 0.28],
  ],
  { center: [-0.6, 0.9], radius: 0.46 },
);
const [TABLE5_TALK_ASIAN, TABLE5_TALK_NATIVE, TABLE5_TALK_KNIT] = conversationGroup(
  [
    [-3.6, 0, -1.24],
    [-2.84, 0, -2.0],
    [-4.36, 0, -2.0],
  ],
  { center: [-3.6, -2.0], radius: 0.55 },
);

const NPCS: NpcConfig[] = [
  // Table 1 (1.6,-3.4): lace_ruffle + male_heavier together, holding hands
  // on the table - seats pulled in close (see CafeEnvironment.tsx) so
  // their hands can actually reach each other. lace_ruffle's hand rests on
  // top, male_heavier's underneath.
  { position: [1.6, 0, -2.78], rotationY: Math.PI, preset: 'npc_lace_ruffle', seated: true, leftArm: { target: TABLE1_LACE_FORK_HAND, holdsFork: true }, rightArm: { target: TABLE1_HAND_UPPER }, conversation: TABLE1_TALK_LACE },
  { position: [2.22, 0, -3.4], rotationY: -Math.PI / 2, preset: 'npc_male_heavier', seated: true, leftArm: { target: TABLE1_HAND_LOWER }, rightArm: { target: TABLE1_HEAVIER_FORK_HAND, holdsFork: true }, conversation: TABLE1_TALK_HEAVIER },

  // Table 2 (3.4,-0.4): the other two guys together - seats pulled
  // in to 0.62m from the table center (see CafeEnvironment.tsx), matching
  // table1, so they read as close enough to actually reach their plates.
  // Seated opposite each other (north/south) rather than at adjacent
  // corners, so they're still ~1.24m apart from EACH OTHER despite both
  // being close to the table - see CafeEnvironment.tsx's own comment.
  // Left hand rests on the table (TABLE2_*_LEFT_HAND).
  { position: [3.4, 0, 0.22], rotationY: Math.PI, preset: 'npc_male_average', seated: true, leftArm: { target: TABLE2_AVERAGE_LEFT_HAND }, rightArm: { activity: 'eating' }, conversation: TABLE2_TALK_AVERAGE },
  // rightArm left un-overridden (was `activity: 'eating'`) - reported
  // directly that the fork-less eating reach still played on his own
  // listening turns (see table4's tiered_dress, same fix, same reason).
  // No override at all now lets him fall through to the plain
  // conversation speak/listen split idleAnimation.tsx's `role` already
  // computes for every conversation, not just 3+-peer ones - gesturing on
  // his own turn, hand resting near the plate the rest of the time.
  { position: [3.4, 0, -1.02], rotationY: 0, preset: 'npc_male_casualsuit', seated: true, leftArm: { target: TABLE2_CASUALSUIT_LEFT_HAND }, conversation: TABLE2_TALK_CASUALSUIT },

  // Table 3 (-3.1,-0.2, moved again from -2.8,0.8 - requested directly, a
  // second nudge closer to table5's trio once the table2/EmptyB/table4/
  // EmptyA stretch elsewhere had gotten crowded, see CafeEnvironment.tsx's
  // own comment on EmptyB): thinner alone, coffee on the table, on her phone
  // with both hands - requested directly. `holdsPhone` (idleAnimation.tsx)
  // now poses BOTH arms and the visible phone prop itself, all statically,
  // regardless of which of leftArm/rightArm actually carries the flag -
  // deliberately no `activity: 'phone'` alongside it any more: that would
  // have the per-frame activity loop recompute the OLD one-handed dynamic
  // position on top of this every frame, fighting it. Opt-in only for her,
  // not polka_skirt (untouched, still `activity: 'phone'` alone, no prop).
  // seatedHipDropOverride: the shared SEATED_HIP_DROP_METERS (0.365) sat
  // her visibly low, sunk about halfway into the chair seat - reported
  // directly, with a screenshot. Raised by 3cm as a first guess (not
  // verified against a screenshot yet) - per-NPC, doesn't touch the
  // shared constant every other seated NPC still uses.
  { position: [-3.1, 0, 0.7], rotationY: Math.PI, preset: 'npc_thinner', seated: true, seatedHipDropOverride: 0.335, rightArm: { holdsPhone: true } },

  // Table 4 (-0.6,0.9, moved again from 0.3,1.2 - requested directly, a
  // different amount than table3's own move this time, to open up real
  // space in the crowded table2/EmptyB/table4/EmptyA stretch - see
  // CafeEnvironment.tsx's own comment on EmptyB): polka_skirt on her
  // phone, tiered_dress mid-conversation (see TABLE4_TALK_* above). Seated
  // opposite each other (north/south, see CafeEnvironment.tsx's own
  // comment) rather than the original adjacent corners. polka_skirt still
  // gestures instead of scrolling during her own speaking turn (`activity:
  // 'phone'` already does that - see the isSpeaking block in
  // idleAnimation.tsx).
  { position: [-0.6, 0, 1.52], rotationY: Math.PI, preset: 'npc_polka_skirt', seated: true, rightArm: { activity: 'phone' }, conversation: TABLE4_TALK_POLKA },
  // rightArm now a fixed target (TABLE4_TIERED_RIGHT_HAND, see its own
  // comment) instead of the plain conversation speak/listen split every
  // other un-overridden seat falls through to - her hand kept landing
  // short of, or dragged too close to her body compared to, the table
  // under that generic per-role formula (reported directly, with
  // screenshots). `gestureWhileSpeaking` keeps her gesturing on her own
  // speaking turn same as before, easing back to the fixed resting point
  // once she isn't - unlike table1's handhold pair, whose target hands
  // stay static throughout (see SeatedArmOverride's own comment on why
  // that's opt-in, not automatic for every `target`).
  { position: [-0.6, 0, 0.28], rotationY: 0, preset: 'npc_tiered_dress', seated: true, rightArm: { target: TABLE4_TIERED_RIGHT_HAND, gestureWhileSpeaking: true }, conversation: TABLE4_TALK_TIERED },

  // Table 5 (-3.6,-2.0): the remaining three together, mid-conversation.
  // asian_dress and native_skirt now get the same fixed-point rightArm
  // (+ gestureWhileSpeaking) as table4's tiered_dress - requested
  // directly - instead of the per-role rotation's own generic listen/eat
  // rest target, which had the same landing-short/dragged-to-body issues
  // for these two specifically (reported directly, with screenshots).
  // knit_sweater keeps the full speak/listen/eat rotation unmodified - the
  // rotation still drives HER right hand (and everyone's head-turn/glance
  // behavior) the same as before, since `conversation` stays on all three.
  { position: [-3.6, 0, -1.24], rotationY: Math.PI, preset: 'npc_asian_dress', seated: true, rightArm: { target: TABLE5_ASIAN_RIGHT_HAND, gestureWhileSpeaking: true }, conversation: TABLE5_TALK_ASIAN },
  { position: [-2.84, 0, -2.0], rotationY: -Math.PI / 2, preset: 'npc_native_skirt', seated: true, rightArm: { target: TABLE5_NATIVE_RIGHT_HAND, gestureWhileSpeaking: true }, conversation: TABLE5_TALK_NATIVE },
  { position: [-4.36, 0, -2.0], rotationY: Math.PI / 2, preset: 'npc_knit_sweater', seated: true, conversation: TABLE5_TALK_KNIT },
];

const BOUNDS: RoomBounds = { minX: -4.5, maxX: 4.5, minZ: -5, maxZ: 3.2 };

// Click-to-sit, requested directly (see PlayerControls' own doc comment
// for how the feature works) - only the two empty tables' four chairs are
// sittable, not every chair in the room (the rest are already occupied by
// NPCs). Positions must match those Chairs' own `position` in
// CafeEnvironment.tsx exactly; `yaw` is that chair's rotationY + PI, not
// the rotationY itself - PlayerControls' own doc comment explains why
// the two conventions are opposite.
const EMPTY_TABLE_SEATS: Seat[] = [
  { position: [0, 0, -0.38], yaw: 0 },
  { position: [0, 0, -1.62], yaw: Math.PI },
  { position: [1.6, 0, 1.52], yaw: 0 },
  { position: [1.6, 0, 0.28], yaw: Math.PI },
];

// The specialist's exposure-session guide, requested directly - a fixed
// sequence of short prompts (CBT-style behavioral experiment: orient,
// observe, choose, predict/check, order, sit with the discomfort), agreed
// on with the user step by step across several messages before any of
// this was built. Kept as plain translation keys in a flat array (not an
// object with named fields per step) since every step is the same shape -
// one short line, nothing else - and CafeScene.tsx just needs to map over
// them for the checklist below.
// Each ACTION+its own REFLECTION question used to be one combined step
// (e.g. "Pick a table - why this one?") - split into two separate steps
// instead (requested directly): showing the question before the action
// happens primes/biases it (the classic problem with telling someone
// what you're about to ask them before they've done the thing naturally)
// - splitting keeps the action's own hint free of that question, which
// only appears as its own step once the action is already done.
// A whole observation block (steps 4-12) was inserted before table
// choice, requested directly, expanding what used to be a single "does
// anyone bring up emotions" step into: the food at other tables
// specifically, feelings about the people ordering it, perspective-taking
// ("could you put yourself in their place"), the vitrine's own spread of
// food, who the player would associate with, who reads as likeable vs
// off-putting, and - the actual clinical point of all of this - whether
// that reaction is tied to the person's own body or their food choice.
// The old standalone "go to the display case" and "who would you
// associate with" steps were folded into this block rather than kept as
// separate, later duplicates.
const GUIDE_STEP_KEYS = [
  'cafe.guide.step1',
  'cafe.guide.step2',
  'cafe.guide.step3',
  'cafe.guide.step4',
  'cafe.guide.step5',
  'cafe.guide.step6',
  'cafe.guide.step7',
  'cafe.guide.step8',
  'cafe.guide.step9',
  'cafe.guide.step10',
  'cafe.guide.step11',
  'cafe.guide.step12',
  'cafe.guide.step13',
  'cafe.guide.step14',
  'cafe.guide.step15',
  'cafe.guide.step16',
  'cafe.guide.step17',
  'cafe.guide.step18',
  'cafe.guide.step19',
  'cafe.guide.step20',
  'cafe.guide.step21',
  'cafe.guide.step22',
] as const;

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

  // Click-to-sit's own "some indication" (requested directly) - which seat
  // (an index into EMPTY_TABLE_SEATS) the player is currently close enough
  // to sit in, or null. PlayerControls itself decides near/far (see its
  // own onNearSeatChange doc comment); this only renders the hint.
  const [nearSeat, setNearSeat] = useState<number | null>(null);
  // Which seat the player is actually sitting in, or null - drives both
  // the table-menu overlay (below) and which table it applies to.
  const [seatedSeat, setSeatedSeat] = useState<number | null>(null);
  // Each empty table's own order - a LIST of items, not a single choice
  // (requested directly: order isn't one dish replacing the last, several
  // can sit on the table at once, each added/removed independently).
  // EMPTY_TABLE_SEATS' own 4 entries are two seats per table, so
  // `seatIndex >> 1` is the table index. See CafeEnvironment.tsx's own
  // TableOrder/MENU_FOOD_ITEMS for the other half of this (the actual 3D
  // props, their fixed per-item slot around the table, and the shared
  // list of what's orderable).
  const [tableOrders, setTableOrders] = useState<MenuFoodId[][]>([[], []]);
  const seatedTable = seatedSeat !== null ? seatedSeat >> 1 : null;

  // Ambient cafe sound, requested directly - a quiet instrumental music bed
  // plus a separate chatter/dishes ambience layer (mimicking other people
  // talking around you), both looped low in the background rather than one
  // single track, so the "conversation" layer can sit lower than the
  // music. Plain HTMLAudioElement (not R3F's positional audio) - this is
  // meant to read as constant room ambience, not sound coming from any one
  // point in the 3D scene. Browsers block audio from autoplaying without a
  // user gesture first, so playback starts on the player's own first
  // pointerdown (the same drag-to-look gesture PlayerControls listens for)
  // instead of on mount. Held in refs (not state) since the Audio objects
  // themselves are mutable, long-lived instances - only `volume`/`muted`
  // (below) need to trigger a re-render.
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const music = new Audio('/audio/cafe/music.mp3');
    music.loop = true;
    musicRef.current = music;
    const ambience = new Audio('/audio/cafe/ambience.mp3');
    ambience.loop = true;
    ambienceRef.current = ambience;

    const start = () => {
      music.play().catch(() => {});
      ambience.play().catch(() => {});
    };
    window.addEventListener('pointerdown', start, { once: true });
    // Belt-and-suspenders alongside the cleanup below (reported directly:
    // music kept playing after leaving the room) - the cleanup itself DOES
    // fire correctly on a normal in-app navigation away from this route
    // (verified directly: pause() gets called both times, whether the
    // player uses the door or "<- Rooms"), so this is here for the cases
    // that aren't a clean unmount - the tab being closed/reloaded, or a
    // stray leftover instance surviving a dev-server hot-reload during
    // active editing (this file changed a lot across one long session) -
    // rather than any bug in the unmount path itself.
    const stopOnPageHide = () => {
      music.pause();
      ambience.pause();
    };
    window.addEventListener('pagehide', stopOnPageHide);

    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('pagehide', stopOnPageHide);
      music.pause();
      ambience.pause();
      musicRef.current = null;
      ambienceRef.current = null;
    };
  }, []);

  // Volume control + mute, requested directly. `volume` is a single master
  // slider (0..1) scaling both tracks' own relative mix (music quieter
  // than the chatter/dishes layer, same 0.12/0.18 balance as the original
  // fixed levels) rather than a separate slider per track - simpler control
  // for what's meant to read as one "room ambience" toggle. Muting doesn't
  // touch `volume` itself (so un-muting restores whatever level was set,
  // not a fresh default) and doesn't pause() either - pausing/resuming a
  // compressed audio file can produce an audible glitch at the seam,
  // silence via volume=0 doesn't.
  const [soundVolume, setSoundVolume] = useState(1);
  const [soundMuted, setSoundMuted] = useState(false);
  useEffect(() => {
    const scale = soundMuted ? 0 : soundVolume;
    if (musicRef.current) musicRef.current.volume = 0.12 * scale;
    if (ambienceRef.current) ambienceRef.current.volume = 0.18 * scale;
  }, [soundVolume, soundMuted]);

  const navigate = useNavigate();
  // The specialist's exposure-session guide (see GUIDE_STEP_KEYS' own
  // comment) - agreed on step by step with the user before building any
  // of it. `guideOpen` just shows/hides the panel. The two SUDS ratings
  // are items in the SAME single-file sequence as the 10 questions now
  // (requested directly: start should be the first "question", end the
  // last one, not framing the list above/below it) - index 0 is the
  // start rating, 1..GUIDE_STEP_KEYS.length are the questions, and
  // GUIDE_TOTAL_ITEMS-1 is the end rating. `completedItems` is a set of
  // indexes into that 12-item sequence (not a boolean array) since
  // marking one done doesn't need to touch the others - a plain toggle,
  // not a wizard that gates item N+1 on item N (requested directly for
  // the questions specifically: click a box, it advances, that's it -
  // not a forced order). `sudsStart`/`sudsEnd` hold the actual 0-10
  // values (nullable, so the results summary below only fires once both
  // are actually set - not just left at their default slider position).
  const GUIDE_TOTAL_ITEMS = GUIDE_STEP_KEYS.length + 2;
  const [guideOpen, setGuideOpen] = useState(false);
  const [sudsStart, setSudsStart] = useState<number | null>(null);
  const [sudsEnd, setSudsEnd] = useState<number | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const advanceGuideItem = useCallback((i: number) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);
  // First not-yet-completed item, or -1 once all 12 are - see the JSX
  // below for why only this one ever renders.
  const guideItemIndex = Array.from({ length: GUIDE_TOTAL_ITEMS }, (_, i) => i).findIndex(
    (i) => !completedItems.has(i),
  );

  // "When leaving, show the results" (requested directly) - now wired to
  // BOTH ways out of the room: the in-scene door (CafeEnvironment.tsx's
  // onDoorClick prop) and the "<- Rooms" overlay button below (moved into
  // this component from CafeRoomPage.tsx specifically so it could share
  // this same handler - it used to be a plain, uninterrupted <Link> there,
  // per an earlier, narrower request; this supersedes that). Falls
  // through to a normal navigate() if the guide was never used (both
  // ratings still null) - either exit behaves exactly as it did before
  // this feature existed until a specialist actually fills in both
  // ratings.
  const [showResults, setShowResults] = useState(false);
  const handleExit = useCallback(() => {
    if (sudsStart !== null && sudsEnd !== null) {
      setShowResults(true);
    } else {
      navigate('/rooms');
    }
  }, [sudsStart, sudsEnd, navigate]);

  const toggleOrderedItem = useCallback((table: number, id: MenuFoodId) => {
    setTableOrders((prev) =>
      prev.map((items, i) => {
        if (i !== table) return items;
        return items.includes(id) ? items.filter((existing) => existing !== id) : [...items, id];
      }),
    );
  }, []);
  const clearTable = useCallback((table: number) => {
    setTableOrders((prev) => prev.map((items, i) => (i === table ? [] : items)));
  }, []);

  return (
    <>
      <SceneLoader label={t('loading.room')} />
      {/* Moved in from CafeRoomPage.tsx (requested directly - the back
          button needs to share `handleExit` above, which needs guide
          state that only exists in here) - same "<- Rooms" pill/hint-text
          pair, just an onClick button now instead of a <Link>, since it
          may need to show the results summary instead of navigating
          straight there. */}
      <div className="room-overlay">
        <button type="button" className="room-overlay__back" onClick={handleExit}>
          {t('rooms.back')}
        </button>
        <p className="room-overlay__hint">{t('rooms.cafeHint')}</p>
      </div>
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
          <CafeEnvironment tableOrders={tableOrders} onDoorClick={handleExit} />
          {NPCS.map((npc, i) => (
            <NpcAvatar key={i} config={npc} />
          ))}
        </Suspense>
        <PlayerControls
          start={[0, 2.6]}
          startYaw={0}
          bounds={BOUNDS}
          seats={EMPTY_TABLE_SEATS}
          onNearSeatChange={setNearSeat}
          onSitChange={setSeatedSeat}
        />
      </Canvas>
      {/* Top-right stack: sound controls above the specialist's hints
          toggle/panel (requested directly - swapped from the original
          order), both persistent (not tied to sitting/proximity like the
          other overlays here) - one shared positioned wrapper so neither
          has to guess the other's height to avoid overlapping. */}
      <div className="top-right-controls">
        {/* Volume/mute control for the ambient sound (audio effect further
            up this file) - the slider stays interactive even while muted
            (dragging it doesn't un-mute) - only the mute button itself
            toggles `soundMuted`, matching how a normal OS volume control
            behaves. */}
        <div className="sound-controls">
          <button
            type="button"
            className="sound-controls__mute"
            aria-pressed={soundMuted}
            aria-label={t(soundMuted ? 'cafe.sound.unmute' : 'cafe.sound.mute')}
            title={t(soundMuted ? 'cafe.sound.unmute' : 'cafe.sound.mute')}
            onClick={() => setSoundMuted((m) => !m)}
          >
            <SpeakerIcon muted={soundMuted} />
          </button>
          <input
            type="range"
            className="sound-controls__volume"
            min={0}
            max={1}
            step={0.01}
            value={soundVolume}
            aria-label={t('cafe.sound.volume')}
            onChange={(e) => setSoundVolume(Number(e.target.value))}
          />
        </div>
        {/* The specialist's exposure-session hints, requested directly -
            styled like rooms.cafeHint's own "Drag to look around..." pill
            (explicitly asked for that same look), just an actual button
            instead of a plain paragraph. Called "hints" (подсказки), not
            "guide" (гайд) - requested directly, renamed from the first
            version. Closed by default - the panel it opens is the
            declutter mechanism itself (see .guide-panel's own comment),
            this pill is the only thing on screen until a specialist wants
            it. */}
        <button
          type="button"
          className="guide-toggle"
          aria-expanded={guideOpen}
          onClick={() => setGuideOpen((o) => !o)}
        >
          {t('cafe.guide.toggle')}
        </button>
        {guideOpen && (
          <div className="guide-panel">
            <h2 className="guide-panel__title">{t('cafe.guide.title')}</h2>
            {/* One item at a time, requested directly ("одно -
                зачёркиваешь - показывают другое") - and the two SUDS
                ratings are items IN this same sequence now (also
                requested directly: start as the first "question", end as
                the last one, not framing the list above/below it), not a
                separate always-visible pair. Only the first not-yet-
                completed item ever renders - `guideItemIndex` 0 is the
                start rating, GUIDE_TOTAL_ITEMS-1 the end rating, everything
                between is GUIDE_STEP_KEYS. Highlighted as its own card
                (requested directly: the hints should stand out, not read
                as plain body text) rather than a plain checkbox row. */}
            {guideItemIndex === -1 ? (
              <p className="guide-panel__done">{t('cafe.guide.done')}</p>
            ) : guideItemIndex === 0 ? (
              <div className="guide-panel__item">
                <span className="guide-panel__item-text">{t('cafe.guide.suds.start')}</span>
                <div className="guide-panel__suds-row">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={sudsStart ?? 5}
                    onChange={(e) => setSudsStart(Number(e.target.value))}
                  />
                  <strong>{sudsStart ?? '–'}</strong>
                </div>
                <button type="button" className="guide-panel__next" onClick={() => advanceGuideItem(0)}>
                  {t('cafe.guide.next')}
                </button>
              </div>
            ) : guideItemIndex === GUIDE_TOTAL_ITEMS - 1 ? (
              <div className="guide-panel__item">
                <span className="guide-panel__item-text">{t('cafe.guide.suds.end')}</span>
                <div className="guide-panel__suds-row">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={sudsEnd ?? 5}
                    onChange={(e) => setSudsEnd(Number(e.target.value))}
                  />
                  <strong>{sudsEnd ?? '–'}</strong>
                </div>
                <button
                  type="button"
                  className="guide-panel__next"
                  onClick={() => advanceGuideItem(GUIDE_TOTAL_ITEMS - 1)}
                >
                  {t('cafe.guide.next')}
                </button>
              </div>
            ) : (
              <label className="guide-panel__item guide-panel__item--step">
                <input type="checkbox" checked={false} onChange={() => advanceGuideItem(guideItemIndex)} />
                <span className="guide-panel__item-text">{t(GUIDE_STEP_KEYS[guideItemIndex - 1])}</span>
              </label>
            )}
          </div>
        )}
      </div>
      {/* The guide's own results summary, requested directly - shown
          instead of navigating away the moment either exit is used, but
          only once both SUDS ratings are actually set (see handleExit
          above); "Выйти" here is what actually calls navigate(). */}
      {showResults && (
        <div className="guide-results-overlay">
          <div className="guide-results-modal">
            <h2>{t('cafe.guide.results.title')}</h2>
            <div className="guide-results-row">
              <span>{t('cafe.guide.results.before')}</span>
              <strong>{sudsStart}</strong>
            </div>
            <div className="guide-results-row">
              <span>{t('cafe.guide.results.after')}</span>
              <strong>{sudsEnd}</strong>
            </div>
            <button type="button" className="guide-results-continue" onClick={() => navigate('/rooms')}>
              {t('cafe.guide.results.continue')}
            </button>
          </div>
        </div>
      )}
      {/* The sit-down hint, requested directly - only shown while standing
          (seatedSeat null) AND close enough to click a seat. Doesn't need
          the SceneLoader's careful positioning since it's just a small
          pill like rooms.cafeHint's own, not a full panel. */}
      {nearSeat !== null && seatedSeat === null && <div className="sit-hint">{t('cafe.sit.hint')}</div>}
      {/* The table-menu overlay - shown for as long as the player is
          sitting, at whichever of the two empty tables they sat at.
          Replaced the old walk-up-to-the-counter menu entirely (requested
          directly - it was a static list of drinks with no real dishes
          behind it, now redundant next to this one actually putting food
          on a table). Each item toggles independently (requested
          directly: add AND remove, not a single choice that replaces the
          last one) - both seats at one table share its order, same as a
          real shared table would. CafeEnvironment.tsx's TableOrder then
          renders whichever items are in the list, each at its own fixed
          slot around that table. Stays open while sitting (not dismissed
          on pick) so changing the order doesn't need standing up and
          sitting back down. */}
      {seatedTable !== null && (
        <div className="table-menu">
          <h2 className="table-menu__title">{t('table.menu.title')}</h2>
          <p className="table-menu__hint">{t('table.menu.hint')}</p>
          <ul className="table-menu__list">
            {MENU_FOOD_ITEMS.map((item) => {
              const selected = tableOrders[seatedTable].includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={'table-menu__item' + (selected ? ' table-menu__item--selected' : '')}
                    aria-pressed={selected}
                    onClick={() => toggleOrderedItem(seatedTable, item.id)}
                  >
                    {t(item.nameKey)}
                  </button>
                </li>
              );
            })}
          </ul>
          {tableOrders[seatedTable].length > 0 && (
            <button type="button" className="table-menu__clear" onClick={() => clearTable(seatedTable)}>
              {t('table.menu.clear')}
            </button>
          )}
        </div>
      )}
    </>
  );
}

// The sound-controls mute button's own icon - a plain inline SVG rather
// than pulling from public/icons.svg (that sprite is unused everywhere
// else in this app - only brand/social icons, nothing sound-related - so
// there's no existing pattern to extend for one button). Two static
// states (muted/unmuted), no animation.
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M16 9l6 6M22 9l-6 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}
