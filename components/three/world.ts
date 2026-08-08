import * as THREE from "three";

export interface WorldOptions {
  canvas: HTMLCanvasElement;
}

/**
 * `World` owns the renderer + scene graph -- the "scene module" from the 3D
 * Cinematic guide (one class per concern), adapted to a single TS class
 * per concern-file since this is a React app rather than a folder of plain
 * `.js` files. One instance is created per `<HeroScene />` mount and torn
 * down in its cleanup function so no WebGL context leaks across navigations.
 *
 * IMPORTANT (iOS Safari Dark Mode fix): the previous version rendered with
 * `alpha: true` and never set `scene.background`, relying on the page's CSS
 * background to show through the transparent canvas. On iOS Safari, with
 * system Dark Mode on and no `color-scheme` declared anywhere in the app,
 * WebKit would sometimes paint that transparent/unstyled canvas backdrop
 * solid black instead of leaving it see-through -- making any hero text
 * sitting on top of it unreadable. The fix has two parts: this renderer is
 * now fully opaque (`alpha: false`), and `Sky` (see `sky.ts`) always keeps
 * `scene.background` set to a real, continuously-updated color. Between the
 * two, there is no transparent/unstyled region left for any browser to
 * darken -- the canvas always paints a real color, on every platform, in
 * every color scheme. `app/layout.tsx` also now explicitly declares
 * `color-scheme: light` as a second, independent layer of defense.
 */
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;

  constructor({ canvas }: WorldOptions) {
    // Throws synchronously if a WebGL context can't be created -- callers
    // must wrap construction in a try/catch to feed the error boundary.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    // Cap pixel ratio at 2x to avoid GPU overload on retina displays.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Recreates film-camera exposure handling for realistic HDR-ish lighting.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    // `Sky.constructor` sets an initial `scene.background` immediately and
    // `Sky.update()` keeps it current every frame -- see the note above.
  }

  setSize(width: number, height: number) {
    // `false` (updateStyle) leaves CSS sizing to Tailwind classes on the canvas.
    this.renderer.setSize(width, height, false);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
