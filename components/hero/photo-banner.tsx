import Image from "next/image";

/**
 * Small static real-photo banner used at the top of the Search and Listing
 * Detail pages. Plain, non-animated `fill` image: these banners are only
 * ~240-360px tall, too short for the homepage's scroll cross-fade to read
 * as intentional.
 *
 * Image: a warm, minimalist living-room interior -- supplied directly by the
 * client, who confirmed they own the rights to it (`public/images/living-room-hero.png`).
 * Served from `public/` (a local file), not `images.unsplash.com` -- unlike
 * the homepage hero's photos, this one isn't Unsplash-licensed, so it's kept
 * out of the remote-image config entirely.
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
        src="/images/living-room-hero.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />
    </div>
  );
}
