import Image from "next/image";

/**
 * Small static real-photo banner used at the top of the Search and Listing
 * Detail pages -- same photo/license as the homepage's `PhotoHero` (Unsplash
 * License, free for commercial use, no attribution required). Plain,
 * non-animated `fill` image: these banners are only ~240-360px tall, too
 * short for the homepage's scroll cross-fade to read as intentional.
 *
 * Replaces the old `<HeroScene />` (Three.js/WebGL) usage on these two pages,
 * which ran the *entire* cinematic scene -- scroll-linked to `#hero`/`#cta`
 * ids that don't even exist on these pages -- inside a strip a few hundred
 * pixels tall. A static photo is both lighter and actually correct here.
 */
export function PhotoBanner() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <Image
        src="https://images.unsplash.com/photo-1764273038713-afc0e677ca90?auto=format&fit=crop&w=1600&q=80"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />
    </div>
  );
}
