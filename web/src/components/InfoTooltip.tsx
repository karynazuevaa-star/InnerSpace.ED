// A small "?" badge that shows a brief explanation on hover/focus -
// requested directly for the eye-tracking panel heading on the avatar page
// (specialists weren't sure what it was without reading the always-visible
// note below it), written generically enough to reuse next to any other
// heading that could use the same one-line "what is this" popover.
// tabIndex/role make it reachable and readable via keyboard and screen
// readers, not just mouse hover.
export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-badge" tabIndex={0} role="note" aria-label={text}>
      ?<span className="info-badge__tooltip">{text}</span>
    </span>
  );
}
