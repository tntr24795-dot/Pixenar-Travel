import * as THREE from "three";

/** Thin wrapper around a PerspectiveCamera that knows how to resize itself. */
export class SceneCamera {
  readonly camera: THREE.PerspectiveCamera;

  constructor(aspect: number, startZ: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, startZ);
    this.camera.lookAt(0, 0, 0);
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setZ(z: number) {
    this.camera.position.z = z;
  }
}
