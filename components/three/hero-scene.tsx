"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { Airplane } from "./airplane";
import { SceneCamera } from "./camera";
import { Lights } from "./lights";
import { Runway } from "./runway";
import { ScrollRig } from "./scroll-rig";
import { Sky } from "./sky";
import { World } from "./world";

/**
 * The 3D cinematic hero background: a low-poly airplane taking off from a
 * runway into an open sky as the user scrolls, from `#hero` all the way
 * through `#cta`. Fixed full-viewport canvas (behind all page content) so
 * the GSAP `ScrollRig` narrative stays visible for the whole homepage
 * scroll, not just the first screen.
 *
 * See `world.ts` for the fix to the iOS Safari Dark Mode "background turns
 * solid black" bug this scene replaced -- in short: the renderer is fully
 * opaque and `Sky` always keeps a real color on `scene.background`, and
 * `app/layout.tsx` declares `color-scheme: light` app-wide.
 */
export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initError, setInitError] = useState<Error | null>(null);

  // useEffect errors don't reach React error boundaries on their own -- store
  // the error and re-throw it synchronously during the next render so the
  // parent `WebGLErrorBoundary` actually catches it.
  if (initError) {
    throw initError;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLowEndDevice = (navigator.hardwareConcurrency ?? 8) <= 4;
    const enableBloom = !reducedMotion && !isLowEndDevice;

    let world: World;
    let sceneCamera: SceneCamera;
    let sky: Sky;
    let runway: Runway;
    let airplane: Airplane;
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let scrollRig: ScrollRig | null = null;
    let frameId: number | null = null;
    let progress = 0;

    try {
      world = new World({ canvas });
      sceneCamera = new SceneCamera(window.innerWidth / window.innerHeight);

      const lights = new Lights();
      sky = new Sky(world.scene);
      runway = new Runway();
      airplane = new Airplane();

      world.scene.add(lights.group, sky.group, runway.group, airplane.group);
      world.setSize(window.innerWidth, window.innerHeight);

      if (enableBloom) {
        composer = new EffectComposer(world.renderer);
        composer.addPass(new RenderPass(world.scene, sceneCamera.camera));
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.5, // strength
          0.6, // radius
          0.4 // threshold -- picks out the bright sun disc + gold accents
        );
        composer.addPass(bloomPass);
      }
    } catch (err) {
      setInitError(err instanceof Error ? err : new Error("WebGL initialization failed"));
      return;
    }

    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      sceneCamera.setAspect(innerWidth / innerHeight);
      world.setSize(innerWidth, innerHeight);
      composer?.setSize(innerWidth, innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Camera path: starts low and close, tracking the plane down the
    // runway, then pulls back and climbs to a high vantage above the clouds
    // by the time the CTA section arrives.
    const CAMERA_START = new THREE.Vector3(2.6, 0.4, 5.5);
    const CAMERA_END = new THREE.Vector3(-1.2, 3.4, 9.5);
    const LOOK_START = new THREE.Vector3(0, -0.4, -1);
    const LOOK_END = new THREE.Vector3(0, 2.2, -6);
    const lookTarget = new THREE.Vector3();

    const applyProgress = (p: number) => {
      progress = p;
      airplane.update(p);
      runway.update(p);
      sceneCamera.camera.position.lerpVectors(CAMERA_START, CAMERA_END, p);
      lookTarget.lerpVectors(LOOK_START, LOOK_END, p);
      sceneCamera.camera.lookAt(lookTarget);
      if (bloomPass) bloomPass.strength = 0.25 + p * 0.85;
    };

    if (!reducedMotion) {
      // These ids are the contract with `app/(public)/page.tsx`'s section
      // markup: the takeoff runs continuously from the top of `#hero` to the
      // bottom of `#cta`.
      const heroEl = document.getElementById("hero") ?? canvas;
      const ctaEl = document.getElementById("cta");

      scrollRig = new ScrollRig({
        onProgress: applyProgress,
        heroEl,
        ctaEl,
        scrub: 1.2,
      });
    }
    applyProgress(progress);

    const clock = new THREE.Clock();
    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      sky.update(progress, elapsed);
      if (composer) composer.render();
      else world.renderer.render(world.scene, sceneCamera.camera);
    };

    if (reducedMotion) {
      // Single static frame -- no rAF loop, no ScrollTrigger scrubbing/scroll-jacking.
      renderFrame();
    } else {
      const loop = () => {
        renderFrame();
        frameId = requestAnimationFrame(loop);
      };
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) cancelAnimationFrame(frameId);
      scrollRig?.kill();
      composer?.dispose();
      sky.dispose();
      runway.dispose();
      airplane.dispose();
      world.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      aria-label="Decorative animated airplane-takeoff hero scene"
      // Explicit light background color as a CSS-level failsafe -- matches
      // `Sky`'s initial dawn color -- so even before WebGL paints its first
      // frame the canvas is never transparent or (browser-default) black.
      className="fixed inset-0 -z-10 h-full w-full bg-[#F4C98C]"
    />
  );
}
