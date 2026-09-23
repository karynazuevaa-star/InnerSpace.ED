import { Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AvatarProvider } from '../avatar/AvatarContext';
import { IdleAnimation } from '../avatar/idleAnimation';
import { Body } from './Body';
import { Hair, type HairStyle } from './Hair';
import { OutfitPiece } from './OutfitPiece';
import { Room } from './Room';
import { SceneLoader } from './SceneLoader';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { SceneErrorScreen } from './SceneErrorScreen';
import { GazeHeatmap } from '../gaze/GazeHeatmap';
import { useLanguage } from '../i18n/LanguageContext';
import type { BodyMorphState } from '../avatar/bodyMorphs';
import type { Skin } from '../avatar/skin';

// Which of the 4 orbit directions are currently held down - shared between
// the keyboard listener and the on-screen click-and-hold buttons below.
interface OrbitHeldKeys {
  rotateLeft: boolean;
  rotateRight: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
}

const ORBIT_ROTATE_SPEED = 1.1; // radians/second
const ORBIT_ZOOM_SPEED = 2.6; // world units/second

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0.95, 3.4);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.9, 0);

// Reported directly: several psychologists using this tool struggled with
// trackpad drag-to-orbit/pinch-to-zoom (two-finger gestures aren't obvious,
// and OrbitControls gives no visual hint they exist at all). Arrow keys and
// an on-screen +/- rotate/zoom pad give the same two camera moves through
// input they don't have to discover first. Runs inside <Canvas> (needs
// useFrame/useThree) while the actual key state lives in a ref owned by
// the parent AvatarScene, shared with both the keyboard listener (outside
// the canvas, on window) and the on-screen buttons (also outside the
// canvas, in plain HTML) - a ref crosses that boundary fine since it's
// still the same React tree.
function KeyboardOrbitControl({
  controlsRef,
  heldKeys,
  resetPending,
}: {
  controlsRef: React.RefObject<React.ElementRef<typeof OrbitControls> | null>;
  heldKeys: React.RefObject<OrbitHeldKeys>;
  resetPending: React.RefObject<boolean>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    // Applied here (every frame, from inside the Canvas) instead of from
    // the outer route-change effect calling controls.reset() directly -
    // that effect fires in the OUTER React tree, which can run before
    // R3F has finished mounting its own tree on a fresh Canvas, leaving
    // controlsRef.current still null and the reset silently skipped
    // (reported directly: opening /avatar landed on the wrong framing
    // maybe half the time). A pending flag checked every frame has no
    // such race - by the time any frame runs at all, camera and controls
    // both exist. Setting position/target directly, rather than calling
    // controls.reset(), also sidesteps needing OrbitControls' own
    // construction-time snapshot to have captured the right values in
    // the first place.
    if (resetPending.current && controls) {
      camera.position.copy(DEFAULT_CAMERA_POSITION);
      controls.target.copy(DEFAULT_CAMERA_TARGET);
      controls.update();
      resetPending.current = false;
    }
    const keys = heldKeys.current;
    if (!controls) return;
    const rotating = keys.rotateLeft !== keys.rotateRight;
    const zooming = keys.zoomIn !== keys.zoomOut;
    if (!rotating && !zooming) return;

    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (keys.rotateLeft) spherical.theta -= ORBIT_ROTATE_SPEED * delta;
    if (keys.rotateRight) spherical.theta += ORBIT_ROTATE_SPEED * delta;
    if (keys.zoomIn) spherical.radius -= ORBIT_ZOOM_SPEED * delta;
    if (keys.zoomOut) spherical.radius += ORBIT_ZOOM_SPEED * delta;
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  });

  return null;
}

export interface AvatarConfig {
  morphs: BodyMorphState;
  bodyUrl: string;
  skin: Skin;
  hairStyle: HairStyle | '';
  hairColor: string;
  topUrl: string;
  bottomUrl: string;
  gazeActive: boolean;
  heatmapVisible: boolean;
  heatmapResetKey: number;
}

