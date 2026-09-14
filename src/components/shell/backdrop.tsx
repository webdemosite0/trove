/**
 * Soft lavender workspace ground — matches the product photo:
 * cool white → lilac wash, fine grid, gentle corner blooms.
 * Fixed so it stays put while pages scroll.
 * Light theme uses the photo palette; dark keeps the existing orb tokens.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="nx-no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Light theme — photo background */}
      <div className="absolute inset-0 nx-bg-light">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(165deg, #f8f7ff 0%, #f3f0ff 28%, #eef5ff 62%, #f7f9fc 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 8% 18%, rgba(167,139,250,0.22), transparent 58%)," +
              "radial-gradient(ellipse 50% 40% at 92% 12%, rgba(129,140,248,0.20), transparent 55%)," +
              "radial-gradient(ellipse 45% 35% at 78% 88%, rgba(196,181,253,0.16), transparent 60%)," +
              "radial-gradient(ellipse 40% 30% at 18% 85%, rgba(165,180,252,0.12), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(224,231,255,0.55), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(99,102,241,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 85% 70% at 50% 40%, #000 10%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 85% 70% at 50% 40%, #000 10%, transparent 75%)",
          }}
        />
      </div>

      {/* Dark theme — existing orb system */}
      <div className="absolute inset-0 nx-bg-dark">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle 40rem at 50% -8rem, var(--orb-a), transparent 70%)," +
              "radial-gradient(circle 28rem at 12% 12%, var(--orb-b), transparent 70%)," +
              "radial-gradient(circle 26rem at 88% 4%, var(--orb-c), transparent 70%)," +
              "linear-gradient(180deg, var(--grad-sky) 0%, transparent 42%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--grid-line) 1px, transparent 1px)," +
              "linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 75% 60% at 50% 30%, #000 15%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 60% at 50% 30%, #000 15%, transparent 78%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent 50%, var(--floor) 100%)",
          }}
        />
      </div>
    </div>
  );
}
