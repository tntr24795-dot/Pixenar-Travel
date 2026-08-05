import * as THREE from "three";

/**
 * Soft, "boutique hospitality" lighting rig: a cool ambient fill plus a warm
 * key light (so the low-poly islands and gold markers read as softly lit
 * rather than flat/unlit) and a teal rim light for depth.
 */
export class Lights {
  readonly group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();

    const ambient = new THREE.AmbientLight(0x3a4a66, 0.6);

    const key = new THREE.DirectionalLight(0xffddaa, 1.4);
    key.position.set(4, 6, 3);

    const rim = new THREE.DirectionalLight(0x1c7293, 0.5);
    rim.position.set(-6, 2, -4);

    this.group.add(ambient, key, rim);
  }
}
