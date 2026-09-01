/**
 * The aether swarm: a GPU point cloud that gathers out of the dark and settles
 * onto the crest.
 *
 * Every particle knows where it starts and where it belongs, and the whole
 * animation is one uniform sweeping from 0 to 1: no per-frame CPU work beyond
 * setting three floats. That is what lets it run twenty thousand motes at 60fps
 * while React renders the rest of the intro beside it.
 *
 * Everything is drawn additively with no post-processing pass. Bloom is faked by
 * oversized soft sprites and a CSS glow behind the canvas, which costs nothing
 * and cannot fail on a machine that dislikes framebuffers.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { sampleCrest } from './crest';

export interface IntroScene {
  /** `gather` 0→1 draws the swarm in; `burst` 0→1 throws it outward on exit. */
  setProgress(gather: number, burst: number): void;
  /**
   * Where the drawn crest actually is on screen, in CSS pixels.
   *
   * The swarm and the SVG crest have to be the same size *and* concentric, or the
   * line art lands inside a larger ring of motes and the illusion that one
   * solidifies into the other collapses. Rather than deriving the SVG's placement
   * from the camera, the camera's output is fitted to whatever the SVG measured,
   * which means the stylesheet stays free to clamp the size and to sit the crest
   * off-centre to make room for the title, with the swarm following.
   */
  setCrestRect(rect: { size: number; centerX: number; centerY: number }): void;
  render(elapsed: number): void;
  resize(): void;
  dispose(): void;
}

/** Matches the intro SVG's `viewBox`, which is what `setCrestPixelSize` measures. */
const VIEWBOX_SPAN = 2.9;
const CAMERA_FOV = 46;

const VERTEX = /* glsl */`
  uniform float uGather;
  uniform float uBurst;
  uniform float uTime;
  uniform float uPixelRatio;

  attribute vec3 aTarget;
  attribute vec3 aOrigin;
  attribute float aSeed;

  varying float vSettled;
  varying float vSeed;

  float easeOutCubic(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
  }

  void main() {
    // Each mote leaves at its own moment, so the swarm arrives as a wave rather
    // than as one block. The delay is folded back out of the remaining time so
    // every particle still lands exactly at uGather == 1.
    float delay = aSeed * 0.4;
    float t = clamp((uGather - delay) / max(1.0 - delay, 0.0001), 0.0, 1.0);
    float settled = easeOutCubic(t);

    vec3 position = mix(aOrigin, aTarget, settled);

    // Orbital drift on the way in, damped to nothing as the mote arrives.
    float drift = 1.0 - settled;
    float angle = uTime * 0.4 + aSeed * 6.2831853;
    position.x += sin(angle) * drift * 0.55;
    position.y += cos(angle * 0.8) * drift * 0.45;
    position.z += sin(angle * 1.3) * drift * 0.65;

    // A shimmer once settled, so the assembled crest breathes instead of freezing.
    position.z += sin(uTime * 2.2 + aSeed * 24.0) * 0.02 * settled;

    // The exit: everything thrown outward from the crest's centre.
    vec3 outward = normalize(aTarget + vec3(0.0, 0.0, 0.35));
    position += outward * uBurst * uBurst * 11.0;

    vSettled = settled;
    vSeed = aSeed;

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float size = mix(1.4, 3.6, aSeed) * uPixelRatio;
    gl_PointSize = size * (13.0 / max(-viewPosition.z, 0.001)) * (1.0 + settled * 0.7);
  }
`;

const FRAGMENT = /* glsl */`
  // No precision qualifier here on purpose. Three prepends one to both shaders,
  // and declaring mediump only in this half made uBurst and uTime differ in
  // precision between the two, which is a link error, not a warning: the
  // program fails to validate and nothing draws.

  uniform float uBurst;
  uniform float uTime;

  varying float vSettled;
  varying float vSeed;

  void main() {
    // A soft round falloff; the squared curve is what reads as a glow rather
    // than as a disc.
    vec2 offset = gl_PointCoord - 0.5;
    float radius = length(offset);
    if (radius > 0.5) discard;
    float alpha = pow(1.0 - radius * 2.0, 2.4);

    // Cold while adrift, warm once it belongs to the crest.
    vec3 cold = vec3(0.38, 0.68, 0.95);
    vec3 warm = vec3(1.0, 0.87, 0.60);
    vec3 colour = mix(cold, warm, smoothstep(0.2, 1.0, vSettled));

    // A slow per-mote twinkle, offset by seed so the field never pulses together.
    float twinkle = 0.75 + 0.25 * sin(uTime * 1.6 + vSeed * 30.0);

    float strength = alpha * (0.3 + vSettled * 0.7) * twinkle * (1.0 - uBurst);
    gl_FragColor = vec4(colour, strength);
  }
`;

