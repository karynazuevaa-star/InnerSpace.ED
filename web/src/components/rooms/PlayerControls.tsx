import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const EYE_HEIGHT = 1.6;
const MOVE_SPEED = 2.2; // meters/second
const LOOK_SPEED = 0.0035; // radians per pixel of drag

const KEY_TO_AXIS: Record<string, [number, number]> = {
  // [forward, strafe], forward is -Z (into the room)
  w: [1, 0],
  arrowup: [1, 0],
  s: [-1, 0],
  arrowdown: [-1, 0],
  a: [0, -1],
  arrowleft: [0, -1],
  d: [0, 1],
  arrowright: [0, 1],
};

/**
 * A simple walk-around controller for the exposure-practice rooms: drag to
 * look (yaw/pitch), WASD/arrows to move along the floor. Deliberately not
 * drei's OrbitControls (built for orbiting a fixed subject, not walking
 * through a space) or PointerLockControls (needs a fullscreen-style lock
 * gesture that doesn't play well embedded in a page). Movement is clamped
 * to `bounds` so the player can wander the room but not walk through walls.
 */
export function PlayerControls({ start, startYaw, bounds }: { start: [number, number]; startYaw: number; bounds: RoomBounds }) {
  const { camera, gl } = useThree();
  const yaw = useRef(startYaw);
  const pitch = useRef(0);
  const pos = useRef(new THREE.Vector2(start[0], start[1]));
  const pressed = useRef(new Set<string>());
  const dragging = useRef(false);

  useEffect(() => {
    camera.position.set(pos.current.x, EYE_HEIGHT, pos.current.y);
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (KEY_TO_AXIS[e.key.toLowerCase()]) pressed.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.key.toLowerCase());
    };
    const onPointerDown = (e: PointerEvent) => {
      dragging.current = true;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging.current = false;
      el.releasePointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= e.movementX * LOOK_SPEED;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * LOOK_SPEED, -1.1, 1.1);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.style.cursor = 'grab';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    let forward = 0;
    let strafe = 0;
    for (const key of pressed.current) {
      const axis = KEY_TO_AXIS[key];
      if (!axis) continue;
      forward += axis[0];
      strafe += axis[1];
    }
    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe) || 1;
      forward /= len;
      strafe /= len;
      const sinY = Math.sin(yaw.current);
      const cosY = Math.cos(yaw.current);
      // Forward looks down -Z at yaw=0; strafe is perpendicular to it.
      const dx = -sinY * forward + cosY * strafe;
      const dz = -cosY * forward - sinY * strafe;
      pos.current.x = THREE.MathUtils.clamp(pos.current.x + dx * MOVE_SPEED * delta, bounds.minX, bounds.maxX);
      pos.current.y = THREE.MathUtils.clamp(pos.current.y + dz * MOVE_SPEED * delta, bounds.minZ, bounds.maxZ);
    }

    camera.position.set(pos.current.x, EYE_HEIGHT, pos.current.y);
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
  });

  return null;
}
