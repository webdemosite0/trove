/**
 * Soft lavender workspace ground — matches the product photo.
 * Single GPU layer, no display-toggle flash between light/dark stacks.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="nx-no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ isolation: "isolate", contain: "strict" }}
    >
      {/* Light theme — photo wash (default) */}
      <div
        className="absolute inset-0 nx-bg-light"
        style={{
          background:
            "linear-gradient(165deg, #f8f7ff 0%, #f2efff 32%, #eef4ff 68%, #f6f8fc 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 42% at 10% 16%, rgba(167,139,250,0.18), transparent 60%)," +
              "radial-gradient(ellipse 48% 38% at 90% 10%, rgba(129,140,248,0.16), transparent 58%)," +
              "radial-gradient(ellipse 42% 32% at 80% 90%, rgba(196,181,253,0.12), transparent 62%)," +
              "radial-gradient(ellipse 80% 48% at 50% -8%, rgba(224,231,255,0.45), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(99,102,241,0.045) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(99,102,241,0.045) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 90% 75% at 50% 40%, #000 12%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 75% at 50% 40%, #000 12%, transparent 78%)",
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
