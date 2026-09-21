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
              "linear-gradient(155deg, #fbf7ff 0%, #f4efff 28%, #edf6ff 62%, #fff6fb 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 8% 18%, rgba(168,85,247,0.25), transparent 58%)," +
              "radial-gradient(ellipse 50% 40% at 92% 12%, rgba(59,130,246,0.22), transparent 55%)," +
              "radial-gradient(ellipse 45% 35% at 78% 88%, rgba(236,72,153,0.15), transparent 60%)," +
              "radial-gradient(ellipse 40% 30% at 18% 85%, rgba(34,211,238,0.14), transparent 55%)",
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
              "linear-gradient(180deg, #0a0718 0%, #080714 42%, #060611 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,58,237,0.30), transparent 60%)," +
              "radial-gradient(ellipse 45% 40% at 12% 20%, rgba(37,99,235,0.22), transparent 55%)," +
              "radial-gradient(ellipse 40% 35% at 88% 15%, rgba(217,70,239,0.16), transparent 55%)," +
              "radial-gradient(ellipse 50% 40% at 70% 90%, rgba(14,165,233,0.13), transparent 60%)," +
              "radial-gradient(ellipse 38% 32% at 15% 88%, rgba(45,212,191,0.09), transparent 58%)",
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
