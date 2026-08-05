/**
 * Raw GLSL for the hero starfield/dust particle system, kept in its own
 * self-contained module with its own uniforms per the "Shader FX" layer of
 * the 3D Cinematic guide. Exported as TS string constants (rather than literal
 * `.glsl` files loaded via a webpack raw-loader) because this build doesn't
 * own `next.config.js` and can't add a loader rule for it -- functionally
 * equivalent, still hand-written raw GLSL, just inlined.
 */

export const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aColor;

  varying vec3 vColor;

  void main() {
    vColor = aColor;

    vec3 pos = position;
    // Gentle drift so the field reads as floating dust rather than static noise.
    pos.y += sin(uTime * aSpeed + position.x * 0.5) * 0.15;
    pos.x += cos(uTime * aSpeed * 0.6 + position.z * 0.5) * 0.12;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    // Perspective size attenuation, capped by device pixel ratio (matches the
    // renderer's own setPixelRatio(min(devicePixelRatio, 2)) cap).
    gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uOpacity;
  varying vec3 vColor;

  void main() {
    // Soft circular falloff so points read as glowing dust, not hard squares.
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    float alpha = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(vColor, alpha * uOpacity);
  }
`;