/**
 * Builds the scene, or returns null when WebGL is unavailable.
 *
 * A null return is a supported outcome, not an error: the intro's own markup
 * carries the crest and the type, so losing the swarm costs atmosphere and
 * nothing else.
 */
export function createIntroScene(canvas: HTMLCanvasElement): IntroScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  // Capped: the effect is soft by design and gains nothing from a 4K backing
  // store, while the fill cost of additive points is real.
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 4.4;

  // Scaled to the viewport so the crest fills a phone and a monitor alike.
  const count = window.innerWidth < 900 ? 9000 : 20000;
  const targets = sampleCrest(count);

  const geometry = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  const origins = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const i3 = index * 3;

    // A little scatter off the line, so the crest reads as drawn in light rather
    // than as a wire.
    const spread = 0.012;
    targets[i3] += (Math.random() - 0.5) * spread;
    targets[i3 + 1] += (Math.random() - 0.5) * spread;
    targets[i3 + 2] += (Math.random() - 0.5) * 0.05;

    // Origins on a thick shell around the crest, biased behind it so the swarm
    // sweeps toward the camera as it gathers.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 4.5 + Math.random() * 5.5;
    origins[i3] = Math.sin(phi) * Math.cos(theta) * radius;
    origins[i3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.75;
    origins[i3 + 2] = Math.cos(phi) * radius - 2.0;

    positions[i3] = origins[i3];
    positions[i3 + 1] = origins[i3 + 1];
    positions[i3 + 2] = origins[i3 + 2];

    seeds[index] = Math.random();
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aTarget', new BufferAttribute(targets, 3));
  geometry.setAttribute('aOrigin', new BufferAttribute(origins, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uGather: { value: 0 },
      uBurst: { value: 0 },
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  // The bounding sphere is computed from the scattered start positions, which
  // are far larger than the settled crest; frustum culling would then pop the
  // whole cloud out of view as it converges.
  points.frustumCulled = false;
  scene.add(points);

  let gather = 0;
  let crest: { size: number; centerX: number; centerY: number } | null = null;

  /**
   * Scales and positions the cloud so it lands exactly over the drawn crest.
   *
   * Recomputed per frame because the camera is still dollying: without this the
   * push-in would swell the crest away from the SVG on top of it. What the dolly
   * is left doing is shifting the parallax of the motes still on their way in,
   * which is the part of it worth keeping.
   */
  const fitToCrest = () => {
    if (!crest) return;
    const halfFov = (CAMERA_FOV / 2) * (Math.PI / 180);
    const visibleWorldHeight = 2 * camera.position.z * Math.tan(halfFov);
    const pixelsPerUnit = window.innerHeight / visibleWorldHeight;
    points.scale.setScalar(crest.size / pixelsPerUnit / VIEWBOX_SPAN);
    // Screen Y grows downward and world Y grows upward, hence the negation.
    points.position.set(
      (crest.centerX - window.innerWidth / 2) / pixelsPerUnit,
      -(crest.centerY - window.innerHeight / 2) / pixelsPerUnit,
      0,
    );
  };

  return {
    setProgress(nextGather, burst) {
      gather = nextGather;
      material.uniforms.uGather.value = nextGather;
      material.uniforms.uBurst.value = burst;
    },
    setCrestRect(rect) {
      crest = rect;
      fitToCrest();
    },
    render(elapsed) {
      material.uniforms.uTime.value = elapsed;
      // A slow push in, which does more for the sense of arrival than any amount
      // of particle motion.
      camera.position.z = 5.8 - gather * 1.4;
      camera.lookAt(0, 0, 0);
      fitToCrest();
      renderer.render(scene, camera);
    },
    resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      fitToCrest();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
