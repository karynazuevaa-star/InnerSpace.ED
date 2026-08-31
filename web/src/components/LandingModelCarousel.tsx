import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Five free, CC-licensed low-poly models standing in for the point after
// "InnerSpace.ED": a plate of food, a salad, a scale, a dumbbell and a
// kettlebell, quietly nodding at what the platform is about. Sourced from
// Poly Pizza (poly.pizza) - see landing.modelCredit for the CC BY credit.
// The scale and the salad read much better looking straight down at them
// (a dial, a bowl) than from the side, so those two get a fixed tilt. The
// dumbbell is authored lying flat along its bar, which meant the constant
// spin below sometimes showed it end-on as a thin, unreadable blob -
// standing it up (rollZ) keeps its bar aligned with the spin axis, so the
// spin turns it like a rotisserie instead of tumbling its silhouette.
const MODELS = [
  { url: '/models/landing/dinner.glb', tilt: 0, rollZ: 0, size: 1, glow: false },
  { url: '/models/landing/salad.glb', tilt: Math.PI / 3, rollZ: 0, size: 1, glow: false },
  { url: '/models/landing/scale.glb', tilt: Math.PI / 3, rollZ: 0, size: 1, glow: false },
  { url: '/models/landing/dumbbell.glb', tilt: 0, rollZ: Math.PI / 2, size: 1.3, glow: true },
  { url: '/models/landing/kettlebell.glb', tilt: 0, rollZ: 0, size: 1, glow: true },
];

MODELS.forEach((m) => useGLTF.preload(m.url));

// Each slot is a strict sequence, never a cross-dissolve: the outgoing
// object spins down while fading out, then the dot fades in, holds, fades
// out, and only then does the next object fade in while spinning up. At
// most one thing is ever fading at a time, so nothing blends into anything
// else - and since a fade-out's end is the very next fade-in's start,
// there's no stretch of time with nothing visible either.
const FADE_SECONDS = 0.4;
const OBJECT_HOLD_SECONDS = 3.4;
const DOT_HOLD_SECONDS = 0.6;
const SLOT_SECONDS = FADE_SECONDS * 4 + OBJECT_HOLD_SECONDS + DOT_HOLD_SECONDS;
const TARGET_SIZE = 1.15;
const SPIN_SPEED = 0.4;

// A dark material (the kettlebell, the dumbbell) can otherwise read as
// barely-there against the near-black page background. For those, every
// mesh gets a slightly larger backside-only shell in the brand violet,
// the classic inverted-hull trick - it reads as a soft glowing rim rather
// than a flat silhouette, and needs no custom shader.
const OUTLINE_COLOR = '#8b6cff';
const OUTLINE_SCALE = 1.06;

function FittedModel({
  url,
  tilt,
  rollZ,
  size,
  glow,
  weightRef,
  spinRef: spinFactorRef,
}: {
  url: string;
  tilt: number;
  rollZ: number;
  size: number;
  glow: boolean;
  weightRef: { current: number };
  spinRef: { current: number };
}) {
  const { scene } = useGLTF(url);
  const outerRef = useRef<THREE.Group>(null);
  // The static camera-facing tilt and roll live on their own group,
  // separate from the continuous spin below. Applying both to the same
  // object would compound through Euler rotation order and make a tilted
  // model tumble in and out of its angle as it turns, instead of spinning
  // cleanly like a turntable.
  const orientRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const outlineMaterials = useRef<THREE.MeshBasicMaterial[]>([]);
  const materials = useMemo(() => {
    const list: THREE.Material[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        m.transparent = true;
        list.push(m);
      });
    });
    return list;
  }, [scene]);

  useEffect(() => {
    if (!glow) return;
    // Collect the real meshes first, then attach shells in a second pass -
    // adding children while scene.traverse is still walking the tree makes
    // it walk into the freshly-added shells too, which each add another
    // shell of their own, blowing the call stack.
    const targets: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) targets.push(mesh);
    });
    const created: THREE.MeshBasicMaterial[] = [];
    targets.forEach((mesh) => {
      const outlineMat = new THREE.MeshBasicMaterial({
        color: OUTLINE_COLOR,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const shell = new THREE.Mesh(mesh.geometry, outlineMat);
      shell.scale.setScalar(OUTLINE_SCALE);
      mesh.add(shell);
      created.push(outlineMat);
    });
    outlineMaterials.current = created;
    return () => {
      created.forEach((m) => m.dispose());
    };
  }, [scene, glow]);

  useEffect(() => {
    if (!spinRef.current || !orientRef.current) return;
    const box = new THREE.Box3().setFromObject(scene);
    const boxSize = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(boxSize);
    box.getCenter(center);
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z) || 1;
    const scale = (TARGET_SIZE * size) / maxDim;
    spinRef.current.scale.setScalar(scale);
    spinRef.current.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    orientRef.current.rotation.set(tilt, 0, rollZ);
  }, [scene, tilt, rollZ, size]);

  useFrame((_, delta) => {
    const weight = weightRef.current;
    if (outerRef.current) {
      outerRef.current.visible = weight > 0.01;
    }
    materials.forEach((m) => {
      m.opacity = weight;
    });
    outlineMaterials.current.forEach((m) => {
      m.opacity = weight * 0.9;
    });
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * SPIN_SPEED * spinFactorRef.current;
    }
  });

  return (
    <group ref={outerRef}>
      <group ref={orientRef}>
        <group ref={spinRef}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  );
}

