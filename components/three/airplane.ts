import * as THREE from "three";

/**
 * Low-poly stylized airplane built entirely from primitive geometry (no
 * external .glb models) in the brand palette. Starts resting on the runway;
 * `update(progress)` is the only way it moves -- a simple scripted takeoff
 * arc driven by scroll, no physics simulation.
 */
export class Airplane {
  readonly group: THREE.Group;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor() {
    this.group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff5a5f, roughness: 0.4, metalness: 0.1 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xe8b85a, roughness: 0.4, metalness: 0.1 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.5 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x1c7293, roughness: 0.2, metalness: 0.3 });
    this.materials.push(bodyMaterial, accentMaterial, darkMaterial, glassMaterial);

    const fuselageGeometry = new THREE.CapsuleGeometry(0.28, 1.6, 4, 8);
    const fuselage = new THREE.Mesh(fuselageGeometry, bodyMaterial);
    fuselage.rotation.z = Math.PI / 2;
    this.group.add(fuselage);
    this.geometries.push(fuselageGeometry);

    const noseGeometry = new THREE.ConeGeometry(0.28, 0.5, 8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(1.05, 0, 0);
    this.group.add(nose);
    this.geometries.push(noseGeometry);

    const cockpitGeometry = new THREE.SphereGeometry(0.16, 8, 8);
    const cockpit = new THREE.Mesh(cockpitGeometry, glassMaterial);
    cockpit.position.set(0.55, 0.18, 0);
    this.group.add(cockpit);
    this.geometries.push(cockpitGeometry);

    const wingGeometry = new THREE.BoxGeometry(1.5, 0.06, 0.5);
    const wing = new THREE.Mesh(wingGeometry, accentMaterial);
    wing.position.set(-0.05, -0.02, 0);
    this.group.add(wing);
    this.geometries.push(wingGeometry);

    const tailWingGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.3);
    const tailWing = new THREE.Mesh(tailWingGeometry, accentMaterial);
    tailWing.position.set(-0.85, 0.05, 0);
    this.group.add(tailWing);
    this.geometries.push(tailWingGeometry);

    const finGeometry = new THREE.BoxGeometry(0.45, 0.5, 0.05);
    const fin = new THREE.Mesh(finGeometry, darkMaterial);
    fin.position.set(-0.85, 0.3, 0);
    this.group.add(fin);
    this.geometries.push(finGeometry);

    this.group.rotation.y = Math.PI / 2;
    this.group.position.set(0, -0.85, 2);
  }

  /** `progress` 0..1 overall flight progress. */
  update(progress: number) {
    // Takeoff roll (0 -> 0.12): stays on the ground.
    // Liftoff + climb (0.12 -> 1): rises, pitches nose-up, recedes into the distance.
    const liftProgress = Math.max(0, (progress - 0.12) / 0.88);
    this.group.position.y = -0.85 + liftProgress * 6.2;
    this.group.position.z = 2 - progress * 9;
    this.group.position.x = progress * 1.4;
    this.group.rotation.x = -liftProgress * 0.55;
    this.group.rotation.z = Math.sin(progress * Math.PI * 2) * 0.03 * liftProgress;
    this.group.scale.setScalar(1 - progress * 0.25);
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
