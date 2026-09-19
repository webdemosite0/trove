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

      {/* Dark theme — richer depth, soft blue/violet atmosphere */}
      <div className="absolute inset-0 nx-bg-dark">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #0a0a12 0%, #09090f 40%, #07070c 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(59,130,246,0.22), transparent 60%)," +
              "radial-gradient(ellipse 45% 40% at 12% 20%, rgba(99,102,241,0.14), transparent 55%)," +
              "radial-gradient(ellipse 40% 35% at 88% 15%, rgba(56,189,248,0.10), transparent 55%)," +
              "radial-gradient(ellipse 50% 40% at 70% 90%, rgba(139,92,246,0.08), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 45% at 50% 100%, rgba(0,0,0,0.45), transparent 55%)",
          }}
        />
      </div>
    </div>
  );
}
