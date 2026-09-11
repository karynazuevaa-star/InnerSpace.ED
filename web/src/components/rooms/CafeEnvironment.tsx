import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { cloneGltfScene } from '../../avatar/cloneGltf';

/**
 * A small neighbourhood cafe interior - built from plain primitives, same
 * approach as components/Room.tsx, so it needs no new model assets. Floor
 * runs roughly x:[-5,5] z:[-5.5,3.5]; CafeScene.tsx clamps the player inside
 * that with a margin from the walls.
 */
export function CafeEnvironment({
  tableOrders,
  onDoorClick,
}: {
  tableOrders?: MenuFoodId[][];
  // Requested directly, alongside the specialist's exposure guide (see
  // CafeScene.tsx's own comment): if the guide's before/after anxiety
  // ratings are both filled in, leaving via the door should show a quick
  // results summary first instead of navigating straight to /rooms - that
  // decision (and the actual navigate() call) lives in CafeScene, not
  // here, since it needs state (the two ratings) this component doesn't
  // otherwise touch. Door just calls whatever it's handed.
  onDoorClick?: () => void;
} = {}) {
  return (
    <group>
      <mesh position={[0, 0, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 9]} />
        <meshStandardMaterial color="#3f3226" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, 3.1, -5.4]} receiveShadow>
        <planeGeometry args={[10, 6.4]} />
        <meshStandardMaterial color="#5a4636" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[-5, 3.1, -1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[9, 6.4]} />
        <meshStandardMaterial color="#4f4030" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[5, 3.1, -1]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[9, 6.4]} />
        <meshStandardMaterial color="#4f4030" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 6.3, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 9]} />
        <meshStandardMaterial color="#2a221b" roughness={1} metalness={0} />
      </mesh>

      {/* Requested directly: a door somewhere in the room - the room's own
          open front edge (z=3.5, where the player starts) was never an
          actual walled entrance, just where the floor plane runs out, so
          there was nowhere a door could sit without one. Placed on the
          right wall instead, near that same open front corner, clear of
          table2's own footprint. Plain primitives, not another downloaded
          asset - this session's own asset weight is exactly what made the
          room stutter while walking (see BreadPack's own pipeline note),
          so a login-free box-and-frame door was the right call here, not
          one more glb. */}
      <Door position={[4.94, 0, 2.6]} onClick={onDoorClick} />

      <Counter position={[-2.8, 0, -5.05]} />
      <PendantLight position={[-2.8, 2.6, -4.4]} />

      {/* Two empty tables, requested directly - somewhere for the room to
          read as a real cafe with more seating than is currently in use.
          One in the open middle of the room, the other off to the side
          (see its own comment below for that table's own history). Chairs
          added in a follow-up request, same north/south pulled-in pattern
          every
          other 2-seat table here uses (0.62m from center, facing the
          table). These are also the four EMPTY_TABLE_SEATS PlayerControls
          sits the camera at - see CafeScene.tsx's own comment on the
          click-to-sit feature - so if these positions/rotations ever
          change, that array needs to match. */}
      <Table position={[0, 0, -1]} />
      <Chair position={[0, 0, -0.38]} rotationY={Math.PI} />
      <Chair position={[0, 0, -1.62]} rotationY={0} />
      <TableOrder items={tableOrders?.[0] ?? []} tableCenter={[0, 0.74, -1]} />
      {/* Moved several times, requested directly, chasing a few different
          screenshots-with-arrows: a "ring" spot between table2/table4
          (too central), a back-right pocket, right against the door, just
          off the door - none quite matched. Latest arrow circled open
          floor roughly HALFWAY between the door/table2 side and table4,
          not hugging any wall - landed here, clear of every neighbor by
          ~2.2m+ (table2, table4, EmptyA) and the door by ~3.75m. */}
      <Table position={[1.6, 0, 0.9]} />
      <Chair position={[1.6, 0, 1.52]} rotationY={Math.PI} />
      <Chair position={[1.6, 0, 0.28]} rotationY={0} />
      <TableOrder items={tableOrders?.[1] ?? []} tableCenter={[1.6, 0.74, 0.9]} />

      <Table position={[1.6, 0, -3.4]} />
      <Chair position={[1.6, 0, -2.78]} rotationY={Math.PI} />
      <Chair position={[2.22, 0, -3.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[1.6, 2.6, -3.4]} />
      {/* Requested directly: bigger ramen, and more/bigger sushi alongside
          it - a size bump on both from the first pass, plus a second sushi
          board. This table's hand-holding/fork-hand targets (TABLE1_HAND_
          UPPER/LOWER, TABLE1_*_FORK_HAND in CafeScene.tsx) already claim
          most of this table's small 0.42 radius, so the two boards sit on
          opposite sides of the ramen bowl rather than symmetric around the
          table center, staying clear of those points. */}
      <RamenBowl position={[1.6, 0.74, -3.6]} scale={0.46} />
      {/* Requested directly: bigger again, one board in front of EACH of
          them, and straightened out - the previous pass's odd rotationY
          values (0.4/-1.0, picked to dodge the hand-hold points) left both
          boards sitting at a diagonal that read as strewn across the
          table rather than set down in front of anyone (reported
          directly, with a screenshot). Each board's long axis now lies
          along that seat's own straight line to the table center instead
          - lace_ruffle's seat is due north of center, so hers runs
          north-south (rotationY=90deg turns the board's native east-west
          length to match); male_heavier's seat is due east, so his needs
          no extra rotation at all, already running east-west. */}
      <Sushi position={[1.6, 0.74, -3.08]} rotationY={Math.PI / 2} scale={0.3} />
      <Sushi position={[1.9, 0.74, -3.35]} rotationY={0} scale={0.3} />

      {/* Seats were 0.9m from the table center (vs table1's 0.62m) - left a
          visible ~27cm gap between the chairs and the table edge, reading
          as too far back to plausibly reach their own plates (reported
          directly, with a screenshot). Pulled in to the same 0.62m table1
          already uses.
          That fix alone then put the two chairs uncomfortably close
          TO EACH OTHER, not just the table - both had moved toward the
          same center point while staying at adjacent (90 degrees apart)
          corners, so the gap between them shrank along with the gap to
          the table (reported directly, with a screenshot of their legs
          nearly overlapping under the table). Moved the second chair to
          the opposite (south) side instead of the adjacent (east) one -
          same 0.62m from center either way, but now 1.24m from the other
          chair instead of 0.88m, close to what the original, too-far-out
          arrangement had (1.27m) without giving back the table-distance
          fix.
          Fitting a plate AND a resting hand on the same side of the
          default 0.42-radius table then read as the hand overlapping its
          own plate (reported directly, with a screenshot) - not enough
          room at that size for both without crowding. Widened to 0.46
          (same idea as table5's own radius bump) and moved the plates in
          to 0.15m off-center (from 0.2m) to free up more of the outer
          ring for TABLE2_*_LEFT_HAND, which moved out to 0.22m lateral
          (from 0.15m) in CafeScene.tsx - together these leave ~17cm
          between a hand and its own plate instead of the original ~8cm. */}
      <Table position={[3.4, 0, -0.4]} radius={0.46} />
      <Chair position={[3.4, 0, 0.22]} rotationY={Math.PI} />
      <Chair position={[3.4, 0, -1.02]} rotationY={0} />
      <PendantLight position={[3.4, 2.6, -0.4]} />
      {/* Requested directly: a real dish per guy instead of the shared
          primitive plate - roast chicken for the one nearer the north
          seat (male_average), pizza for the one nearer the south seat
          (male_casualsuit), same spots the old FoodPlate pair used. */}
      <RoastChicken position={[3.4, 0.74, -0.25]} rotationY={0.6} />
      <Pizza position={[3.4, 0.74, -0.55]} />
      {/* A held, animated fork proved hard to get looking right for every
          character's own rig (reported directly, repeatedly) - simplified
          for these two to a fork resting by the plate instead, the same
          way a person might have set it down between bites. Their own
          'eating' arm motion is unchanged, it just isn't holding anything
          now. */}
      <Fork position={[3.55, 0.744, -0.25]} rotationY={-Math.PI / 2} />
      <Fork position={[3.55, 0.744, -0.55]} rotationY={-Math.PI / 2} />

      {/* Moved closer to table5's trio (-3.6,-2.0) a second time, requested
          directly - table2/EmptyB/table4/EmptyA had ended up reading as
          crowded together in the first pass (see EmptyB's own comment
          below), so this time table3 moves ON ITS OWN toward table5 (not
          alongside table4 - see table4's own comment on why it moves a
          different amount now) to actually close that gap: down to ~1.87m
          between table centers, from the original ~3.4m, while still
          leaving a good ~0.6m of clearance to table5's own nearest chair.
          (A further "push it toward the wall" pass briefly landed here too,
          then turned out to actually be about EmptyB, not this table - see
          EmptyB's own comment below for that move instead.) */}
      <Table position={[-3.1, 0, -0.2]} />
      <Chair position={[-3.1, 0, 0.7]} rotationY={Math.PI} />
      {/* This second chair - nobody's own seat, table3 is a solo table -
          had stayed at the original too-far 0.9m offset this whole time
          (every OTHER table's seats were pulled in to 0.62m specifically
          because they had an NPC visibly sitting too far from their own
          table; this one never got the same fix since nobody sits here to
          report it looking off). Requested directly once the crowding
          pass above put table3 back under scrutiny - pulled in to the
          same 0.62m every other table here uses. */}
      <Chair position={[-2.48, 0, -0.2]} rotationY={-Math.PI / 2} />
      <PendantLight position={[-3.1, 2.6, -0.2]} />
      {/* Requested directly: this solo seat's plain coffee-cup primitive
          swapped for the real pink teacup, same as the two girls at
          table4 below get. */}
      <PinkCoffee position={[-3.1, 0.74, 0.0]} />

      {/* Same "too far from a too-small table" pattern already fixed for
          table2/table5 (0.9m seats around a 0.42-radius table) - reported
          directly, with a screenshot. Same proven fix, reused wholesale:
          table2's exact radius/seat-distance pair (0.46 table, 0.62m
          seats), and seated opposite each other (north/south) rather than
          at the original adjacent (north/east) corners - table2's own
          comment covers why adjacent corners at a pulled-in distance read
          as the two of them crowding each other, not just the table. */}
      {/* Moved again, requested directly, this time by a DIFFERENT amount
          than table3 (not the same rigid shift as last time) - the whole
          table2/EmptyB/table4/EmptyA stretch had ended up sitting too
          close together (reported directly, with a screenshot), while
          table3 had a lot of open floor between it and table5. Pulled in
          from [0.3,1.2] enough to open real breathing room on both of
          EmptyB's sides (its own comment below has the exact before/after
          gaps) without landing on top of table3's own new spot or EmptyA. */}
      <Table position={[-0.6, 0, 0.9]} radius={0.46} />
      <Chair position={[-0.6, 0, 1.52]} rotationY={Math.PI} />
      <Chair position={[-0.6, 0, 0.28]} rotationY={0} />
      <PendantLight position={[-0.6, 2.6, 0.9]} />
      {/* Requested directly: a cake and a pink coffee EACH for the two
          girls here (polka_skirt north at z=2.42, tiered_dress south at
          z=1.18) instead of the one shared primitive plate - four props,
          one pair per seat, offset to either side of that seat's own
          radial line from the table center so a cake and its coffee sit
          next to each other without touching.
          The south pair sat right under tiered_dress's own fixed resting
          hand (TABLE4_TIERED_RIGHT_HAND in CafeScene.tsx, [0.28, 1.45]) -
          her hand was clipping straight into the cake (reported directly,
          with a screenshot). Moved to the opposite side of that point
          instead, safely clear of it. */}
      <Cake position={[-0.75, 0.74, 1.15]} />
      <PinkCoffee position={[-0.48, 0.74, 1.15]} />
      <Cake position={[-0.35, 0.74, 0.65]} />
      <PinkCoffee position={[-0.52, 0.74, 0.52]} />
      <Fork position={[-0.45, 0.744, 0.75]} rotationY={-Math.PI / 2} />

      {/* Three chairs at 0.9m from a table sized for two (0.42 radius,
          same as every other table here) put the legs of all three -
          converging on that same small center - in each other's way
          (reported directly, with a screenshot). Both widened: the table
          itself to 0.55 (up from 0.42) and the seats pulled in to 0.76m
          (down from 0.9) - front edge of a chair now sits almost flush
          with the bigger table's edge, same margin table1/table2 already
          use successfully, rather than the exposed gap the old 0.9m/0.42
          pairing left. */}
      <Table position={[-3.6, 0, -2.0]} radius={0.55} />
      <Chair position={[-3.6, 0, -1.24]} rotationY={Math.PI} />
      <Chair position={[-2.84, 0, -2.0]} rotationY={-Math.PI / 2} />
      <Chair position={[-4.36, 0, -2.0]} rotationY={Math.PI / 2} />
      <PendantLight position={[-3.6, 2.6, -2.0]} />
      {/* Same simplification as table2 - a fork resting by each plate
          instead of an animated held one, one per seat since all three
          rotate through the eat role here (see computeConversationRole in
          idleAnimation.tsx). Offset outward from each plate along the
          same radial direction from the table center, tines turned back
          toward the plate. */}
      <Fork position={[-3.6, 0.744, -1.7]} rotationY={Math.PI} />
      <Fork position={[-3.2, 0.744, -2.0]} rotationY={-Math.PI / 2} />
      <Fork position={[-4.0, 0.744, -2.0]} rotationY={Math.PI / 2} />
      {/* A shared seafood-and-ramen spread for the whole table, requested
          directly - "a rich table" for this trio, not just their own
          individual plates. Filling the gaps the three personal
          plates/forks above leave open (those sit toward N/E/W - see
          their own comment), at a slightly bigger radius so nothing
          overlaps a plate, a fork, or a chair back. */}
      <SeafoodDish url={SEAFOOD_CRAB_URL} position={[-3.35, 0.745, -2.3]} />
      <SeafoodDish url={SEAFOOD_FISH_URL} position={[-3.85, 0.745, -2.3]} />
      <SeafoodDish url={SEAFOOD_SCALLOPS_URL} position={[-3.6, 0.745, -2.44]} />
      <SeafoodDish url={SEAFOOD_SHRIMP_URL} position={[-3.35, 0.745, -1.75]} />
      <RamenBowl position={[-3.85, 0.74, -1.75]} />
      {/* Requested directly: even more food in the middle of this table -
          a second crab plate as a centerpiece, right at the table's own
          center point, which the spread above left empty. */}
      <SeafoodDish url={SEAFOOD_CRAB_URL} position={[-3.6, 0.745, -2.0]} />
    </group>
  );
}

