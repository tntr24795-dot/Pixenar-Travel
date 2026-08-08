"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Both photos are free to use for commercial purposes with no attribution
// required under the Unsplash License -- the same license already used for
// the "Popular destinations" photos elsewhere on this page.
const RUNWAY_PHOTO = {
  src: "https://images.unsplash.com/photo-1764273038713-afc0e677ca90?auto=format&fit=crop&w=1920&q=80",
  alt: "A real airplane parked on an airport runway at golden-hour sunrise, nose toward the camera",
  credit: "Eduard Galitsky / Unsplash",
};
const SKY_PHOTO = {
  src: "https://images.unsplash.com/photo-1769834628918-693863b58f68?auto=format&fit=crop&w=1920&q=80",
  alt: "A real airplane climbing into a dramatic sunset sky",
  credit: "Mario Colasurdo / Unsplash",
};

/**
 * Real-photograph hero background. Two full-bleed photos cross-fade as the
 * user scrolls from `#hero` through `#cta`: the plane starts parked on the
 * runway and, by the time the CTA section arrives, has climbed into the sky.
 *
 * This replaces an earlier low-poly Three.js/WebGL "cartoon" plane -- real
 * photography reads as far more premium, and dropping the <canvas> entirely
 * also permanently closes the class of iOS Safari Dark Mode bug this app hit
 * earlier (a <canvas> was the only reason that bug could happen at all).
 * Plain `next/image` + a scroll listener; no WebGL, no GSAP, nothing that can
 * throw and take the whole hero down with it.
 */
export function PhotoHero() {
  const skyRef = useRef<HTMLDivElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heroEl = document.getElementById("hero");
    const ctaEl = document.getElementById("cta");
    if (!heroEl) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const update = () => {
      const heroTop = heroEl.getBoundingClientRect().top + window.scrollY;
      const ctaBottom = ctaEl
        ? ctaEl.getBoundingClientRect().bottom + window.scrollY
        : heroTop + window.innerHeight * 3;
      const range = Math.max(1, ctaBottom - heroTop);
      const progress = Math.min(1, Math.max(0, (window.scrollY - heroTop) / range));

      if (skyRef.current) {
        skyRef.current.style.opacity = String(progress);
        skyRef.current.style.transform = `scale(${1 + progress * 0.08})`;
      }
      if (runwayRef.current) {
        runwayRef.current.style.transform = `scale(${1.08 - progress * 0.08})`;
      }
    };

    update();
    if (reducedMotion) return; // single static frame, no scroll-jacking

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-[#3b2f22]">
      <div ref={runwayRef} className="absolute inset-0 will-change-transform">
        <Image
          src={RUNWAY_PHOTO.src}
          alt={RUNWAY_PHOTO.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div ref={skyRef} className="absolute inset-0 opacity-0 will-change-transform">
        <Image src={SKY_PHOTO.src} alt={SKY_PHOTO.alt} fill sizes="100vw" className="object-cover" />
      </div>
    </div>
  );
}
