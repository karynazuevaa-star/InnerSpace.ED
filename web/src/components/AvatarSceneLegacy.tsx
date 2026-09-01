import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AvatarProvider } from '../avatar/AvatarContext';
import { StaticRelaxedPose } from '../avatar/idleAnimation';
import { BodyLegacy } from './BodyLegacy';
import { Hair, type HairStyle } from './Hair';
import { HeadAttachmentLegacy } from './HeadAttachmentLegacy';
import { OutfitPiece } from './OutfitPiece';
import { Room } from './Room';
import { SceneLoader } from './SceneLoader';
import { GazeHeatmap } from '../gaze/GazeHeatmap';
import { useLanguage } from '../i18n/LanguageContext';
import type { BodyMorphState } from '../avatar/bodyMorphs';

/**
 * LEGACY comparison scene - see pages/AvatarToolPageLegacy.tsx for why this
 * exists. A copy of AvatarScene.tsx with:
 *  - No IdleAnimation at all (fully static pose, no breathing/sway/blink).
 *  - BodyLegacy/HeadAttachmentLegacy instead of Body/HeadAttachment - the
 *    pre-fix body.glb (old skin texture) and eyes.glb (low-poly asset,
 *    pristine un-desaturated iris texture, no material patches).
 * Hair/outfits are intentionally NOT reverted - those bugs were root-caused
 * and fixed separately from the eye/face saga this page exists to compare
 * against, and reverting them would just reintroduce unrelated, already-
 * understood bugs (bald patches, z-fighting) without serving the comparison.
 */
export interface AvatarConfig {
  morphs: BodyMorphState;
  hairStyle: HairStyle | '';
  hairColor: string;
  topUrl: string;
  bottomUrl: string;
  gazeActive: boolean;
  heatmapVisible: boolean;
  heatmapResetKey: number;
}

export function AvatarSceneLegacy({ config }: { config: AvatarConfig }) {
  const { t } = useLanguage();
  return (
    <Canvas shadows camera={{ position: [0, 0.9, 2.4], fov: 35 }} style={{ background: '#382f3f' }}>
      <ambientLight intensity={0.95} color="#fff2e2" />
      <directionalLight
        position={[2.2, 3.5, 2.2]}
        intensity={1.0}
        color="#fff0d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-radius={10}
      />
      <directionalLight position={[-2.5, 2, -1.5]} intensity={0.45} color="#eee3ff" />
      <pointLight position={[0, 1.6, 2.2]} intensity={0.5} color="#fff6ea" distance={6} decay={2} />
      <Room />
      <group name="avatar-root">
        <AvatarProvider>
          {/* One Suspense boundary for every mesh that makes up the avatar
              (body, outfits, eyes, eyebrows, eyelashes, hair) instead of a
              separate one per piece - React only swaps the fallback out
              once ALL of them are ready, so the avatar appears fully
              assembled in one frame rather than limbs/hair/eyes popping in
              individually as each glTF happens to finish loading. */}
          <Suspense fallback={<SceneLoader label={t('loading.avatar')} />}>
            <BodyLegacy morphs={config.morphs} />
            <OutfitPiece url={config.topUrl} morphs={config.morphs} />
            <OutfitPiece url={config.bottomUrl} morphs={config.morphs} />
            <HeadAttachmentLegacy url="/models-legacy/eyes.glb" />
            <HeadAttachmentLegacy url="/models-legacy/eyebrows.glb" transparent />
            <HeadAttachmentLegacy url="/models-legacy/eyelashes.glb" transparent />
            {config.hairStyle && <Hair style={config.hairStyle} color={config.hairColor} />}
          </Suspense>
          {/* No IdleAnimation here - this page is the "before animation,
              and everything since" comparison baseline. StaticRelaxedPose
              is a one-time pose, not a per-frame animation: it swaps the
              stiff T-pose bind for relaxed arms and then does nothing
              else, no breathing/sway/blinking. */}
          <StaticRelaxedPose weight={config.morphs.weight} butt={config.morphs.butt} legs={config.morphs.legs} />
        </AvatarProvider>
      </group>
      <GazeHeatmap key={config.heatmapResetKey} active={config.gazeActive} visible={config.heatmapVisible} />
      <OrbitControls target={[0, 0.9, 0]} minDistance={1.15} maxDistance={5} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.25} mipmapBlur intensity={0.4} radius={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
