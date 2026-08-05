import * as THREE from "three";

export interface WorldOptions {
  canvas: HTMLCanvasElement;
  alpha?: boolean;
}

/**
 * `World` owns the renderer + scene graph -- the "scene module" from the 3D
 * Cinematic guide (one class per concern), adapted to a single TS class
 * per concern-file since this is a React app rather than a folder of plain
 * `.js` files. One instance is created per `<HeroScene />` mount and torn
 * down in its cleanup function so no WebGL context leaks across navigations.
 */
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;

  constructor({ canvas, alpha = true }: WorldOptions) {
    // Throws synchronously if a WebGL context can't be created -- callers
    // must wrap construction in a try/catch to feed the error boundary.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha,
      powerPreference: "high-performance",
    });
    // Cap pixel ratio at 2x to avoid GPU overload on retina displays.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Recreates film-camera exposure handling for realistic HDR-ish lighting.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    // No `scene.background` is set -- the alpha:true canvas lets the page's
    // CSS gradient/background show through and blend with the 3D scene.
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
