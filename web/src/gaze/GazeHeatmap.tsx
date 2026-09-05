import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { subscribeGaze } from './gazeBus';

const MAX_POINTS = 6000;

function makeDotTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 210, 90, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 140, 40, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 90, 20, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Lives inside the R3F <Canvas>. Subscribes to gaze samples (viewport
 * pixel coords from WebGazer), raycasts each one against the avatar, and
 * accumulates a soft additive-blended dot at every surface hit. Overlapping
 * dots brighten each other, so areas looked at more read as "hotter"
 * without any explicit binning/color-scale math.
 *
 * `active` and `visible` are independent: `active` gates whether new
 * samples are recorded, `visible` gates whether the accumulated dots are
 * drawn. That split lets a session collect quietly in the background and
 * only reveal the result on demand, toggled back and forth without losing
 * any of the accumulated data (only "clear" does that).
 */
export function GazeHeatmap({ active, visible }: { active: boolean; visible: boolean }) {
  const { camera, scene, gl } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const countRef = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const texture = useMemo(() => makeDotTexture(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  useEffect(() => {
    // Room's <ContactShadows> re-renders the WHOLE scene into a depth
    // buffer every frame to keep the floor shadow live (frames=Infinity),
    // which normally goes unnoticed since the avatar itself is static. But
    // this component's point cloud keeps growing while gaze tracking is
    // active, and that growing geometry got baked into the shadow capture
    // too - the contact shadow visibly reshaped itself as points
    // accumulated, reading as "the floor is moving." Layer 1 keeps these
    // points out of that pass: cameras and the ContactShadows helper's own
    // internal shadow camera only look at layer 0 by default, so putting
    // the points there and opting the main camera in explicitly is enough
    // to make them invisible to that one render pass without touching
    // Room.tsx or the drei component at all.
    if (pointsRef.current) pointsRef.current.layers.set(1);
    camera.layers.enable(1);
  }, [camera]);

  useEffect(() => {
    if (!active) return;
    return subscribeGaze((sample) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((sample.x - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((sample.y - rect.top) / rect.height) * 2 + 1;
      if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) return; // gaze landed outside the canvas (e.g. on the side panel)

      // Raycast against the avatar only, not the room - the floor/walls are
      // large meshes that would otherwise catch most samples and make dots
      // pile up (and visibly shift as new samples arrive) on the floor
      // instead of on the body.
      const avatarRoot = scene.getObjectByName('avatar-root');
      if (!avatarRoot) return;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = raycaster.intersectObjects(avatarRoot.children, true);
      const hit = hits.find((h) => h.object.type === 'SkinnedMesh' || h.object.type === 'Mesh');
      if (!hit) return;

      const i = countRef.current % MAX_POINTS;
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      // Nudge slightly along the surface normal so the dot doesn't
      // z-fight with the surface it's marking.
      const offset = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).multiplyScalar(0.004) : new THREE.Vector3();
      const p = hit.point.clone().add(offset);
      pos.setXYZ(i, p.x, p.y, p.z);
      pos.needsUpdate = true;
      // Bounding sphere is cached on first frame (all-zero positions); it
      // must be invalidated on every update or the Points object gets
      // frustum-culled once real points land outside that stale sphere.
      geometry.boundingSphere = null;
      geometry.boundingBox = null;
      countRef.current += 1;
      geometry.setDrawRange(0, Math.min(countRef.current, MAX_POINTS));
    });
  }, [active, camera, scene, gl, raycaster, geometry]);

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={10} visible={visible}>
      <pointsMaterial
        map={texture}
        size={0.045}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#ffffff"
      />
    </points>
  );
}
