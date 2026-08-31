import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AvatarProvider } from '../avatar/AvatarContext';
import { IdleAnimation } from '../avatar/idleAnimation';
import { Body } from './Body';
import { Hair, type HairStyle } from './Hair';
import { HeadAttachment } from './HeadAttachment';
import { OutfitPiece } from './OutfitPiece';
import { Room } from './Room';
import { GazeHeatmap } from '../gaze/GazeHeatmap';
import type { BodyMorphState } from '../avatar/bodyMorphs';

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

export function AvatarScene({ config }: { config: AvatarConfig }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.9, 2.4], fov: 35 }}
      style={{ background: '#382f3f' }}
      gl={{ preserveDrawingBuffer: true }}
    >
      {/* Cozy in tone, but the avatar itself has to stay clearly, softly
          lit above all else - this is a body-image tool, not a mood shot.
          A bright warm ambient does most of the work so nothing goes dark,
          a soft key light adds gentle modeling (wide shadow-radius keeps
          the shadow edge soft, not hard-edged), and a front fill light near
          the camera makes sure the face and front of the body always read
          clearly regardless of which way the room lighting leans. */}
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
      {/*
        AvatarProvider (and the headBone state it holds) sits OUTSIDE any
        Suspense boundary that a hair/eyes/outfit piece can trigger.

        Body and both OutfitPiece items share ONE boundary on purpose - the
        naked body must never render even for a frame while the outfit is
        still loading, so nothing in that trio shows until all three are
        ready and they pop in dressed together. That's safe here because
        topUrl/bottomUrl are fixed constants that never change after mount,
        so this boundary only ever fires once, on first load - it can't
        unmount Body later the way a live outfit-switcher would.

        Hair/eyes/eyebrows/eyelashes each keep their OWN boundary instead of
        joining that one: they depend on the head bone Body's effect sets,
        and unmounting Body to remount it (which sharing a boundary with
        something that CAN re-suspend, like a hair style the user changes,
        would do) briefly nulls that reference - any piece that re-attaches
        before the skeleton has resettled ends up reparented with the wrong
        world transform (hair/eyes appearing far below the feet).
      */}
      {/* Named so GazeHeatmap can raycast against just this subtree - the
          heatmap should only ever mark the avatar, not the room around it. */}
      <group name="avatar-root">
        <AvatarProvider>
          <Suspense fallback={null}>
            <Body morphs={config.morphs} />
            <OutfitPiece url={config.topUrl} morphs={config.morphs} />
            <OutfitPiece url={config.bottomUrl} morphs={config.morphs} />
          </Suspense>
          <Suspense fallback={null}>
            <HeadAttachment url="/models/eyes.glb?v=15" />
          </Suspense>
          <Suspense fallback={null}>
            <HeadAttachment url="/models/eyebrows.glb?v=4" transparent />
          </Suspense>
          <Suspense fallback={null}>
            <HeadAttachment url="/models/eyelashes.glb?v=4" transparent />
          </Suspense>
          {config.hairStyle && (
            <Suspense fallback={null}>
              <Hair style={config.hairStyle} color={config.hairColor} />
            </Suspense>
          )}
          <IdleAnimation weight={config.morphs.weight} butt={config.morphs.butt} legs={config.morphs.legs} />
        </AvatarProvider>
      </group>
      <GazeHeatmap key={config.heatmapResetKey} active={config.gazeActive} visible={config.heatmapVisible} />
      {/* minDistance keeps the camera from ever dollying in close enough to
          the face to create fisheye-like close-up distortion (verified via
          isolated Blender renders: the eye asset and blink morph both look
          correct at a normal viewing distance - the "bulging" only showed
          up when orbiting up and zooming in tight on the face, which is
          just near-camera perspective exaggeration, the same effect a
          real macro photo of a face this close would have). 1.15 still
          lets someone see the face clearly, just not nose-to-nose. */}
      <OrbitControls target={[0, 0.9, 0]} minDistance={1.15} maxDistance={5} />
      {/* Soft bloom so the lamp shade and the alcove's backlight actually
          read as glowing light sources instead of flat bright shapes - the
          luminance threshold is high enough that it only catches those
          emissive surfaces, not the lit skin/fabric of the avatar. */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.25} mipmapBlur intensity={0.4} radius={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
