/**
 * CSS-only gradient hero background. Used as the `WebGLErrorBoundary`
 * fallback when WebGL is unavailable entirely. Deliberately kept in its own
 * tiny, dependency-free file (no `three`/GSAP imports, no "use client") so it
 * never pulls the heavy 3D bundle in for users who only ever see this --
 * `HeroScene` is loaded separately via `next/dynamic({ ssr: false })`.
 */
export function StaticHeroFallback() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full bg-gradient-to-br from-brand-ink via-[#132033] to-brand-teal/40"
    />
  );
}
