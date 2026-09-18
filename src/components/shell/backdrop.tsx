/**
 * Soft lavender workspace ground — cool white → lilac wash, corner blooms.
 * Grid lines removed for a cleaner surface.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="nx-no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ isolation: "isolate", contain: "strict" }}
    >
      {/* Light theme */}
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
      </div>

      {/* Dark theme */}
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
            background: "linear-gradient(to bottom, transparent 50%, var(--floor) 100%)",
          }}
        />
      </div>
    </div>
  );
}
