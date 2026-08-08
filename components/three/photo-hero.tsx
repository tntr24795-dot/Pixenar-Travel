"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let scrollTriggerRegistered = false;

/**
 * A real, licensed photograph of an airplane in TRUE silhouette against a
 * sunset sky -- the entire aircraft reads as a solid dark shape, so no
 * surface detail, paint, or airline name/logo is visible at all (the
 * safest possible choice for avoiding any airline-branding/trademark
 * concern). Free to use commercially with no attribution required under
 * the Unsplash License:
 * https://unsplash.com/photos/silhouette-of-airplane-pz7vx75iMx0
 * by Ramon Kagie.
 *
 * Swap this URL for a different photo any time -- just make sure whatever
 * replaces it is confirmed royalty-free for commercial use and, ideally,
 * keeps this same silhouette/backlit look so branding never becomes an issue.
 */
const HERO_PHOTO_URL =
  "https://images.unsplash.com/photo-1566212774847-025968e5bf56?fm=jpg&q=80&w=2400&auto=format&fit=crop";

/**
 * Replaces the old abstract low-poly WebGL scene with a real photo that
 * GSAP ScrollTrigger animates as the page scrolls -- the plane drifts
 * upward, grows slightly, and tilts a few degrees, reading as "the plane
 * lifting off the runway" without needing an actual 3D aircraft model
 * (which would only ever look like a cartoon in primitive WebGL geometry;
 * a real photo is what makes this look real).
 */
export default function PhotoHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return; // static photo, no scroll-jacking, for accessibility

    if (!scrollTriggerRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      scrollTriggerRegistered = true;
    }

    const heroEl = document.getElementById("hero") ?? containerRef.current;

    const tween = gsap.fromTo(
      containerRef.current,
      { yPercent: 0, scale: 1.04, rotate: 0 },
      {
        yPercent: -18,
        scale: 1.18,
        rotate: -4,
        ease: "power1.in",
        scrollTrigger: {
          trigger: heroEl,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden">
      <div
        ref={containerRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_PHOTO_URL})` }}
      />
      {/* Dark scrim so the headline/search bar stay readable over the photo,
          regardless of how bright the sky is in a given region of the image. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-havena-ink" />
    </div>
  );
}
