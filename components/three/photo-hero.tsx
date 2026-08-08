/**
 * A real, licensed interior photograph -- a neutral, elegant living room --
 * used as a fixed (non-scrolling) hero background, more fitting for a
 * vacation-rental site than the earlier airplane concept. Free to use
 * commercially with no attribution required under the Unsplash License:
 * https://unsplash.com/photos/elegant-living-room-with-neutral-colors-and-art-z6Yn9hhlrJw
 * by Rebecca Chandler.
 *
 * Swap this URL for a different photo any time -- just confirm whatever
 * replaces it is royalty-free for commercial use.
 */
const HERO_PHOTO_URL =
  "https://images.unsplash.com/photo-1750639258774-9a714379a093?fm=jpg&q=80&w=2400&auto=format&fit=crop";

/**
 * Simple, static hero background: `fixed inset-0` pins it to the viewport,
 * so it stays completely still while the page content scrolls over it --
 * no scroll-linked movement, per the request to keep the background
 * stationary instead of animating with scroll.
 */
export default function PhotoHero() {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_PHOTO_URL})` }}
      />
      {/* Dark scrim so the headline/search bar stay readable over the photo,
          regardless of how bright the room is in a given part of the image. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-havena-ink" />
    </div>
  );
}
