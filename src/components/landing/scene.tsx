/**
 * Soft photographic background for the landing page.
 * Pure CSS (lavender blooms + grid) — no remote image, no scroll jump.
 */
export function LandingScene() {
  return (
    <div className="landing-scene" aria-hidden>
      <div className="landing-scene__photo" />
      <div className="landing-scene__veil" />
      <div className="landing-grid" />
      <span className="landing-orb landing-orb--1" />
      <span className="landing-orb landing-orb--2" />
      <span className="landing-orb landing-orb--3" />
    </div>
  );
}