// A downloaded, realistic ramen bowl - swapped in for one table's plain
// FoodPlate primitive (requested directly: something closer to an actual
// restaurant dish). Native footprint is much bigger than the primitive
// plate it replaces (chopsticks resting across the rim extend it well past
// the bowl itself) - scaled down to sit in the same footprint a FoodPlate
// used to.
const RAMEN_URL = '/models/props/food/ramen.glb';

function RamenBowl({ position, scale = 0.36 }: { position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF(RAMEN_URL);
  return (
    <group position={position} scale={scale}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
useGLTF.preload(RAMEN_URL);

// Four downloaded seafood dishes (a "sea_food" pack pulled apart the same
// way food_pack and bread_pack were - see the pipeline's own proximity-
// clustering script, since this pack's objects weren't grid-aligned the
// way food_pack's were) - requested directly: pile one table's spread with
// seafood and ramen so it reads as a rich, well-stocked table rather than
// the plain single-plate-per-seat every other table has. The fish dish's
// own cluster came out fused with a neighboring black-seaweed-knots dish
// (they were close enough in the source scene to land in the same
// proximity cluster) - left as one combined piece rather than split back
// apart, since it still reads fine as a single fuller dish.
const SEAFOOD_CRAB_URL = '/models/props/food/seafood_crab.glb';
const SEAFOOD_FISH_URL = '/models/props/food/seafood_fish.glb';
const SEAFOOD_SCALLOPS_URL = '/models/props/food/seafood_scallops.glb';
const SEAFOOD_SHRIMP_URL = '/models/props/food/seafood_shrimp.glb';
[SEAFOOD_CRAB_URL, SEAFOOD_FISH_URL, SEAFOOD_SCALLOPS_URL, SEAFOOD_SHRIMP_URL].forEach((url) =>
  useGLTF.preload(url),
);
// Raw plates are ~2.3-2.8 units across in the pack's own oversized units -
// scaled down to a ~0.25m shared serving plate, same idea as FOOD_TRAY_
// SCALE's own comment.
const SEAFOOD_DISH_SCALE = 0.1;

function SeafoodDish({ url, position }: { url: string; position: [number, number, number] }) {
  const { scene: template } = useGLTF(url);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} scale={SEAFOOD_DISH_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

// A downloaded roast chicken - one of two real dishes (this one and Pizza,
// below) that replaced the last of this table's primitive FoodPlate props,
// requested directly for the two guys sitting here: one dish per seat, not
// interchangeable, hence two separate components rather than reusing one
// generic "table2 plate" for both. Native bbox is ~2x1.3x0.9 in the
// model's own oversized units - scaled down to a real roast-chicken-on-a-
// platter length (~0.35m).
const CHICKEN_URL = '/models/props/food/chicken.glb';
const CHICKEN_SCALE = 0.18;

function RoastChicken({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTF(CHICKEN_URL);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={CHICKEN_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
useGLTF.preload(CHICKEN_URL);

// The second guy's dish (see RoastChicken's own comment) - a whole pizza,
// not a slice. "pizza_scan" in its own filename - a photogrammetry scan,
// which is why its native scale is so far off real-world size (~12 units
// across) compared to every hand-modeled asset here.
const PIZZA_URL = '/models/props/food/pizza.glb';
const PIZZA_SCALE = 0.023;

function Pizza({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTF(PIZZA_URL);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={PIZZA_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
useGLTF.preload(PIZZA_URL);

// A sushi board - the couple's table (table1) already had a ramen bowl
// from an earlier pass; requested directly to add sushi alongside it
// rather than replace it. Raw position is far from the origin (same "the
// artist's own scene origin, not the asset" pattern Ramen's own file had)
// - recentred in the pipeline, not here.
const SUSHI_URL = '/models/props/food/sushi.glb';
const SUSHI_SCALE = 0.17;

function Sushi({
  position,
  rotationY = 0,
  scale = SUSHI_SCALE,
}: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  const { scene: template } = useGLTF(SUSHI_URL);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
useGLTF.preload(SUSHI_URL);

// A single small cake, and a pink teacup-and-saucer - table4's pair of
// girls each get one of each (four props total), requested directly.
// Both used more than once (two seats), so both clone their template the
// same way SeafoodDish/FoodTray do, rather than useGLTF's shared instance
// FoodPlate's old single-plate-per-table callers never needed to worry
// about. Cake's own native size (~0.21m across) already reads as a real
// small cake, so it keeps close to scale=1 rather than the aggressive
// scale-down every oversized-unit asset here needs. PinkCoffee's own
// cup+saucer came in oversized instead (~1 unit across for what should be
// a ~15cm saucer) and needed decimating hard in the pipeline (1.7M
// vertices down to a tenth) before it was light enough to place three of
// around this room.
const CAKE_URL = '/models/props/food/cake.glb';
const CAKE_SCALE = 0.85;
const PINK_COFFEE_URL = '/models/props/food/pink_coffee.glb';
const PINK_COFFEE_SCALE = 0.14;
[CAKE_URL, PINK_COFFEE_URL].forEach((url) => useGLTF.preload(url));

function Cake({ position }: { position: [number, number, number] }) {
  const { scene: template } = useGLTF(CAKE_URL);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} scale={CAKE_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

function PinkCoffee({ position }: { position: [number, number, number] }) {
  const { scene: template } = useGLTF(PINK_COFFEE_URL);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} scale={PINK_COFFEE_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

// An eighth table-menu item, requested directly - a tray of cinnamon
// rolls, pulled from the same bread_pack download as the counter's own
// BreadPack (a *different* cluster of it than BreadPack's own bun.glb
// source pulls from - see the pipeline note on why the extraction had to
// be redone: BreadPack's copy had already been merged into 9 combined
// draw-call meshes by the time this was requested, which collapses the
// per-tray boundaries a fresh cluster-and-export pass needs). Single use
// (one menu item, one table slot), so left un-joined like every other
// single-use prop here - joining only pays for itself when something's
// instantiated many times over, not once.
const BUN_URL = '/models/props/food/bun.glb';
const BUN_SCALE = 0.43;
useGLTF.preload(BUN_URL);

function Bun({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF(BUN_URL);
  return (
    <group position={position} scale={BUN_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

// The sit-down table-menu feature, requested directly: pick something and
// it appears on your table - and later extended to allow MULTIPLE items
// on one table at once (toggle each on/off, not a single radio-button
// choice), plus these two extra items (bun, fish). Deliberately reuses
// already-loaded single-item props (not the seafood TABLE's own multi-
// piece spread, which is scene-specific to that table) rather than
// downloading anything new - every one of these eight is already being
// fetched for another table regardless (fish reuses SEAFOOD_FISH_URL/
// SeafoodDish, the same combined fish+seaweed-knots dish table5 already
// has), matching "чтобы весило меньше всего" (whichever weighs the
// least) directly. CafeScene.tsx owns the actual UI list and per-table
// order state (which items each table has, if any) and imports
// MENU_FOOD_ITEMS from here so the two files can't drift out of sync on
// what a given id means; this file only needs to know how to render one
// once ordered, and where each item's own fixed slot sits around a
// table (see TableOrder's own comment on why the slot is fixed per-item
// rather than packed in pick order).
export const MENU_FOOD_ITEMS = [
  { id: 'cake', nameKey: 'table.menu.cake' },
  { id: 'pinkCoffee', nameKey: 'table.menu.pinkCoffee' },
  { id: 'pizza', nameKey: 'table.menu.pizza' },
  { id: 'ramen', nameKey: 'table.menu.ramen' },
  { id: 'sushi', nameKey: 'table.menu.sushi' },
  { id: 'chicken', nameKey: 'table.menu.chicken' },
  { id: 'bun', nameKey: 'table.menu.bun' },
  { id: 'fish', nameKey: 'table.menu.fish' },
] as const;
export type MenuFoodId = (typeof MENU_FOOD_ITEMS)[number]['id'];

function OrderedFoodItem({ itemId, position }: { itemId: MenuFoodId; position: [number, number, number] }) {
  switch (itemId) {
    case 'cake':
      return <Cake position={position} />;
    case 'pinkCoffee':
      return <PinkCoffee position={position} />;
    case 'pizza':
      return <Pizza position={position} />;
    case 'ramen':
      return <RamenBowl position={position} />;
    case 'sushi':
      return <Sushi position={position} />;
    case 'chicken':
      return <RoastChicken position={position} />;
    case 'bun':
      return <Bun position={position} />;
    case 'fish':
      return <SeafoodDish url={SEAFOOD_FISH_URL} position={position} />;
    default:
      return null;
  }
}

// One of the two empty tables' full order - every item in MENU_FOOD_ITEMS
// gets its OWN fixed slot around the table (evenly spaced at 0.3m radius,
// one per 360/8 = 45deg), rather than items packing in wherever the next
// open spot is as they're picked - so a table with cake and ramen looks
// the same regardless of which one was ordered first, and un-ordering one
// item doesn't shuffle the others. `items` are only ever a subset of
// MENU_FOOD_ITEMS' ids (CafeScene.tsx's own per-table state); anything not
// present just renders nothing at its slot.
const TABLE_ORDER_SLOT_RADIUS = 0.3;

function TableOrder({ items, tableCenter }: { items: MenuFoodId[]; tableCenter: [number, number, number] }) {
  return (
    <>
      {MENU_FOOD_ITEMS.map((item, i) => {
        if (!items.includes(item.id)) return null;
        const angle = (i / MENU_FOOD_ITEMS.length) * Math.PI * 2;
        const position: [number, number, number] = [
          tableCenter[0] + Math.cos(angle) * TABLE_ORDER_SLOT_RADIUS,
          tableCenter[1],
          tableCenter[2] + Math.sin(angle) * TABLE_ORDER_SLOT_RADIUS,
        ];
        return <OrderedFoodItem key={item.id} itemId={item.id} position={position} />;
      })}
    </>
  );
}

// A fork resting flat on the table, next to a plate - for a seat whose
// 'eating' activity moves the arm without a fork in hand (see
// idleAnimation.tsx's SeatedPose - `holdsFork` is opt-in now, not
// automatic from the activity, after an animated held fork proved hard to
// get looking right for every character's own rig). Same proportions as
// the held fork prop in idleAnimation.tsx's buildForkProp, just lying on
// its side instead of gripped upright.
function Fork({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.006, -0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.006, 0.007, 0.1, 8]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.006, 0.005]} castShadow receiveShadow>
        <boxGeometry args={[0.02, 0.003, 0.035]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.3} metalness={0.7} />
      </mesh>
      {[-0.007, -0.0025, 0.0025, 0.007].map((dx) => (
        <mesh key={dx} position={[dx, 0.006, 0.035]} castShadow receiveShadow>
          <cylinderGeometry args={[0.0012, 0.0012, 0.026, 6]} />
          <meshStandardMaterial color="#cfcfcf" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Was a plain bar (a shelf of empty cups), then a wooden counter box with a
// standing chalkboard-style menu sign and two primitive FoodPlate props on
// top - requested directly: swap that in for a real vitrine/display-case
// model so the counter itself reads as "dishes on display" instead of a
// sign explaining it (each Vitrine instance is a full counter-height glass
// case, ~1.77m long at its native scale, not a fixture that sits on top of
// another counter - see Counter's own comment further down for how many
// there are now and how they're spread along the wall). No in-scene "MENU"
// label any more, now that there's real food to look at instead - and no
// walk-up-to-the-counter HTML menu either any more: that whole feature
// (CounterProximityWatcher, the cafe.menu.* translations) was removed once
// the sit-down table menu (see TableOrder/MENU_FOOD_ITEMS further down)
// gave players real dishes to look at up close instead of a static list of
// drinks with nothing behind them.
const VITRINE_URL = '/models/props/food/vitrine.glb';
// Native scale: ~0.593 wide (front-to-back) x ~1.767 long x ~1.034 tall,
// pivoted at the base (see pipeline note below). The model's glass front
// faces its own local +X - rotationY=-90deg turns that to face world +Z,
// i.e. toward the room/player, matching the old counter's orientation.

// Shelf interior, measured off the model's own two mesh pieces (Glass_
// Glass_0 = the panes, Glass_Vitrin_0 = the wood body) rather than guessed:
// the glass spans y=[0.138, 0.716] with the wood divider between the two
// shelves roughly at its midpoint (0.427) - lower shelf floor a hair above
// the bottom pane edge, upper shelf floor a hair above the divider. Both
// stay well below the slanted glass roof that starts above y=0.716 (see
// FoodTray's own comment on why that slant doesn't matter here), and the
// panes' own x range ([-0.248, 0.259], the case's front-to-back depth)
// gives the usable shelf depth to place items within.
const VITRINE_SHELF_LOWER_Y = 0.15;
const VITRINE_SHELF_UPPER_Y = 0.44;

function VitrineCase({ position, children }: { position: [number, number, number]; children?: ReactNode }) {
  const { scene: template } = useGLTF(VITRINE_URL);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={scene} dispose={null} />
      {/* The cabinet interior gets none of the room's own light (only the
          PendantLight above reaches the counter TOP) - without its own
          light, the trays behind the glass rendered as solid black,
          unreadable even after making the glass itself see-through
          (reported directly, with a screenshot - see the Glass material's
          own pipeline note). One warm point light per case (not one per
          shelf - five cases' worth of two lights each was part of the
          in-game stutter reported directly once the counter grew to five
          cases, see the Counter/BreadPack pipeline notes on the bigger
          half of that fix), centered between the two shelf heights with
          enough range to still reach both. */}
      <pointLight
        position={[0, (VITRINE_SHELF_LOWER_Y + VITRINE_SHELF_UPPER_Y) / 2 + 0.1, 0]}
        color="#ffcf94"
        intensity={0.4}
        distance={1.4}
        decay={2}
      />
      {children}
    </group>
  );
}
useGLTF.preload(VITRINE_URL);

// Eight downloaded meal-prep trays (a "food pack" pulled apart into its
// individual dishes the same way BreadPack's own source was, minus the two
// cells that came out as bare, contentless fragments - see the pipeline's
// own row/column clustering script) - requested directly: real dishes
// sitting on the shelves BEHIND the glass, not on top with the pastries.
// Placed inside VitrineCase's own already-rotated group (as `children`,
// alongside the case's own primitive), so these positions are in the
// VITRINE's local pre-rotation frame - the same frame VITRINE_SHELF_*_Y
// and the vitrine's own bbox comment above were measured in - rather than
// needing their own separate rotation math the way BreadPack (a sibling
// of VitrineCase, not a child) needed its own -90deg turn.
const FOOD_TRAY_URLS = [
  '/models/props/food/food_tray_1.glb',
  '/models/props/food/food_tray_2.glb',
  '/models/props/food/food_tray_3.glb',
  '/models/props/food/food_tray_4.glb',
  '/models/props/food/food_tray_5.glb',
  '/models/props/food/food_tray_6.glb',
  '/models/props/food/food_tray_7.glb',
  '/models/props/food/food_tray_8.glb',
];
FOOD_TRAY_URLS.forEach((url) => useGLTF.preload(url));
// Raw download is ~6.8 x 10.5 (depth x length) in the pack's own oversized
// units - scaled down until a tray's length comes out to ~0.35m, small
// enough that two sit side by side along a shelf's ~1.68m usable length
// (VITRINE_SHELF_*_Y's own comment) with clear margin at both ends and
// between each other.
const FOOD_TRAY_SCALE = 0.033;

function FoodTray({ url, position }: { url: string; position: [number, number, number] }) {
  const { scene: template } = useGLTF(url);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} scale={FOOD_TRAY_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

// One shelf's worth of trays (two, side by side along the case's length -
// see FOOD_TRAY_SCALE's own comment) - a small helper since every shelf in
// both cases places its pair the same way, just at a different height and
// with different dishes.
function ShelfTrays({ y, urls }: { y: number; urls: [string, string] }) {
  return (
    <>
      <FoodTray url={urls[0]} position={[0, y, -0.35]} />
      <FoodTray url={urls[1]} position={[0, y, 0.35]} />
    </>
  );
}

// The full downloaded bakery pack (all 6 pastry trays, not just one) -
// requested directly, after an initial version only put the single
// lightest tray on top. The pack's native geometry (526k tris across 113
// small meshes, several 1024x1024 PNGs per pastry type) was far too heavy
// for a background prop as downloaded - decimated to ~12% of its original
// vertex count (gltf-transform simplify) and its textures resized to
// 512x512 before this file was committed. Originally left those 113 meshes
// unjoined - gltf-transform's own join command grows the download (4.3MB
// to 8.7MB, duplicating vertex data to merge dissimilar primitives) - on
// the assumption a bigger download mattered more than the draw calls. It
// didn't: once the counter grew to five BreadPack instances (see Counter's
// own comment) that was 565 draw calls from bread alone, and the in-game
// stutter while walking that caused (reported directly) mattered far more
// than an extra few MB fetched once and cached. Joined after all - down to
// 9 draw calls per instance, 45 total instead of 565, for a download size
// this scene was already well past caring about. Same long-axis-on-local-Z
// convention as the Vitrine model (see its own comment) - same -90deg
// rotation to lay that length along world X, atop the counter.
// One instance centered over the whole counter left a lot of bare glass
// roof showing on both ends (reported directly, with a screenshot) - two
// instances instead, one per VitrineCase, each scaled to that single
// case's own ~1.77m length (with a little margin) so the pastries cover
// both display tops edge to edge instead of just the middle.
const BREAD_PACK_URL = '/models/props/food/bread_pack.glb';
const BREAD_PACK_SCALE = 0.74;

function BreadPack({ position }: { position: [number, number, number] }) {
  const { scene: template } = useGLTF(BREAD_PACK_URL);
  const scene = useMemo(() => cloneGltfScene(template), [template]);
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]} scale={BREAD_PACK_SCALE}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
useGLTF.preload(BREAD_PACK_URL);

// First "continue them to the end of the wall" pass used five cases
// packed edge-to-edge, which (a) read as taking up too much of the wall
// and (b) was most of this scene's draw-call/light-count weight (see
// BreadPack's own pipeline note on the stutter that caused). Requested
// directly: back down to three, spread out with real gaps between them -
// separate display stands, not one continuous counter. Chosen as world
// x = -3.8, 0, 3.8 (Counter's own anchor is x=-2.8, so these are local
// offsets of -1.0, 2.8, 6.6 below) - evenly spaced across the back wall's
// full x:[-5,5] run with margin at both corners, each pair of neighbors
// 2.23m apart edge to edge (1.767m case length subtracted from the 3.8m
// center spacing).
const VITRINE_CASE_LOCAL_X = [-1.0, 2.8, 6.6];

function Counter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {VITRINE_CASE_LOCAL_X.map((x, i) => (
        <group key={x}>
          <VitrineCase position={[x, 0, 0]}>
            <ShelfTrays
              y={VITRINE_SHELF_LOWER_Y}
              urls={[FOOD_TRAY_URLS[(i * 4) % 8], FOOD_TRAY_URLS[(i * 4 + 1) % 8]]}
            />
            <ShelfTrays
              y={VITRINE_SHELF_UPPER_Y}
              urls={[FOOD_TRAY_URLS[(i * 4 + 2) % 8], FOOD_TRAY_URLS[(i * 4 + 3) % 8]]}
            />
          </VitrineCase>
          <BreadPack position={[x, 1.034, 0]} />
        </group>
      ))}
    </group>
  );
}

// `radius` defaults to the original 0.42 everywhere except table5, which
// needed more surface for 3 seats' worth of legroom (see its own comment
// below) - scales the base/foot proportionally so a bigger top doesn't
// end up balanced on a foot sized for the smaller default.
function Table({ position, radius = 0.42 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.04, 32]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.72, 12]} />
        <meshStandardMaterial color="#241f1c" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * (0.24 / 0.42), radius * (0.24 / 0.42), 0.04, 24]} />
        <meshStandardMaterial color="#241f1c" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Chair({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.75, -0.19]} castShadow>
        <boxGeometry args={[0.42, 0.6, 0.05]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.6} />
      </mesh>
      {[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.44, 8]} />
          <meshStandardMaterial color="#241f1c" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function PendantLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
        <meshStandardMaterial color="#1c1815" />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.09, 0.16, 0.16, 20, 1, true]} />
        <meshStandardMaterial
          color="#f0dcb4"
          emissive="#ffb066"
          emissiveIntensity={0.8}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, -0.05, 0]} color="#ffb066" intensity={0.9} distance={3.2} decay={2} />
    </group>
  );
}

// A door embedded in the right wall (x=5) - `position` is the anchor point
// ON that wall; everything here is offset toward -X (into the room) from
// there, matching the wall's own inward-facing orientation. Frame, panel
// and knob only, no hinges/handle detail - reads fine as a door at the
// distance a player actually sees it from in this room.
// Clickable, requested directly: tapping the door leaves the room the same
// way the overlay's own "<- Rooms" link does (CafeRoomPage.tsx), just from
// inside the scene instead of the HTML overlay around it - that link stays
// untouched, this is a second way in, not a replacement. The actual
// navigate() call/results-summary decision lives in CafeScene.tsx now (see
// CafeEnvironment's own `onDoorClick` prop comment) - this component just
// forwards its own onClick to whatever it's handed. R3F's synthetic
// onClick works fine here despite this living under <Canvas>: the custom
// renderer still sits inside the same React tree/context chain as the
// rest of the app, it's only the actual DOM reconciliation that's custom.
// No raycast conflict with PlayerControls' own click handling either -
// that's a raw DOM pointerdown/up pair on the canvas element with its own
// click-vs-drag logic (sit/stand-up), entirely separate from R3F's
// synthetic event system here; neither calls stopPropagation on the
// other's.
function Door({ position, onClick }: { position: [number, number, number]; onClick?: () => void }) {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh position={[-0.03, 1.05, 0]} receiveShadow>
        <boxGeometry args={[0.04, 2.2, 1.0]} />
        <meshStandardMaterial color="#241f1c" roughness={0.6} />
      </mesh>
      <mesh position={[-0.06, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 2.0, 0.86]} />
        <meshStandardMaterial color="#4a3323" roughness={0.5} />
      </mesh>
      <mesh position={[-0.09, 1.0, 0.32]} castShadow>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#c9a227" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}
