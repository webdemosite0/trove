/**
 * Global workspace background — matches the product photo
 * (soft lavender, grid, corner blooms).
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="nx-no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ isolation: "isolate", contain: "strict" }}
    >
      {/* Light — photo palette */}
      <div className="absolute inset-0 nx-bg-light">
        <div className="nx-photo-bg" />
      </div>

      {/* Dark */}
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
