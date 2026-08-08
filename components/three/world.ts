import * as THREE from "three";

/**
 * iOS Safari Dark-Mode fix (read this before touching renderer/scene setup):
 *
 * The original "3D Cinematic" hero used a *transparent* WebGLRenderer
 * (`alpha: true`) layered over page CSS, with no `scene.background` ever
 * set. Under iOS/iPadOS Safari's system Dark Mode, WebKit can paint
 * unstyled/transparent canvas regions solid black instead of leaving them
 * see-through -- the canvas was rendering fine, but the *browser* was
 * compositing it against a black backdrop, which made all our hero text
 * unreadable.
 *
 * The fix has three parts, and all three matter:
 *   1. `app/layout.tsx` sets `viewport.colorScheme = "light"`, which
 *      renders `<meta name="color-scheme" content="light">` -- this tells
 *      the browser this page has no dark theme, so it should not apply any
 *      automatic dark treatment of its own.
 *   2. `app/globals.css` sets `color-scheme: light` on `:root` as a CSS-level
 *      backstop for the same thing.
 *   3. Here: the renderer is created OPAQUE (`alpha: false`) and `scene`
 *      always has a real `THREE.Color` background assigned before the first
 *      frame renders. An opaque canvas with a real background color has
 *      nothing "unstyled" for WebKit to paint black in the first place.
 *
 * Do not flip `alpha` back to `true` or ship a scene with no
 * `scene.background` without re-testing on an actual iOS device in Dark
 * Mode -- this exact bug has shipped twice in this project already.
 */
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false, // opaque -- see writeup above
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    // Matches the runway photo's dusk tone so the very first paint (before
    // textures finish decoding) never flashes an unstyled black/white frame.
    this.scene.background = new THREE.Color("#2b2118");
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
  }

  render(camera: THREE.Camera) {
    this.renderer.render(this.scene, camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
