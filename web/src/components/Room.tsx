import { useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows, RoundedBox } from '@react-three/drei';

/**
 * A warm, lived-in corner instead of a stark studio backdrop - wood floor,
 * a backlit arched alcove behind the figure, a lit floor lamp, framed art,
 * a plant, a floating shelf, and a standing mirror (seeing your own
 * reflection is a natural part of body-image work). Everything but the
 * alcove sits at the edges of the frame - furnished enough to feel like a
 * room, not a set to look at.
 */
export function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#4a3626" roughness={0.75} metalness={0} />
      </mesh>
      <mesh position={[0, 3.2, -2.4]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#4a3d42" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[-4.2, 3.2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#453840" roughness={0.9} metalness={0} />
      </mesh>

      {/* round area rug under the figure */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.15, 64]} />
        <meshStandardMaterial color="#9c8272" roughness={0.95} />
      </mesh>

      <Alcove position={[0, 0, -2.32]} />
      <Mirror position={[-1.55, 0, -0.55]} rotation={[0, Math.PI * 0.42, 0]} />
      <Plant position={[-2.15, 0, -1.35]} />
      <FloorLamp position={[2.35, 0, -1.05]} />
      <FloatingShelf position={[2.15, 1.0, -2.28]} />

      {/* far is deliberately small - it's how high above the ground plane
          ContactShadows samples geometry, not a shadow-map draw distance.
          At the old 2.2 (taller than the whole figure) it was projecting a
          top-down silhouette of the entire body - arms included - onto the
          floor as if she were shadow-boxing. Limiting it to just above foot
          height gives the intended soft contact-shadow blob instead. */}
      <ContactShadows position={[0, 0.008, 0]} opacity={0.4} scale={7} blur={2.6} far={0.45} resolution={512} color="#000000" />
    </group>
  );
}

/** An arch-profile panel recessed into the back wall, with a slightly
 * larger warm-emissive copy sitting just behind it so a glowing rim peeks
 * out around the edges - a cheap stand-in for cove/LED strip lighting. */
function useArchShape(width: number, straightHeight: number) {
  return useMemo(() => {
    const halfW = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(-halfW, straightHeight);
    shape.absarc(0, straightHeight, halfW, Math.PI, 0, true);
    shape.lineTo(halfW, 0);
    shape.lineTo(-halfW, 0);
    return shape;
  }, [width, straightHeight]);
}

function Alcove({ position }: { position: [number, number, number] }) {
  const glowShape = useArchShape(1.9, 1.75);
  const panelShape = useArchShape(1.7, 1.6);
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.08]}>
        <extrudeGeometry args={[glowShape, { depth: 0.06, bevelEnabled: false }]} />
        <meshStandardMaterial color="#e8b483" emissive="#ff9c52" emissiveIntensity={0.55} roughness={0.7} />
      </mesh>
      <mesh receiveShadow>
        <extrudeGeometry args={[panelShape, { depth: 0.1, bevelEnabled: false }]} />
        <meshStandardMaterial color="#5c4a4f" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Mirror({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.06, 0.26]} />
        <meshStandardMaterial color="#4a3421" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.05, 0.75, 0.05]} />
        <meshStandardMaterial color="#4a3421" roughness={0.7} />
      </mesh>
      <RoundedBox args={[0.62, 1.62, 0.05]} radius={0.14} smoothness={4} position={[0, 1.28, 0]} castShadow>
        <meshStandardMaterial color="#4a3421" roughness={0.6} />
      </RoundedBox>
      {/* glossy "glass" - a true live reflection isn't reliably supported
          across renderers here, so this fakes the look with a very glossy
          dark surface that picks up bright specular highlights from the
          room lights instead. */}
      <mesh position={[0, 1.28, 0.028]}>
        <planeGeometry args={[0.52, 1.5]} />
        <meshStandardMaterial color="#232c36" metalness={0.9} roughness={0.08} envMapIntensity={1.2} />
      </mesh>
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  const sprigs = useMemo(
    () => [
      { a: 0.15, l: 0.85, tilt: 0.06 },
      { a: -0.35, l: 0.72, tilt: -0.1 },
      { a: 1.9, l: 0.65, tilt: 0.14 },
      { a: 3.4, l: 0.78, tilt: -0.05 },
      { a: 4.8, l: 0.58, tilt: 0.1 },
    ],
    []
  );
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.14, 0.34, 20]} />
        <meshStandardMaterial color="#6b5142" roughness={0.85} />
      </mesh>
      {sprigs.map((s, i) => (
        <group key={i} position={[0, 0.34, 0]} rotation={[s.tilt, s.a, 0]}>
          <mesh position={[0, s.l / 2, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.012, s.l, 6]} />
            <meshStandardMaterial color="#4a5c3a" roughness={0.8} />
          </mesh>
          {[0.3, 0.55, 0.8, 1].map((t, j) => (
            <mesh key={j} position={[0.03 * (j % 2 === 0 ? 1 : -1), s.l * t, 0]} scale={0.045} castShadow>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color="#54683f" roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.17, 0.04, 24]} />
        <meshStandardMaterial color="#241f1c" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 1.48, 10]} />
        <meshStandardMaterial color="#241f1c" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* lampshade - a frustum (both ends open), not a pointed cone */}
      <mesh position={[0, 1.56, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.22, 0.3, 24, 1, true]} />
        <meshStandardMaterial color="#f0dcb4" emissive="#ffb066" emissiveIntensity={0.7} roughness={0.65} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffb066" intensity={1.1} distance={3.5} decay={2} />
    </group>
  );
}

function FloatingShelf({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.56, 0.05, 0.22]} radius={0.015} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color="#3a2c22" roughness={0.7} />
      </RoundedBox>
      <mesh position={[-0.15, 0.09, 0.02]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.14, 16]} />
        <meshStandardMaterial color="#b56b45" roughness={0.5} />
      </mesh>
      <mesh position={[0.12, 0.055, -0.02]} castShadow>
        <boxGeometry args={[0.14, 0.06, 0.1]} />
        <meshStandardMaterial color="#7a4040" roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.11, -0.02]} castShadow>
        <boxGeometry args={[0.14, 0.05, 0.1]} />
        <meshStandardMaterial color="#3f5a4a" roughness={0.8} />
      </mesh>
    </group>
  );
}
