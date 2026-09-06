import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CafeEnvironment } from './CafeEnvironment';
import { NpcAvatar, type NpcConfig } from './NpcAvatar';
import { PlayerControls, type RoomBounds } from './PlayerControls';
import { SceneLoader } from '../SceneLoader';
import { DEFAULT_BODY_MORPHS, type BodyMorphState } from '../../avatar/bodyMorphs';
import { useLanguage } from '../../i18n/LanguageContext';

function outfitUrl(part: string): string {
  return `/models/outfits/${part}.glb?v=7`;
}
const BOTTOM = outfitUrl('tightjeans');

const THINNER: BodyMorphState = { weight: -0.6, belly: -0.3, waist: -0.4, arms: -0.3, legs: -0.3, butt: -0.2, breast: -0.1, face: -0.2 };
const HEAVIER: BodyMorphState = { weight: 0.7, belly: 0.5, waist: 0.5, arms: 0.4, legs: 0.5, butt: 0.4, breast: 0.3, face: 0.3 };
const CURVIER: BodyMorphState = { weight: 0.2, belly: 0.1, waist: 0.1, arms: 0, legs: 0.3, butt: 0.7, breast: 0.5, face: 0.1 };
const LEAN: BodyMorphState = { weight: -0.2, belly: -0.2, waist: -0.1, arms: 0.1, legs: 0.1, butt: 0.1, breast: -0.1, face: -0.1 };

const NPCS: NpcConfig[] = [
  {
    position: [-1.6, 0, -4.5],
    rotationY: Math.PI * 0.15,
    morphs: THINNER,
    hairStyle: 'long',
    hairColor: '#3b2314',
    topUrl: outfitUrl('hoodie'),
    bottomUrl: BOTTOM,
  },
  {
    position: [0.9, 0, -3.05],
    rotationY: -Math.PI * 0.6,
    morphs: HEAVIER,
    hairStyle: 'short',
    hairColor: '#1b1310',
    topUrl: outfitUrl('croptop'),
    bottomUrl: BOTTOM,
  },
  {
    position: [3.35, 0, -1.35],
    rotationY: Math.PI * 0.9,
    morphs: DEFAULT_BODY_MORPHS,
    hairStyle: 'medium',
    hairColor: '#a86b2e',
    topUrl: outfitUrl('hoodie'),
    bottomUrl: BOTTOM,
  },
  {
    position: [-3.35, 0, 1.35],
    rotationY: -Math.PI * 0.35,
    morphs: CURVIER,
    hairStyle: 'long',
    hairColor: '#5b2a86',
    topUrl: outfitUrl('croptop'),
    bottomUrl: BOTTOM,
  },
  {
    position: [0.1, 0, -4.5],
    rotationY: -Math.PI * 0.1,
    morphs: LEAN,
    hairStyle: 'short',
    hairColor: '#c9a24a',
    topUrl: outfitUrl('hoodie'),
    bottomUrl: BOTTOM,
  },
];

const BOUNDS: RoomBounds = { minX: -4.5, maxX: 4.5, minZ: -5, maxZ: 3.2 };

/**
 * Exposure-practice cafe: a place people with EDs often avoid (eating in
 * public, being around others while eating). Entirely separate from the
 * dressing-room tool's Canvas/scene tree (AvatarSceneLegacy.tsx /
 * AvatarScene.tsx) - shares only generic, non-visual avatar rigging infra
 * (AvatarContext, idleAnimation's pose helpers, bodyMorphs) and the
 * SceneLoader overlay, none of which this room modifies.
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
