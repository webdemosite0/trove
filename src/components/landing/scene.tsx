/**
 * Soft photographic background for the landing page.
 * Abstract image + gradient veil + drifting orbs.
 */
export function LandingScene() {
  return (
    <div className="landing-scene" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="landing-scene__img"
        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80"
        alt=""
        width={1920}
        height={1080}
        decoding="async"
      />
      <div className="landing-scene__veil" />
      <div className="landing-grid" />
      <span className="landing-orb landing-orb--1" />
      <span className="landing-orb landing-orb--2" />
      <span className="landing-orb landing-orb--3" />
    </div>
  );
}
