import * as THREE from 'three';

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
          already uses. */}
      <Table position={[3.4, 0, -0.4]} />
      <Chair position={[3.4, 0, 0.22]} rotationY={Math.PI} />
      <Chair position={[4.02, 0, -0.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[3.4, 2.6, -0.4]} />
      <FoodPlate position={[3.35, 0.74, -0.15]} />
      <FoodPlate position={[3.65, 0.74, -0.55]} />

      <Table position={[-2.6, 0, 1.4]} />
      <Chair position={[-2.6, 0, 2.3]} rotationY={Math.PI} />
      <Chair position={[-1.7, 0, 1.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[-2.6, 2.6, 1.4]} />
      <CoffeeCup position={[-2.6, 0.74, 1.6]} />

      <Table position={[0.5, 0, 1.8]} />
      <Chair position={[0.5, 0, 2.7]} rotationY={Math.PI} />
      <Chair position={[1.4, 0, 1.8]} rotationY={-Math.PI / 2} />
      <PendantLight position={[0.5, 2.6, 1.8]} />
      <FoodPlate position={[0.65, 0.74, 1.95]} />

      <Table position={[-3.6, 0, -2.0]} />
      <Chair position={[-3.6, 0, -1.1]} rotationY={Math.PI} />
      <Chair position={[-2.7, 0, -2.0]} rotationY={-Math.PI / 2} />
      <Chair position={[-4.5, 0, -2.0]} rotationY={Math.PI / 2} />
      <PendantLight position={[-3.6, 2.6, -2.0]} />
      <FoodPlate position={[-3.6, 0.74, -1.85]} />
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
      {[-1.4, 0, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 1.3, -0.05]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.3, 12]} />
          <meshStandardMaterial color="#caa46a" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Table({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 32]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.72, 12]} />
        <meshStandardMaterial color="#241f1c" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 24]} />
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
