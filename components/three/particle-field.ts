import * as THREE from "three";
import { particleFragmentShader, particleVertexShader } from "./shaders/particles";

export interface ParticleFieldOptions {
  count: number;
}

/**
 * GPU-instanced starfield/dust particle system: a single `THREE.Points`
 * object driven by a custom vertex/fragment `ShaderMaterial`. A few hundred
 * to a couple thousand particles is plenty for a hero background -- no need
 * for hundreds of thousands.
 */
export class ParticleField {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  constructor({ count }: ParticleFieldOptions) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    // Pixenar Travel palette: warm gold, teal, soft mist -- matches `brand.*` tokens.
    const palette = [
      new THREE.Color(0xe8b85a),
      new THREE.Color(0x1c7293),
      new THREE.Color(0xf5f3ef),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
      sizes[i] = Math.random() * 2 + 0.5;
      speeds[i] = Math.random() * 0.6 + 0.2;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1 },
        uOpacity: { value: 0.8 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
  }

  update(time: number) {
    this.material.uniforms.uTime.value = time;
  }

  /** Scroll-driven intensity (0..~1.2), scrubbed by ScrollRig during the Destinations beat. */
  set intensity(value: number) {
    this.material.uniforms.uOpacity.value = value;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
