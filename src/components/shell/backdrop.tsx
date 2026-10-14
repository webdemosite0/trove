/**
 * Workspace ground — a plain canvas in both themes (clean & calm redesign:
 * no washes, glows or gradients). Fixed so it stays put while pages scroll.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="nx-no-print pointer-events-none fixed inset-0 -z-10 bg-canvas"
    />
  );
}
