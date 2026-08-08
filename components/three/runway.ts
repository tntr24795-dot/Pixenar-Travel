import * as THREE from "three";

/**
 * The tarmac the plane starts on: a ground plane plus painted centerline
 * stripes, positioned under the `Airplane`. Fades out (opacity, then
 * `visible = false`) once the plane has lifted off so it doesn't awkwardly
 * persist once the camera has climbed well above it.
 */
export class Runway {
  readonly group: THREE.Group;
  private readonly groundGeometry: THREE.PlaneGeometry;
  private readonly groundMaterial: THREE.MeshStandardMaterial;
  private readonly stripeGeometry: THREE.PlaneGeometry;
  private readonly stripeMaterials: THREE.MeshStandardMaterial[] = [];

  constructor() {
    this.group = new THREE.Group();

    this.groundGeometry = new THREE.PlaneGeometry(10, 40);
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555a61,
      roughness: 0.95,
      transparent: true,
    });
    const ground = new THREE.Mesh(this.groundGeometry, this.groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.1, -6);
    this.group.add(ground);

    this.stripeGeometry = new THREE.PlaneGeometry(0.35, 1.6);
    for (let i = 0; i < 8; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xf5f3ef,
        transparent: true,
      });
      const stripe = new THREE.Mesh(this.stripeGeometry, material);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, -1.09, -1 - i * 2.6);
      this.stripeMaterials.push(material);
      this.group.add(stripe);
    }
  }

  /** `progress` 0..1 overall flight progress -- the runway fades out by ~30%. */
  update(progress: number) {
    const opacity = Math.max(0, 1 - progress * 3.2);
    this.groundMaterial.opacity = opacity;
    this.stripeMaterials.forEach((m) => (m.opacity = opacity));
    this.group.visible = opacity > 0.01;
  }

  dispose() {
    this.groundGeometry.dispose();
    this.groundMaterial.dispose();
    this.stripeGeometry.dispose();
    this.stripeMaterials.forEach((m) => m.dispose());
  }
}
