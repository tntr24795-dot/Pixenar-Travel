import * as THREE from "three";

const ISLAND_COUNT = 36;
const MARKER_COUNT = 8;

/**
 * A scattered field of low-poly "islands" (instanced icosahedrons standing in
 * for vacation destinations -- no external .glb models, built entirely from
 * primitive geometry per the guide) plus a handful of pulsing warm-gold
 * "destination marker" points that the bloom pass picks out as glowing dots
 * representing cities.
 */
export class DestinationField {
  readonly group: THREE.Group;
  private readonly islandGeometry: THREE.IcosahedronGeometry;
  private readonly islandMaterial: THREE.MeshStandardMaterial;
  private readonly islands: THREE.InstancedMesh;
  private readonly markerGeometry: THREE.SphereGeometry;
  private readonly markers: THREE.Mesh[] = [];
  private readonly markerMaterials: THREE.MeshBasicMaterial[] = [];

  constructor() {
    this.group = new THREE.Group();

    this.islandGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    this.islandMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f3ef,
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
    });
    this.islands = new THREE.InstancedMesh(this.islandGeometry, this.islandMaterial, ISLAND_COUNT);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < ISLAND_COUNT; i++) {
      const radius = 4 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      dummy.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.6) * 2.5,
        Math.sin(angle) * radius - 3
      );
      dummy.scale.setScalar(0.4 + Math.random() * 1.1);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();
      this.islands.setMatrixAt(i, dummy.matrix);
    }
    this.islands.instanceMatrix.needsUpdate = true;
    this.group.add(this.islands);

    this.markerGeometry = new THREE.SphereGeometry(0.09, 12, 12);
    for (let i = 0; i < MARKER_COUNT; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xe8b85a });
      const marker = new THREE.Mesh(this.markerGeometry, material);
      const radius = 3 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      marker.position.set(
        Math.cos(angle) * radius,
        Math.random() * 1.5,
        Math.sin(angle) * radius - 3
      );
      this.markers.push(marker);
      this.markerMaterials.push(material);
      this.group.add(marker);
    }
  }

  update(time: number) {
    this.markers.forEach((marker, i) => {
      const pulse = 0.6 + Math.sin(time * 1.6 + i) * 0.4;
      marker.scale.setScalar(0.6 + pulse * 0.8);
      this.markerMaterials[i].color.setRGB(1, 0.72 + pulse * 0.15, 0.35 * pulse);
    });
  }

  dispose() {
    this.islandGeometry.dispose();
    this.islandMaterial.dispose();
    this.markerGeometry.dispose();
    this.markerMaterials.forEach((m) => m.dispose());
  }
}
