import * as THREE from "three";

/**
 * Wraps the cinematic camera -- 75deg FOV "wide lens" per the guide, starting
 * pulled back at `(0, 2, 8)` (the Hero beat's "camera pulls back from
 * darkness" starting pose before ScrollRig scrubs it forward).
 */
export class SceneCamera {
  readonly camera: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
