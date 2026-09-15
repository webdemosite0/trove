/**
 * Soft photographic background for the landing page.
 * Single static layer — no animated orbs (they caused visual glitch/banding).
 */
export function LandingScene() {
  return (
    <div className="landing-scene" aria-hidden>
      <div className="landing-scene__photo" />
      <div className="landing-grid" />
    </div>
  );
}