function Dot({ weightRef }: { weightRef: { current: number } }) {
  const ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const weight = weightRef.current;
    if (ref.current) ref.current.visible = weight > 0.01;
    if (materialRef.current) materialRef.current.opacity = weight;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.34, 32, 32]} />
      <meshStandardMaterial ref={materialRef} color="#f5f5f7" roughness={0.6} transparent />
    </mesh>
  );
}

function Carousel() {
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const clock = useRef(0);
  const dotWeight = useRef(1);
  const weights = useRef(MODELS.map(() => ({ current: 0 })));
  const spinFactors = useRef(MODELS.map(() => ({ current: 0 })));

  useFrame((_, delta) => {
    if (reduceMotion) {
      dotWeight.current = 1;
      weights.current.forEach((w) => {
        w.current = 0;
      });
      spinFactors.current.forEach((s) => {
        s.current = 0;
      });
      return;
    }
    const n = MODELS.length;
    clock.current += delta;
    const totalT = clock.current % (SLOT_SECONDS * n);
    const objIndex = Math.floor(totalT / SLOT_SECONDS);
    const localT = totalT - objIndex * SLOT_SECONDS;

    const fadeInEnd = FADE_SECONDS;
    const holdEnd = fadeInEnd + OBJECT_HOLD_SECONDS;
    const fadeOutEnd = holdEnd + FADE_SECONDS;
    const dotFadeInEnd = fadeOutEnd + FADE_SECONDS;
    const dotHoldEnd = dotFadeInEnd + DOT_HOLD_SECONDS;
    const dotFadeOutEnd = dotHoldEnd + FADE_SECONDS;

    let obj = 0;
    let spin = 0;
    let dot = 0;
    if (localT < fadeInEnd) {
      const f = localT / FADE_SECONDS;
      obj = f;
      spin = f;
    } else if (localT < holdEnd) {
      obj = 1;
      spin = 1;
    } else if (localT < fadeOutEnd) {
      const f = (localT - holdEnd) / FADE_SECONDS;
      obj = 1 - f;
      spin = 1 - f;
    } else if (localT < dotFadeInEnd) {
      dot = (localT - fadeOutEnd) / FADE_SECONDS;
    } else if (localT < dotHoldEnd) {
      dot = 1;
    } else if (localT < dotFadeOutEnd) {
      dot = 1 - (localT - dotHoldEnd) / FADE_SECONDS;
    }

    dotWeight.current = dot;
    weights.current.forEach((w, i) => {
      w.current = i === objIndex ? obj : 0;
    });
    spinFactors.current.forEach((s, i) => {
      s.current = i === objIndex ? spin : 0;
    });
  });

  return (
    <>
      {/* A dark material (the kettlebell) can otherwise vanish into the
          near-black page background - the front fill and brighter rim
          keep its silhouette lit up even when its own albedo is close to
          black. */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={1.05} />
      <directionalLight position={[0, 0.5, 3]} intensity={0.45} />
      <directionalLight position={[-3, -1, -2]} intensity={0.7} color="#8b6cff" />
      <Dot weightRef={dotWeight} />
      {MODELS.map((m, i) => (
        <FittedModel
          key={m.url}
          url={m.url}
          tilt={m.tilt}
          rollZ={m.rollZ}
          size={m.size}
          glow={m.glow}
          weightRef={weights.current[i]}
          spinRef={spinFactors.current[i]}
        />
      ))}
    </>
  );
}

export function LandingModelCarousel() {
  return (
    <div className="landing-model" aria-hidden="true">
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.15, 2.7], fov: 32 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Carousel />
        </Suspense>
      </Canvas>
    </div>
  );
}
