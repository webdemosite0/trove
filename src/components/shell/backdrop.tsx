/**
 * Workspace ground — light lavender wash or deep blue-black night sky.
 * No grid lines. Fixed so it stays put while pages scroll.
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
              "linear-gradient(155deg, #fdfdff 0%, #f8f7ff 40%, #f6f9ff 70%, #fdf9fd 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 8% 18%, rgba(168,85,247,0.07), transparent 58%)," +
              "radial-gradient(ellipse 50% 40% at 92% 12%, rgba(59,130,246,0.06), transparent 55%)," +
              "radial-gradient(ellipse 45% 35% at 78% 88%, rgba(236,72,153,0.05), transparent 60%)," +
              "radial-gradient(ellipse 40% 30% at 18% 85%, rgba(34,211,238,0.05), transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(224,231,255,0.35), transparent 60%)",
          }}
        />
      </div>

      {/* Dark theme — the same flat #212121 as the homepage, with faint violet glows */}
      <div className="absolute inset-0 nx-bg-dark">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 42% at 6% 16%, rgba(139,92,246,0.16), transparent 72%)," +
              "radial-gradient(ellipse 46% 38% at 96% 12%, rgba(99,102,241,0.13), transparent 70%)," +
              "radial-gradient(ellipse 55% 45% at 90% 92%, rgba(139,92,246,0.08), transparent 74%)",
          }}
        />
      </div>
    </div>
  );
}
