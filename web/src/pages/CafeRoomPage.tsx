import { CafeScene } from '../components/rooms/CafeScene';

// The "<- Rooms" back button/hint pair used to live here as a plain
// overlay, but it now needs to share the specialist-guide's own exit
// handler (show a results summary before navigating, if both anxiety
// ratings are set) - that state only exists inside CafeScene, so the
// overlay moved in there with it (see CafeScene.tsx's own comment).
export function CafeRoomPage() {
  return (
    <div className="home-page">
      <div className="scene-pane">
        <CafeScene />
      </div>
    </div>
  );
}
