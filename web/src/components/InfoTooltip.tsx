import { useState } from 'react';

// A small "?" badge next to a heading that reveals a brief explanation -
// requested directly for the eye-tracking panel heading on the avatar page
// (specialists weren't sure what it was without reading the always-visible
// note below it), written generically enough to reuse next to any other
// heading that could use the same one-line "what is this" note.
//
// Originally a pure-CSS hover/focus popover, absolutely positioned next to
// the badge - reported directly, twice, with screenshots: in this sidebar's
// narrow column there's rarely enough clear space above OR below a heading
// (BODY sits with the sliders it's explaining directly under it, and the
// Appearance picker directly above it), so an absolutely-positioned popover
// covered one or the other regardless of which direction it opened. A
// click-to-expand block that lays itself out in normal flow - pushing
// whatever comes after it down instead of floating over it - can't overlap
// anything at any viewport size, so that's what this is now.
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-badge-wrap">
      <button
        type="button"
        className="info-badge"
        aria-expanded={open}
        aria-label={text}
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && <span className="info-badge-text">{text}</span>}
    </span>
  );
}
