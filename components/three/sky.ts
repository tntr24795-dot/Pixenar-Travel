import * as THREE from "three";

const DAWN_COLOR = new THREE.Color("#F4C98C"); // warm runway/dawn horizon -- keep in sync with the
                                                // canvas `bg-[#F4C98C]` fallback in `hero-scene.tsx`.
const DAY_SKY_COLOR = new THREE.Color("#6FB6E8"); // clear daytime sky

const CLOUD_COUNT = 9;

/**
 * Owns the scene's background color plus a handful of soft low-poly "cloud"
 * blobs and a glowing sun disc that fade in and drift as the plane climbs.
 * Replaces the old starfield/destination-marker `ParticleField` +
 * `DestinationField` pair now that the hero tells a runway-takeoff story
 * instead of a night-sky one.
 *
 * IMPORTANT (iOS Safari Dark Mode fix): `scene.background` is set here and
 * kept updated on every frame -- never left `null`. Combined with
 * `alpha: false` in `world.ts`, this means the canvas always paints a real,
 * fully-opaque color everywhere, on every platform. See `world.ts` for the
 * full explanation of the bug this replaced setup was hit by.
 */
export class Sky {
  readonly group: THREE.Group;
  private readonly scene: THREE.Scene;
  private readonly cloudGeometry: THREE.SphereGeometry;
  private readonly clouds: THREE.Mesh[] = [];
  private readonly cloudMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly cloudBasePositions: THREE.Vector3[] = [];
  private readonly sunGeometry: THREE.CircleGeometry;
  private readonly sunMaterial: THREE.MeshBasicMaterial;
  private readonly sun: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.background = DAWN_COLOR.clone();

    this.group = new THREE.Group();

    this.sunGeometry = new THREE.CircleGeometry(1.6, 32);
    this.sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff4dd });
    this.sun = new THREE.Mesh(this.sunGeometry, this.sunMaterial);
    this.sun.position.set(-3.5, 1.2, -15);
    this.group.add(this.sun);

    this.cloudGeometry = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        transparent: true,
        opacity: 0,
      });
      const cloud = new THREE.Mesh(this.cloudGeometry, material);
      const radius = 5 + Math.random() * 9;
      const angle = Math.random() * Math.PI * 2;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        3 + Math.random() * 6,
        Math.sin(angle) * radius - 6
      );
      cloud.position.copy(position);
      const scale = 1.2 + Math.random() * 1.8;
      cloud.scale.set(scale * 1.6, scale * 0.7, scale);
      this.clouds.push(cloud);
      this.cloudMaterials.push(material);
      this.cloudBasePositions.push(position.clone());
      this.group.add(cloud);
    }
  }

  /** `progress` is the overall 0..1 flight progress driven by ScrollRig. */
  update(progress: number, time: number) {
    const bg = DAWN_COLOR.clone().lerp(DAY_SKY_COLOR, progress);
    this.scene.background = bg;

    this.sun.position.y = 1.2 + progress * 2.5;

    this.clouds.forEach((cloud, i) => {
      const base = this.cloudBasePositions[i];
      const drift = Math.sin(time * 0.15 + i) * 0.4;
      cloud.position.set(base.x + drift, base.y - progress * 2 + Math.sin(time * 0.1 + i * 2) * 0.2, base.z + progress * 3);
      const fadeIn = Math.min(1, Math.max(0, (progress - 0.15) * 2));
      this.cloudMaterials[i].opacity = fadeIn * 0.9;
    });
  }

  dispose() {
    this.cloudGeometry.dispose();
    this.cloudMaterials.forEach((m) => m.dispose());
    this.sunGeometry.dispose();
    this.sunMaterial.dispose();
  }
}