export function AvatarScene({ config }: { config: AvatarConfig }) {
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const location = useLocation();
  // Starts true so the very first mount also gets the explicit position/
  // target set (see KeyboardOrbitControl's own comment) instead of
  // relying on whatever OrbitControls' own initial construction happens
  // to land on.
  const resetPending = useRef(true);
  const heldKeys = useRef<OrbitHeldKeys>({
    rotateLeft: false,
    rotateRight: false,
    zoomIn: false,
    zoomOut: false,
  });

  // Arrow-key orbit/zoom, an alternative to trackpad drag/pinch - see
  // KeyboardOrbitControl's own comment for why. Skipped while focus is on
  // an actual form control (a slider, a text field) so the arrow keys keep
  // doing their normal job there instead of also spinning the camera;
  // preventDefault only fires once a key IS claimed for orbiting, so the
  // page itself never loses arrow-key scrolling outside the avatar tool.
  useEffect(() => {
    const KEY_MAP: Record<string, keyof OrbitHeldKeys> = {
      ArrowLeft: 'rotateLeft',
      ArrowRight: 'rotateRight',
      ArrowUp: 'zoomIn',
      ArrowDown: 'zoomOut',
    };
    const isFormField = (el: EventTarget | null) =>
      el instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key];
      if (!action || isFormField(e.target)) return;
      e.preventDefault();
      heldKeys.current[action] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key];
      if (!action) return;
      heldKeys.current[action] = false;
    };
    const onBlur = () => {
      heldKeys.current = { rotateLeft: false, rotateRight: false, zoomIn: false, zoomOut: false };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Reset the camera to its default framing every time the /avatar route
  // becomes active, not just on first mount - requested directly, since
  // AvatarToolPage stays permanently mounted (CSS display toggle, not a
  // real unmount - see App.tsx's own comment on why) so without this,
  // whatever the user last zoomed/orbited to on a previous visit would
  // still be sitting there on the next one instead of the intended
  // framing. Just flags the reset as pending - KeyboardOrbitControl
  // (inside the Canvas, where camera/controls are guaranteed to exist)
  // applies it on the next frame; see its own comment for why that's
  // done there instead of directly from this effect.
  useEffect(() => {
    if (location.pathname === '/avatar') {
      resetPending.current = true;
    }
  }, [location.pathname]);

  // Click-and-hold (or tap-and-hold) equivalent of the arrow keys above -
  // same heldKeys ref, so KeyboardOrbitControl doesn't need to know which
  // input triggered it. Pointer events cover mouse, touch and pen in one
  // handler; onPointerLeave/onPointerCancel release the hold if the
  // pointer drifts off the button (or a touch gets cancelled) without a
  // matching "up", so a stray press can't leave the camera spinning.
  const bindOrbitButton = (action: keyof OrbitHeldKeys) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      heldKeys.current[action] = true;
    },
    onPointerUp: () => {
      heldKeys.current[action] = false;
    },
    onPointerLeave: () => {
      heldKeys.current[action] = false;
    },
    onPointerCancel: () => {
      heldKeys.current[action] = false;
    },
  });

  return (
    <>
    {hasError ? <SceneErrorScreen /> : <SceneLoader label={t('loading.avatar')} />}
    <div className="scene-orbit-pad" role="group" aria-label={t('scene.controls.group')}>
      <button
        type="button"
        className="scene-orbit-pad__btn"
        aria-label={t('scene.controls.rotateLeft')}
        title={t('scene.controls.rotateLeft')}
        {...bindOrbitButton('rotateLeft')}
      >
        {/* A curved "rotate" arrow instead of a plain straight one -
            requested directly, with a reference screenshot of a product
            viewer's own rotate hint: a straight arrow reads as "move/pan",
            a curved one reads as "spin the model", which is what this
            button actually does. Bolder/filled version (thick stroke arc +
            a solid triangular head, not a thin outline) requested next, to
            read more clearly as "grab and turn" at a glance. */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M 8.83 5.2 A 7.5 7.5 0 1 0 17.3 6.7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <polygon points="0,-4.5 8,0 0,4.5" transform="translate(8.83,5.2) rotate(155)" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="scene-orbit-pad__btn"
        aria-label={t('scene.controls.zoomOut')}
        title={t('scene.controls.zoomOut')}
        {...bindOrbitButton('zoomOut')}
      >
        &minus;
      </button>
      <button
        type="button"
        className="scene-orbit-pad__btn"
        aria-label={t('scene.controls.zoomIn')}
        title={t('scene.controls.zoomIn')}
        {...bindOrbitButton('zoomIn')}
      >
        &#43;
      </button>
      <button
        type="button"
        className="scene-orbit-pad__btn"
        aria-label={t('scene.controls.rotateRight')}
        title={t('scene.controls.rotateRight')}
        {...bindOrbitButton('rotateRight')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M 15.17 5.2 A 7.5 7.5 0 1 1 6.7 6.7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <polygon points="0,-4.5 8,0 0,4.5" transform="translate(15.17,5.2) rotate(25)" fill="currentColor" />
        </svg>
      </button>
    </div>
    <Canvas
      shadows
      camera={{ position: [0, 0.95, 3.4], fov: 35 }}
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
          <SceneErrorBoundary onError={() => setHasError(true)}>
            <Suspense fallback={null}>
              {/* body.glb now bundles the eyes/eyebrows/eyelashes meshes
                  too, all skinned to the SAME armature at build time (see
                  pipeline/scripts/02_generate_body.py) - Body's own
                  scene.traverse() and <primitive> render them along with
                  everything else, no separate HeadAttachment/runtime
                  reparenting needed for these anymore. That runtime
                  reparent step (still used below for hair, which does need
                  to stay swappable) was the actual source of the eyes
                  never quite sitting flush in the socket. */}
              <Body morphs={config.morphs} url={config.bodyUrl} />
              <OutfitPiece url={config.topUrl} morphs={config.morphs} />
              <OutfitPiece url={config.bottomUrl} morphs={config.morphs} />
            </Suspense>
            {config.hairStyle && (
              <Suspense fallback={null}>
                <Hair style={config.hairStyle} color={config.hairColor} skin={config.skin} />
              </Suspense>
            )}
          </SceneErrorBoundary>
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
      <OrbitControls ref={controlsRef} target={[0, 0.9, 0]} minDistance={1.15} maxDistance={6.5} />
      <KeyboardOrbitControl controlsRef={controlsRef} heldKeys={heldKeys} resetPending={resetPending} />
      {/* Soft bloom so the lamp shade and the alcove's backlight actually
          read as glowing light sources instead of flat bright shapes - the
          luminance threshold is high enough that it only catches those
          emissive surfaces, not the lit skin/fabric of the avatar. */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.25} mipmapBlur intensity={0.4} radius={0.5} />
      </EffectComposer>
    </Canvas>
    </>
  );
}
