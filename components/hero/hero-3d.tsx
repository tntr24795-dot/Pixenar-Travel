"use client";

import dynamic from "next/dynamic";

import { PhotoHero } from "@/components/hero/photo-hero";
import { WebGLErrorBoundary } from "@/components/three/webgl-error-boundary";

// `ssr: false` is required here (and this file must be a Client Component)
// because HeroScene touches `window`/`document`/WebGL directly on mount --
// none of that exists during server rendering. `next/dynamic` with
// `ssr: false` can only be called from inside a Client Component boundary
// in the App Router, which is the only reason this tiny wrapper exists
// instead of importing HeroScene straight into the (server) homepage.
const HeroScene = dynamic(() => import("@/components/three/hero-scene"), {
  ssr: false,
  loading: () => <PhotoHero />,
});

/**
 * The homepage hero background: a real photo (runway -> sky) rendered as
 * textured planes in a genuine 3D scene, with the camera dollying through
 * them on scroll for real perspective/parallax -- not a flat crossfade and
 * not a stylized/cartoon 3D render (see components/three/photo-layer.ts).
 * Falls back to the plain 2D photo crossfade (`PhotoHero`) if WebGL isn't
 * available or the 3D scene throws for any reason.
 */
export function Hero3D() {
  return (
    <WebGLErrorBoundary fallback={<PhotoHero />}>
      <HeroScene />
    </WebGLErrorBoundary>
  );
}
