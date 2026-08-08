import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

interface PhotoLayerOptions {
  /** Fixed world-space Z position for this layer's plane. */
  zPosition: number;
  /** The camera's starting world-space Z position -- used only to size the plane so it fills the frame at rest. */
  cameraStartZ: number;
  /** The camera's field of view, in degrees -- must match SceneCamera's fov. */
  cameraFovDeg: number;
  initialOpacity: number;
}

/**
 * A single real photograph, mapped onto a `THREE.PlaneGeometry` positioned at
 * a fixed depth in the scene. This is deliberately NOT a lit/shaded 3D
 * object -- it uses `MeshBasicMaterial` so the photo's own real colors and
 * lighting render untouched, with no synthetic shading that would make a
 * genuine photograph start to look like a rendered/cartoon asset. The "3D"
 * comes from real perspective: the camera dollies past several of these
 * photo planes stacked at different depths, so parallax and scale change
 * exactly the way they would if a camera were physically moving through a
 * space -- not from stylizing the photo itself.
 */
export class PhotoLayer {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly zPosition: number;
  private readonly distanceFromCameraStart: number;
  private readonly cameraFovDeg: number;
  private aspect: number;

  constructor(url: string, aspect: number, options: PhotoLayerOptions) {
    this.zPosition = options.zPosition;
    this.distanceFromCameraStart = Math.abs(options.cameraStartZ - options.zPosition);
    this.cameraFovDeg = options.cameraFovDeg;
    this.aspect = aspect;

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: options.initialOpacity,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.fitToViewport();

    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      },
      undefined,
      (err) => {
        // Non-fatal: the layer just stays an opaque/plain color instead of a
        // photo. HeroScene's own try/catch (init-time) is what triggers the
        // WebGLErrorBoundary fallback -- a single failed texture shouldn't
        // take down the whole 3D scene.
        console.error("[PhotoLayer] texture failed to load:", url, err);
      }
    );
  }

  get z() {
    return this.mesh.position.z;
  }

  set opacity(value: number) {
    this.mesh.material.opacity = value;
    this.mesh.visible = value > 0.002;
  }

  /** Sizes the plane so it exactly fills the camera's view frustum at this layer's depth, plus a small overscan margin. */
  private fitToViewport() {
    const OVERSCAN = 1.15;
    const vFovRad = (this.cameraFovDeg * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * this.distanceFromCameraStart;
    const height = visibleHeight * OVERSCAN;
    const width = height * this.aspect;

    this.mesh.scale.set(width, height, 1);
    this.mesh.position.z = this.zPosition;
  }

  resize(aspect: number) {
    this.aspect = aspect;
    this.fitToViewport();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.map?.dispose();
    this.mesh.material.dispose();
  }
}
