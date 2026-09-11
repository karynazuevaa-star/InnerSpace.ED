import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// A clickable seat for the sit-down feature (see PlayerControls' own doc
// comment) - `position` is the chair's own seat position (matches its
// <Chair position> in CafeEnvironment.tsx) and `yaw` is the camera
// orientation facing the table from that chair, NOT the chair's own
// rotationY prop: Chair's default (rotationY=0) faces world +Z, but
// PlayerControls' own yaw=0 faces -Z (see MOVE_SPEED's neighboring
// comment) - opposite defaults - so yaw here is always rotationY + PI.
export interface Seat {
  position: [number, number, number];
  yaw: number;
}

const EYE_HEIGHT = 1.6;
const SEAT_EYE_HEIGHT = 1.15; // seated eye height - ~0.45m lower than standing
const SIT_RADIUS_METERS = 1.4; // how close a click needs the player to already be, to sit
const SIT_EASE_RATE = 3.5; // camera position ease rate while sitting down/standing up
const SIT_TRANSITION_HOLD_SECONDS = 0.5; // how long after standing up to keep using the slow ease
const CLICK_MAX_MOVE_PIXELS = 6; // pointerdown->up movement under this counts as a click, not a drag
const CLICK_MAX_DURATION_MS = 400;
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
 *
 * `seats`, optional: click-to-sit, requested directly - click a seat (a
 * short tap, not a drag-look gesture) while standing within SIT_RADIUS_
 * METERS of it and the camera eases down to that seat's eye height and
 * turns to face the table; click again (anywhere - standing up doesn't
 * need to be aimed at anything) to stand back up. Deliberately NOT real
 * raycasting against the actual Chair meshes in CafeEnvironment.tsx - at
 * this room's scale (seats several meters apart, only one realistically
 * in click range at a time) "nearest seat within range" lands on the same
 * chair a raycast would, without needing those meshes to carry their own
 * click handlers or this component to know anything about the scene
 * graph beyond a plain position/yaw list.
 */
export function PlayerControls({
  start,
  startYaw,
  bounds,
  seats,
  onNearSeatChange,
  onSitChange,
}: {
  start: [number, number];
  startYaw: number;
  bounds: RoomBounds;
  seats?: Seat[];
  // Requested directly: "some indication" a seat is sittable before you
  // click it. Fires only on actual enter/exit of SIT_RADIUS_METERS (not
  // every frame) with the seat's own index into `seats`, or null once out
  // of range - CafeScene.tsx uses it to show/hide an HTML hint, same
  // near/far pattern CounterProximityWatcher already uses for the counter
  // menu, just folded into this component since it already tracks `pos`
  // and `seats` and a second component reading the camera independently
  // would only be duplicating that.
  onNearSeatChange?: (index: number | null) => void;
  // Fires on the actual sit/stand transition (not every eased frame) -
  // CafeScene.tsx uses this for the table-menu feature (see its own
  // comment): which table the player is AT is derived from which seat
  // they're sitting in.
  onSitChange?: (index: number | null) => void;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(startYaw);
  const pitch = useRef(0);
  const pos = useRef(new THREE.Vector2(start[0], start[1]));
  const pressed = useRef(new Set<string>());
  const dragging = useRef(false);
  const seatedIndex = useRef<number | null>(null);
  const nearSeatIndex = useRef<number | null>(null);
  // Counts down after standing up so the camera still eases back up to
  // EYE_HEIGHT instead of snapping - see the useFrame block's own comment
  // on why sitting down and standing up need a slower ease than walking.
  const standingUpTimer = useRef(0);
  const clickStart = useRef<{ x: number; y: number; t: number } | null>(null);
  // Latest callback refs, updated every render but not depended on by the
  // pointer-event effect below - avoids resubscribing DOM listeners every
  // time CafeScene.tsx re-renders with a fresh (but equivalent) callback.
  const onNearSeatChangeRef = useRef(onNearSeatChange);
  onNearSeatChangeRef.current = onNearSeatChange;
  const onSitChangeRef = useRef(onSitChange);
  onSitChangeRef.current = onSitChange;

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
      clickStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging.current = false;
      el.releasePointerCapture(e.pointerId);
      const start = clickStart.current;
      clickStart.current = null;
      if (!start) return;
      const movedPixels = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const heldMs = performance.now() - start.t;
      if (movedPixels > CLICK_MAX_MOVE_PIXELS || heldMs > CLICK_MAX_DURATION_MS) return;
      // A real click/tap, not a drag-look - see PlayerControls' own doc
      // comment on why standing up doesn't need to be aimed at a seat but
      // sitting down does.
      if (seatedIndex.current !== null) {
        seatedIndex.current = null;
        standingUpTimer.current = SIT_TRANSITION_HOLD_SECONDS;
        onSitChangeRef.current?.(null);
        return;
      }
      if (!seats || seats.length === 0) return;
      let nearest = -1;
      let nearestDist = SIT_RADIUS_METERS;
      seats.forEach((seat, i) => {
        const d = Math.hypot(seat.position[0] - pos.current.x, seat.position[2] - pos.current.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      });
      if (nearest >= 0) {
        seatedIndex.current = nearest;
        yaw.current = seats[nearest].yaw;
        pitch.current = 0;
        // No longer "near" a seat once actually sitting in it - the hint
        // is for "you could sit here", not relevant once you have.
        if (nearSeatIndex.current !== null) {
          nearSeatIndex.current = null;
          onNearSeatChangeRef.current?.(null);
        }
        onSitChangeRef.current?.(nearest);
      }
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
  }, [gl, seats]);

  useFrame((_, delta) => {
    const sitting = seatedIndex.current !== null;
    if (!sitting) {
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

      // "Some indication you can sit" (requested directly) - same nearest-
      // within-range check the click handler itself runs, just every
      // frame instead of only at click time, and reported upward only on
      // an actual enter/exit rather than every frame (see onNearSeatChange
      // prop's own doc comment).
      if (seats && seats.length > 0) {
        let nearest = -1;
        let nearestDist = SIT_RADIUS_METERS;
        seats.forEach((seat, i) => {
          const d = Math.hypot(seat.position[0] - pos.current.x, seat.position[2] - pos.current.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = i;
          }
        });
        const found = nearest >= 0 ? nearest : null;
        if (found !== nearSeatIndex.current) {
          nearSeatIndex.current = found;
          onNearSeatChangeRef.current?.(found);
        }
      }
    }

    if (standingUpTimer.current > 0) standingUpTimer.current -= delta;
    const targetPos = sitting
      ? new THREE.Vector3(seats![seatedIndex.current!].position[0], SEAT_EYE_HEIGHT, seats![seatedIndex.current!].position[2])
      : new THREE.Vector3(pos.current.x, EYE_HEIGHT, pos.current.y);
    if (sitting || standingUpTimer.current > 0) {
      // Sitting down, and the brief window right after standing back up,
      // ease the camera instead of snapping it - reads as a deliberate
      // move. Ordinary walking below skips this entirely (a plain
      // position.set, same as before this feature existed) so normal
      // movement stays exactly as responsive as it always was - not run
      // through this same lerp, which would read as sluggish WASD input.
      camera.position.lerp(targetPos, 1 - Math.exp(-SIT_EASE_RATE * delta));
    } else {
      camera.position.copy(targetPos);
    }
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
  });

  return null;
}
