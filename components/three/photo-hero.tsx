/**
 * The user's own living room photo -- placed in /public and served locally
 * (not a remote URL), so no external hosting/licensing to track at all.
 * File: public/hero-living-room.jpg
 */
const HERO_PHOTO_URL = "/hero-living-room.jpg";

/**
 * Simple, static hero background: `fixed inset-0` pins it to the viewport,
 * so it stays completely still while the page content scrolls over it --
 * no scroll-linked movement, per the request to keep the background
 * stationary instead of animating with scroll.
 */
export default function PhotoHero() {
  return (
    <div className="fixed inset-0 z-0 h-full w-full overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 h-full w-full bg-cover"
        style={{ backgroundImage: `url(${HERO_PHOTO_URL})`, backgroundPosition: "center 80%" }}
      />
      {/* Dark scrim so the headline/search bar stay readable over the photo,
          regardless of how bright the room is in a given part of the image. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-havena-ink" />
    </div>
  );
}
