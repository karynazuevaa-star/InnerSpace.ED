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
      <Chair position={[1.6, 0, -2.5]} rotationY={Math.PI} />
      <Chair position={[2.5, 0, -3.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[1.6, 2.6, -3.4]} />

      <Table position={[3.4, 0, -0.4]} />
      <Chair position={[3.4, 0, 0.5]} rotationY={Math.PI} />
      <Chair position={[4.3, 0, -0.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[3.4, 2.6, -0.4]} />

      <Table position={[-2.6, 0, 1.4]} />
      <Chair position={[-2.6, 0, 2.3]} rotationY={Math.PI} />
      <Chair position={[-1.7, 0, 1.4]} rotationY={-Math.PI / 2} />
      <PendantLight position={[-2.6, 2.6, 1.4]} />

      <Table position={[0.5, 0, 1.8]} />
      <Chair position={[0.5, 0, 2.7]} rotationY={Math.PI} />
      <Chair position={[1.4, 0, 1.8]} rotationY={-Math.PI / 2} />
      <PendantLight position={[0.5, 2.6, 1.8]} />

      <Table position={[-3.6, 0, -2.0]} />
      <Chair position={[-3.6, 0, -1.1]} rotationY={Math.PI} />
      <Chair position={[-2.7, 0, -2.0]} rotationY={-Math.PI / 2} />
      <Chair position={[-4.5, 0, -2.0]} rotationY={Math.PI / 2} />
      <PendantLight position={[-3.6, 2.6, -2.0]} />
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
