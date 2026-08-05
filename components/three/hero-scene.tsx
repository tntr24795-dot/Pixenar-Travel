"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { SceneCamera } from "./camera";
import { DestinationField } from "./destination-field";
import { Lights } from "./lights";
import { ParticleField } from "./particle-field";
import { ScrollRig } from "./scroll-rig";
import { World } from "./world";

const FULL_PARTICLE_COUNT = 1600;
const REDUCED_PARTICLE_COUNT = 300;

/**
 * The 3D cinematic hero background. Fixed full-viewport canvas (behind all
 * page content) so the GSAP `ScrollRig` narrative -- Hero -> Destinations
 * reveal -> CTA -- stays visible for the whole homepage scroll, not just the
 * first screen. See `world.ts` / `camera.ts` / `lights.ts` / `scroll-rig.ts`
 * for the "one class per concern" scene modules.
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
    let particles: ParticleField;
    let destinations: DestinationField;
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let scrollRig: ScrollRig | null = null;
    let frameId: number | null = null;

    try {
      world = new World({ canvas });
      sceneCamera = new SceneCamera(window.innerWidth / window.innerHeight);

      const lights = new Lights();
      particles = new ParticleField({
        count: reducedMotion ? REDUCED_PARTICLE_COUNT : FULL_PARTICLE_COUNT,
      });
      destinations = new DestinationField();

      world.scene.add(lights.group, particles.points, destinations.group);
      world.setSize(window.innerWidth, window.innerHeight);

      if (enableBloom) {
        composer = new EffectComposer(world.renderer);
        composer.addPass(new RenderPass(world.scene, sceneCamera.camera));
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.6, // strength
          0.5, // radius
          0.35 // threshold -- only the bright gold markers should bloom
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

    if (!reducedMotion) {
      // These ids are the contract with `app/(public)/page.tsx`'s section
      // markup: `#hero`, `#destinations`, `#cta` are the three scroll beats.
      const heroEl = document.getElementById("hero") ?? canvas;
      const destinationsEl = document.getElementById("destinations");
      const ctaEl = document.getElementById("cta");

      scrollRig = new ScrollRig({
        camera: sceneCamera,
        particles,
        onBloomChange: (strength) => {
          if (bloomPass) bloomPass.strength = strength;
        },
        heroEl,
        destinationsEl,
        ctaEl,
        scrub: 1.5,
      });
    }

    const clock = new THREE.Clock();
    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      particles.update(elapsed);
      destinations.update(elapsed);
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
      particles.dispose();
      destinations.dispose();
      world.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      aria-label="Decorative 3D animated hero scene"
      className="fixed inset-0 -z-10 h-full w-full"
    />
  );
}
