import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useLanguage } from '../i18n/LanguageContext';
import { SceneLoader } from './SceneLoader';
import {
  BRAIN_REGIONS,
  BRAIN_INTRO_RU,
  BRAIN_INTRO_EN,
  BRAIN_ATTRIBUTION_RU,
  BRAIN_ATTRIBUTION_EN,
} from '../content/brain';

type ViewState = 'normal' | 'starvation' | 'ed';

const REGION_IDS = new Set(BRAIN_REGIONS.map((r) => r.id));

const RIM_VERTEX = `
varying vec3 vNormal;
varying vec3 vPositionW;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPositionW = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const RIM_FRAGMENT = `
uniform vec3 glowColor;
uniform float power;
varying vec3 vNormal;
varying vec3 vPositionW;
void main() {
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), power);
  gl_FragColor = vec4(glowColor, fresnel * 0.9);
}
`;

/**
 * Loads the real anatomical brain model (see
 * pipeline/scripts/08_extract_brain_regions.py - geometry pulled from the
 * open Z-Anatomy/BodyParts3D atlas, not procedural) and finds its "shell"
 * mesh plus the 7 "region_<id>" meshes by name, exactly like OutfitPiece.tsx
 * finds and re-materials clothing meshes on the avatar body.
 */
function BrainMesh({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const { scene } = useGLTF('/models/brain.glb?v=1');
  const regionMeshesRef = useRef<Record<string, THREE.Mesh>>({});

  // Finding the shell mesh is a pure read of `scene` - safe to derive
  // during render via useMemo. Mutating materials on every mesh (below) is
  // a real side effect on an external system (the loaded three.js scene),
  // so that part stays in an effect.
  const shellMesh = useMemo<THREE.Mesh | null>(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.name === 'brain_shell') found = obj as THREE.Mesh;
    });
    return found;
  }, [scene]);

  const shellMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#3a2a63',
        roughness: 0.4,
        metalness: 0.05,
        transparent: true,
        opacity: 0.5,
        clearcoat: 0.5,
        clearcoatRoughness: 0.35,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const rimMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color('#8b6cff') },
          power: { value: 2.2 },
        },
        vertexShader: RIM_VERTEX,
        fragmentShader: RIM_FRAGMENT,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    const regions: Record<string, THREE.Mesh> = {};
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.name === 'brain_shell') {
        mesh.material = shellMaterial;
      } else if (mesh.name.startsWith('region_')) {
        const id = mesh.name.slice('region_'.length);
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#8b6cff',
          emissive: '#5b9cff',
          emissiveIntensity: 0.4,
          roughness: 0.35,
          toneMapped: false,
        });
        regions[id] = mesh;
      }
    });
    regionMeshesRef.current = regions;
  }, [scene, shellMaterial]);

  useFrame(({ clock }) => {
    for (const [id, mesh] of Object.entries(regionMeshesRef.current)) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const active = id === selectedId;
      if (active) {
        mat.color.set('#ffffff');
        mat.emissive.set('#8b6cff');
        mat.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 4) * 0.4;
      } else {
        mat.color.set('#8b6cff');
        mat.emissive.set('#5b9cff');
        mat.emissiveIntensity = 0.4;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const name = e.object.name;
    if (!name.startsWith('region_')) return;
    const id = name.slice('region_'.length);
    if (REGION_IDS.has(id)) {
      e.stopPropagation();
      onSelect(id);
    }
  };

  return (
    <group onClick={handleClick}>
      <primitive object={scene} />
      {shellMesh && <mesh geometry={shellMesh.geometry} position={shellMesh.position} scale={1.015} material={rimMaterial} />}
    </group>
  );
}

function Scene({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<SceneLoader label={t('loading.brain')} />}>
      <BrainMesh selectedId={selectedId} onSelect={onSelect} />
    </Suspense>
  );
}

export function BrainViewer() {
  const { t, lang } = useLanguage();
  const [selectedId, setSelectedId] = useState(BRAIN_REGIONS[0].id);
  const [view, setView] = useState<ViewState>('normal');

  const selected = BRAIN_REGIONS.find((r) => r.id === selectedId) ?? BRAIN_REGIONS[0];
  const text =
    view === 'normal'
      ? lang === 'ru'
        ? selected.normalRu
        : selected.normalEn
      : view === 'starvation'
        ? lang === 'ru'
          ? selected.starvationRu
          : selected.starvationEn
        : lang === 'ru'
          ? selected.edRu
          : selected.edEn;

  return (
    <div className="brain-page">
      <div className="brain-viewer">
        <div className="scene-pane brain-scene-pane">
          <Canvas camera={{ position: [0, 0.1, 2.0], fov: 38 }} style={{ background: '#0d0a1a' }} shadows>
            <ambientLight intensity={0.6} color="#cdb9ff" />
            <directionalLight position={[2, 2.5, 2]} intensity={1.15} color="#a897ff" castShadow />
            <directionalLight position={[-2, -1, -2]} intensity={0.35} color="#5b9cff" />
            <pointLight position={[0, 0.5, 1.5]} intensity={0.6} color="#ffffff" distance={5} decay={2} />
            <Scene selectedId={selectedId} onSelect={setSelectedId} />
            <OrbitControls
              target={[0, 0, 0]}
              minDistance={1.2}
              maxDistance={3.2}
              autoRotate
              autoRotateSpeed={0.6}
              enableDamping
            />
            <EffectComposer>
              <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.3} mipmapBlur intensity={0.6} radius={0.55} />
            </EffectComposer>
          </Canvas>
        </div>

        <aside className="panel brain-panel">
          <div className="brain-region-chips">
            {BRAIN_REGIONS.map((region) => (
              <button
                key={region.id}
                type="button"
                className={`pill brain-region-chip${region.id === selectedId ? ' pill-active' : ''}`}
                onClick={() => setSelectedId(region.id)}
              >
                {lang === 'ru' ? region.titleRu : region.titleEn}
              </button>
            ))}
          </div>

          <h3 className="brain-region-title">{lang === 'ru' ? selected.titleRu : selected.titleEn}</h3>

          <div className="brain-state-row">
            <button type="button" className={`pill${view === 'normal' ? ' pill-active' : ''}`} onClick={() => setView('normal')}>
              {t('brain.normal')}
            </button>
            <button type="button" className={`pill${view === 'starvation' ? ' pill-active' : ''}`} onClick={() => setView('starvation')}>
              {t('brain.starvation')}
            </button>
            <button type="button" className={`pill${view === 'ed' ? ' pill-active' : ''}`} onClick={() => setView('ed')}>
              {t('brain.ed')}
            </button>
          </div>

          <p className="brain-region-text">{text}</p>

          <h4 className="brain-sources-heading">{t('brain.sources')}</h4>
          <ul className="brain-sources-list">
            {selected.sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </aside>
      </div>

      <p className="brain-footer">
        {lang === 'ru' ? BRAIN_INTRO_RU : BRAIN_INTRO_EN} {lang === 'ru' ? BRAIN_ATTRIBUTION_RU : BRAIN_ATTRIBUTION_EN}
      </p>
    </div>
  );
}

useGLTF.preload('/models/brain.glb?v=1');
