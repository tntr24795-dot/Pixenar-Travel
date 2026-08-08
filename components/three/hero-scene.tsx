"use client";

import { useEffect, useRef } from "react";

import { World } from "./world";
import { SceneCamera } from "./camera";
import { PhotoLayer } from "./photo-layer";
import { ScrollRig } from "./scroll-rig";

const CAMERA_FOV_DEG = 45;
const CAMERA_START_Z = 6;
const CAMERA_END_Z = -4;

const RUNWAY_Z = 2;
const SKY_Z = -8;

const RUNWAY_PHOTO_URL =
  "https://images.unsplash.com/photo-1764273038713-afc0e677ca90?auto=format&fit=crop&w=1920&q=80";
const SKY_PHOTO_URL =
  "https://images.unsplash.com/photo-1769834628918-693863b58f68?auto=format&fit=crop&w=1920&q=80";

// Real Unsplash photo dimensions (fetched at 1920px wide crop, ~2:3 aspect
// source photos cropped by Unsplash's `fit=crop`) -- close enough for the
// plane's own aspect ratio; `object-fit`-style exactness doesn't matter
// since PhotoLayer overscans the plane by 15% past the viewport edges.
const PHOTO_ASPECT = 16 / 10;

/**
 * Throws synchronously if this browser/GPU can't give us a real WebGL
 * context, so the parent <WebGLErrorBoundary> can fall back to the plain
 * photo-crossfade hero instead of shipping a black canvas.
 */
function assertWebglSupported() {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!gl) {
    throw new Error("WebGL is not supported in this browser/GPU.");
  }
}

export function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    assertWebglSupported();

    const heroEl = document.getElementById("hero");
    const ctaEl = document.getElementById("cta");
    if (!heroEl) return;

    const parent = canvas.parentElement ?? document.body;
    const getSize = () => ({
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    });

    const world = new World(canvas);
    const { width, height } = getSize();
    world.setSize(width, height);

    const sceneCamera = new SceneCamera(width / height, CAMERA_START_Z);

    const runwayLayer = new PhotoLayer(RUNWAY_PHOTO_URL, PHOTO_ASPECT, {
      zPosition: RUNWAY_Z,
      cameraStartZ: CAMERA_START_Z,
      cameraFovDeg: CAMERA_FOV_DEG,
      initialOpacity: 1,
    });
    const skyLayer = new PhotoLayer(SKY_PHOTO_URL, PHOTO_ASPECT, {
      zPosition: SKY_Z,
      cameraStartZ: CAMERA_START_Z,
      cameraFovDeg: CAMERA_FOV_DEG,
      initialOpacity: 0,
    });

    world.scene.add(runwayLayer.mesh, skyLayer.mesh);

    const renderFrame = () => world.render(sceneCamera.camera);
    renderFrame();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applyProgress = (progress: number) => {
      // Real perspective dolly: the camera physically moves from the
      // runway's depth toward the sky layer's depth as the user scrolls,
      // rather than the planes cross-fading in place -- this is what gives
      // the genuine sense of "flying forward" instead of a flat 2D fade.
      sceneCamera.setZ(CAMERA_START_Z + (CAMERA_END_Z - CAMERA_START_Z) * progress);
      runwayLayer.opacity = 1 - progress;
      skyLayer.opacity = progress;
      renderFrame();
    };

    let scrollRig: ScrollRig | null = null;
    if (!reducedMotion) {
      scrollRig = new ScrollRig({ heroEl, ctaEl, onProgress: applyProgress });
    }

    const handleResize = () => {
      const { width, height } = getSize();
      world.setSize(width, height);
      sceneCamera.setAspect(width / height);
      runwayLayer.resize(width / height);
      skyLayer.resize(width / height);
      scrollRig?.refresh();
      renderFrame();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scrollRig?.kill();
      runwayLayer.dispose();
      skyLayer.dispose();
      world.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full"
    />
  );
}

export default HeroScene;
