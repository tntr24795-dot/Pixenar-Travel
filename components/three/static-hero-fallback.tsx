/**
 * CSS-only gradient hero background. Used as the `WebGLErrorBoundary`
 * fallback when WebGL is unavailable entirely (unsupported browser, blocked
 * GPU process, driver crash, etc). Deliberately kept in its own tiny,
 * dependency-free file (no `three`/GSAP imports, no "use client") so it
 * never pulls the heavy 3D bundle in for users who only ever see this --
 * `HeroScene` is loaded separately via `next/dynamic({ ssr: false })`.
 *
 * Uses the same warm-dawn-to-sky palette as the WebGL scene's `Sky` class so
 * the fallback reads as an intentional, on-brand design rather than a
 * degraded state -- and is a plain light-colored gradient with a hard-coded
 * `background` (never `transparent`), so it can't be affected by the iOS
 * Safari Dark Mode "unstyled/transparent regions render solid black" issue
 * the old dark `brand-ink`-to-`brand-teal` version of this file was
 * vulnerable to.
 */
export function StaticHeroFallback() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-gradient-to-b from-[#FDEBD3] via-[#F2B073] to-[#6FB6E8]"
    >
      <svg viewBox="0 0 200 200" className="absolute bottom-[18%] left-1/2 h-24 w-24 -translate-x-1/2 drop-shadow-lg sm:h-32 sm:w-32">
        <ellipse cx="100" cy="110" rx="20" ry="60" fill="#FF5A5F" />
        <polygon points="100,60 40,136 100,120" fill="#E8B85A" />
        <polygon points="100,60 160,136 100,120" fill="#E8B85A" />
        <polygon points="84,160 100,190 116,160" fill="#0B0E14" />
      </svg>
      <div className="absolute inset-x-0 bottom-[10%] h-4 bg-black/10 blur-md" />
    </div>
  );
}
