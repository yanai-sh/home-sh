import {
  AdditiveBlending,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';

export interface WarpSceneState {
  progress: number;
  velocity: number;
  direction: number;
  time: number;
}

export interface WarpScene {
  resize: () => void;
  render: (state: WarpSceneState) => void;
  dispose: () => void;
}

const vertexShader = `
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uTime;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;

    vec3 p = position;
    vec2 centered = uv * 2.0 - 1.0;
    float wave = sin(centered.x * 5.8 + uProgress * 8.0 + uTime * 0.24);
    float roll = sin((centered.x + centered.y) * 3.8 - uProgress * 9.2);
    float velocity = clamp(abs(uVelocity) * 0.012, 0.0, 0.5);

    p.x += (wave * 0.034 + roll * 0.024) * (0.54 + uProgress * 0.64);
    p.y += sin(centered.x * 2.4 - uProgress * 5.2) * 0.045 * (0.36 + velocity);
    p.z += (wave + roll) * 0.06;

    vDepth = clamp(abs(p.z) * 4.0 + velocity, 0.0, 1.0);
    gl_Position = vec4(p, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uProgress;
  uniform float uVelocity;
  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;
  varying float vDepth;

  float line(float value, float width) {
    float centered = abs(fract(value) - 0.5);
    return 1.0 - smoothstep(0.0, width, centered);
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv * 2.0 - 1.0;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    centered.x *= aspect;

    float velocity = clamp(abs(uVelocity) * 0.01, 0.0, 0.56);
    float roll = uProgress * 1.55 + uTime * 0.018;
    float diagonal = (centered.x * 0.58 + centered.y * 0.96 + roll);
    float counter = (centered.x * -0.72 + centered.y * 0.64 - roll * 0.56);
    float gridA = line(diagonal * 5.2, 0.024 + velocity * 0.018);
    float gridB = line(counter * 3.2, 0.016 + velocity * 0.012);

    float bandCore = sin(diagonal * 6.5 - uProgress * 5.0);
    float bands = smoothstep(0.78, 1.0, bandCore) * (0.38 + velocity * 0.32);
    float sweep = smoothstep(0.9, 0.08, abs(centered.y + sin(uProgress * 3.14159) * 0.34));
    float vignette = smoothstep(1.45, 0.18, length(centered));

    vec3 blue = vec3(0.18, 0.42, 1.0);
    vec3 white = vec3(0.88, 0.93, 1.0);
    vec3 color = mix(blue, white, clamp(vDepth + bands * 0.42, 0.0, 1.0));
    float alpha = (gridA * 0.055 + gridB * 0.026 + bands * 0.12 + sweep * 0.028);
    alpha *= vignette * (0.34 + uProgress * 0.18 + velocity * 0.18);

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createWarpScene(canvas: HTMLCanvasElement): WarpScene {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: false,
    canvas,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const geometry = new PlaneGeometry(2, 2, 72, 48);
  const uniforms = {
    uProgress: { value: 0 },
    uVelocity: { value: 0 },
    uDirection: { value: 1 },
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
  };
  const material = new ShaderMaterial({
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader,
    transparent: true,
    uniforms,
    vertexShader,
  });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    uniforms.uResolution.value.set(width, height);
  }

  resize();

  return {
    resize,
    render(state) {
      uniforms.uProgress.value = state.progress;
      uniforms.uVelocity.value = state.velocity;
      uniforms.uDirection.value = state.direction;
      uniforms.uTime.value = state.time;
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
