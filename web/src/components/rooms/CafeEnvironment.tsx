import * as THREE from 'three';
import { Text } from '@react-three/drei';

/**
 * A small neighbourhood cafe interior - built from plain primitives, same
 * approach as components/Room.tsx, so it needs no new model assets. Floor
 * runs roughly x:[-5,5] z:[-5.5,3.5]; CafeScene.tsx clamps the player inside
 * that with a margin from the walls.
 */
export function CafeEnvironment() {
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

      <Counter position={[-2.8, 0, -5.05]} />
      <PendantLight position={[-2.8, 2.6, -4.4]} />

      <Table position={[1.6, 0, -3.4]} />
      <Chair position={[1.6, 0, -2.78]} rotationY={Math.PI} />
      <Chair position={[2.22, 0, -3.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[1.6, 2.6, -3.4]} />
      <FoodPlate position={[1.6, 0.74, -3.6]} />

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
      <FoodPlate position={[3.4, 0.74, -0.25]} />
      <FoodPlate position={[3.4, 0.74, -0.55]} />

      <Table position={[-2.6, 0, 1.4]} />
      <Chair position={[-2.6, 0, 2.3]} rotationY={Math.PI} />
      <Chair position={[-1.7, 0, 1.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[-2.6, 2.6, 1.4]} />
      <CoffeeCup position={[-2.6, 0.74, 1.6]} />

      {/* Same "too far from a too-small table" pattern already fixed for
          table2/table5 (0.9m seats around a 0.42-radius table) - reported
          directly, with a screenshot. Same proven fix, reused wholesale:
          table2's exact radius/seat-distance pair (0.46 table, 0.62m
          seats), and seated opposite each other (north/south) rather than
          at the original adjacent (north/east) corners - table2's own
          comment covers why adjacent corners at a pulled-in distance read
          as the two of them crowding each other, not just the table. */}
      <Table position={[0.5, 0, 1.8]} radius={0.46} />
      <Chair position={[0.5, 0, 2.42]} rotationY={Math.PI} />
      <Chair position={[0.5, 0, 1.18]} rotationY={0} />
      <PendantLight position={[0.5, 2.6, 1.8]} />
      <FoodPlate position={[0.5, 0.74, 1.65]} />

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
      {/* One plate per seat, same idea as table2 - all three chairs now
          rotate through an eating turn (see computeConversationRole in
          idleAnimation.tsx), not just the seat nearest this original
          plate, so native_skirt and knit_sweater need somewhere to reach
          for too. Offset toward each one's own seat, same pattern as the
          existing plate. */}
      <FoodPlate position={[-3.6, 0.74, -1.85]} />
      <FoodPlate position={[-3.36, 0.74, -2.0]} />
      <FoodPlate position={[-3.84, 0.74, -2.0]} />
    </group>
  );
}

function CoffeeCup({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.01, 20]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.038, 0.07, 16]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.077, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.004, 16]} />
        <meshStandardMaterial color="#3a2418" roughness={0.35} />
      </mesh>
      <mesh position={[0.05, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.02, 0.006, 8, 12]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.3} />
      </mesh>
    </group>
  );
}

function FoodPlate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.008, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.12, 0.016, 24]} />
        <meshStandardMaterial color="#eee6d8" roughness={0.35} />
      </mesh>
      <mesh position={[-0.02, 0.028, 0.015]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.09, 0.025, 0.075]} />
        <meshStandardMaterial color="#d9a45a" roughness={0.65} />
      </mesh>
      <mesh position={[0.045, 0.022, -0.025]} castShadow>
        <sphereGeometry args={[0.032, 10, 8]} />
        <meshStandardMaterial color="#8a5a2a" roughness={0.75} />
      </mesh>
      <mesh position={[0.02, 0.02, 0.05]} castShadow>
        <sphereGeometry args={[0.024, 10, 8]} />
        <meshStandardMaterial color="#5a8a3a" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Was a plain bar (a shelf of empty cups) - requested directly: make it
// read as an order counter instead, somewhere to walk up, see a menu and
// notice a couple of dishes on display, not a place serving drinks.
// Swapped the row of cups for a standing chalkboard-style menu sign (with
// its own small easel legs, not just floating) plus two FoodPlate props
// reused as-is from the regular tables - the actual menu TEXT lives in
// the HTML overlay CafeScene shows when the player walks up (see
// CounterProximityWatcher and cafe.menu.* in translations.ts there), not
// on this sign; the sign's own "MENU" label is just enough to read as a
// menu board from a distance.
function Counter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 1.1, 0.6]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.12, 0]} receiveShadow>
        <boxGeometry args={[4.3, 0.05, 0.66]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.35} />
      </mesh>
      <group position={[0, 1.145, -0.1]}>
        {[-0.28, 0.28].map((dx, i) => (
          <mesh key={i} position={[dx, 0.16, 0]} castShadow>
            <boxGeometry args={[0.03, 0.32, 0.03]} />
            <meshStandardMaterial color="#241f1c" roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]} rotation={[-0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.9, 0.55, 0.035]} />
          <meshStandardMaterial color="#241f1c" roughness={0.7} />
        </mesh>
        <Text
          position={[0, 0.5, 0.019]}
          rotation={[-0.08, 0, 0]}
          fontSize={0.11}
          color="#e8ddc8"
          anchorX="center"
          anchorY="middle"
        >
          MENU
        </Text>
      </group>
      <FoodPlate position={[-1.3, 1.145, -0.05]} />
      <FoodPlate position={[1.3, 1.145, -0.05]} />
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
