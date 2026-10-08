import { useEffect, useRef } from "react";
import * as THREE from "three";
import { acquireRenderer, releaseRenderer } from "../gl.js";
const VIEW_W = 640;
const VIEW_H = 480;
const STROKE = 3.5;
const GLYPHS = [
  "M125 181 H252 V213 H127 V250",
  "M392 181 H327 V248 H255",
  "M413 181 H540 V213 H415 V250"
];
const TM_X = 553;
const TM_Y = 246;
const SUB_CX = 330;
const SUB_W = 275;
const SUB_BASELINE = 301;
const INK = "#6d7290";
const SCE_BASELINE = 237.5;
const SCE_INK = "#d6e5f8";
const SCE_WORDS = [
  ["Sony", 177, 47.5],
  ["Computer", 227.5, 96.5],
  ["Entertainment", 328.5, 137]
];
const T_SCE_IN = 0.31;
const T_SCE_FULL = 0.62;
const T_SCE_OUT = 1.85;
const T_SCE_GONE = 2.22;
const RAY_Y0 = 0.507;
const RAY_Y1 = 0.4986;
const RAY_CORE = 55e-4;
const RAY_UP = 0.022;
const RAY_DOWN = 45e-4;
const RAY = [
  [0.26, 0, 0.16],
  [0.32, 0.22, 0.18],
  [0.42, 0.59, 0.2],
  [0.52, 0.76, 0.24],
  [0.62, 0.88, 0.26],
  [0.82, 0.88, 0.3],
  [0.92, 0.61, 0.32],
  [1.02, 0.44, 0.32],
  [1.12, 0.49, 0.14],
  [1.22, 0.28, 0.12],
  [1.32, 0.23, 0.08],
  [1.42, 0.17, 0.12],
  [1.52, 0.27, 0.2],
  [1.62, 0.52, 0.32],
  [1.72, 0.61, 0.42],
  [1.82, 0.67, 0.78],
  [1.92, 0.71, 0.8],
  [2.12, 0.7, 0.94],
  [2.22, 0.69, 1.04],
  [2.42, 0.61, 1.06],
  [2.62, 0.55, 1.1],
  [2.82, 0.63, 1.1],
  [2.9, 0.12, 1.1],
  [2.98, 0, 1.1]
];
const RAY_FLOOR_MAX = 0.25;
const RAY_FLOOR_IN = 0.35;
const RAY_FLOOR_FULL = 1;
const RAY_GAIN = 1.2;
const GLOW = [
  [0.9, 0.98, 0],
  [1.5, 0.888, 0.14],
  [2, 0.845, 0.35],
  [2.5, 0.8, 0.55],
  [3.05, 0.75, 0.4],
  [3.45, 0.75, 0]
];
const FREQUENCY = 4.29;
const OUTER_SPEED = 0.044;
const INNER_SPEED = 0.064;
const OUTER_AMP = 0.5;
const INNER_AMP = 0.18;
const OUTER_FALLOFF_1 = 2;
const OUTER_FALLOFF_2 = 2;
const INNER_FALLOFF_1 = 1;
const INNER_FALLOFF_2 = 1;
const GRADIENT = [
  [2.7, "#4d86c9", "#4f8ed6"],
  [3.2, "#92afcb", "#8dafd4"],
  [4.2, "#7a93af", "#7392b8"],
  [5.5, "#8491a6", "#7e8eae"],
  [7.2, "#9898a8", "#9795b0"],
  [8.4, "#a8a7aa", "#b6adb0"],
  [10.35, "#a4a9a7", "#aeabae"]
];
const WAVE_MIX = [
  [3.05, 0.3],
  [7.2, 0.3],
  [8.4, 0.07],
  [10.35, 0.07]
];
const T_WAVE_IN = 2.7;
const T_WAVE_FULL = 3.05;
const T_TITLE_IN = 7.2;
const T_TITLE_FULL = 8;
const T_FADE = 10.3;
const T_END = 10.35;
const SAFETY_MARGIN_S = 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const VERT = (
  `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
);
const FRAG = (
  `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uWave;
uniform float uWaveMix;
uniform vec3 uRay;
uniform vec2 uGlow;

const float RAY_Y0 = ${RAY_Y0.toFixed(4)};
const float RAY_Y1 = ${RAY_Y1.toFixed(4)};
const float RAY_CORE = ${RAY_CORE.toFixed(4)};
const float RAY_UP = ${RAY_UP.toFixed(4)};
const float RAY_DOWN = ${RAY_DOWN.toFixed(4)};
const vec3 RAY_CORE_COL = vec3(0.55, 0.76, 1.0);
const vec3 RAY_HALO_COL = vec3(0.03, 0.42, 1.0);
const float RAY_HALO_MIX = 0.30;
const float RAY_GAIN = ${RAY_GAIN.toFixed(3)};
const vec3 GLOW_COL = vec3(0.35, 0.64, 1.0);

const float FREQ = ${FREQUENCY.toFixed(4)};
const float OUTER_SPEED = ${OUTER_SPEED.toFixed(4)};
const float INNER_SPEED = ${INNER_SPEED.toFixed(4)};
const float OUTER_AMP = ${OUTER_AMP.toFixed(4)};
const float INNER_AMP = ${INNER_AMP.toFixed(4)};
const float OUTER_F1 = ${OUTER_FALLOFF_1.toFixed(4)};
const float OUTER_F2 = ${OUTER_FALLOFF_2.toFixed(4)};
const float INNER_F1 = ${INNER_FALLOFF_1.toFixed(4)};
const float INNER_F2 = ${INNER_FALLOFF_2.toFixed(4)};

float outerWave(vec2 uv, float k) {
  return sin((uv.x + (uTime * (OUTER_SPEED + 0.0025 * k))) * FREQ) * OUTER_AMP;
}
float innerWave(vec2 uv, float k) {
  return sin((uv.x + (uTime * (INNER_SPEED + 0.0025 * k))) * FREQ) * INNER_AMP;
}

float rayBell(float u) {
  float d = (u - 0.46) / 0.30;
  return 0.34 + 0.66 * exp(-d * d);
}

vec2 rayShape(float sy, float u) {
  float d = sy - mix(RAY_Y0, RAY_Y1, u);
  float core = exp(-(d / RAY_CORE) * (d / RAY_CORE));
  float halo = exp(-abs(d) / (d < 0.0 ? RAY_UP : RAY_DOWN));
  return vec2(core, halo);
}

float rayLit(float u) {
  return uRay.z + (1.0 - uRay.z) * (1.0 - smoothstep(uRay.y - 0.16, uRay.y, u));
}

void main() {
  vec2 uv = vUv;

  float topOuter = outerWave(uv, 1.0);
  float bottomOuter = outerWave(uv, 20.0);
  float topInner = innerWave(uv, 8.0);
  float bottomInner = innerWave(uv, 40.0);

  float topOuterF = topOuter;
  float bottomOuterF = bottomOuter;
  float topInnerF = topInner;
  float bottomInnerF = bottomInner;

  topOuter += 1.0 - (1.0 - uv.y) * 6.0;
  bottomOuter += 1.0 - (uv.y * 6.0);
  topInner += 1.0 - (uv.y) * 2.5;
  bottomInner += 1.0 - (1.0 - uv.y) * 2.5;

  topOuterF += 1.0 - (1.0 - uv.y - 0.2) * 6.0;
  bottomOuterF += 1.0 - ((uv.y - 0.2) * 6.0);
  topInnerF += 1.0 - ((uv.y - 0.1) * 2.2);
  bottomInnerF += 1.0 - (((1.0 - uv.y - 0.1)) * 2.2);

  float w1 = 1.0 - smoothstep(0.0, 0.025, topOuter);
  float w2 = 1.0 - smoothstep(0.0, 0.025, bottomOuter);
  float w3 = 1.0 - smoothstep(0.0, 0.025, topInner);
  float w4 = 1.0 - smoothstep(0.0, 0.025, bottomInner);

  float f1 = 1.0 - smoothstep(0.0, OUTER_F1, topOuterF);
  float f2 = 1.0 - smoothstep(0.0, OUTER_F2, bottomOuterF);
  float f3 = 1.0 - smoothstep(0.0, INNER_F1, topInnerF);
  float f4 = 1.0 - smoothstep(0.0, INNER_F2, bottomInnerF);

  w1 = clamp(w1 - f1, 0.0, 1.0);
  w2 = clamp(w2 - f2, 0.0, 1.0);
  w3 = clamp(w3 - f3, 0.0, 1.0);
  w4 = clamp(w4 - f4, 0.0, 1.0);

  float wave = clamp(w1 + w2 + w3 + w4, 0.0, 1.0) * uWave * uWaveMix;

  vec3 base = mix(uBottom, uTop, uv.y);
  vec3 col = mix(base, vec3(1.0), wave);

  float sy = 1.0 - uv.y;
  float lit = uRay.x * rayLit(uv.x) * rayBell(uv.x) * RAY_GAIN;
  vec2 shape = rayShape(sy, uv.x);
  col += lit * (RAY_CORE_COL * shape.x + RAY_HALO_COL * shape.y * RAY_HALO_MIX);

  col += GLOW_COL * uGlow.y * clamp((sy - uGlow.x) / max(1e-4, 0.975 - uGlow.x), 0.0, 1.0);

  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}
`
);
function setRaw(out, hex) {
  const v = parseInt(hex.slice(1), 16);
  return out.setRGB(
    (v >> 16 & 255) / 255,
    (v >> 8 & 255) / 255,
    (v & 255) / 255,
    THREE.LinearSRGBColorSpace
  );
}
const gradientTmp =new THREE.Color();
function gradientAt(t, which, out) {
  let i = 0;
  while (i < GRADIENT.length - 2 && GRADIENT[i + 1][0] < t) i++;
  const a = GRADIENT[i];
  const b = GRADIENT[i + 1];
  const k = clamp01((t - a[0]) / (b[0] - a[0]));
  setRaw(out, a[which]).lerp(setRaw(gradientTmp, b[which]), k);
}
function sampleAt(table, t, out) {
  const first = table[0];
  const last = table[table.length - 1];
  if (t <= first[0]) {
    out.set(first[1], first[2]);
    return;
  }
  if (t >= last[0]) {
    out.set(last[1], last[2]);
    return;
  }
  let i = 0;
  while (i < table.length - 2 && table[i + 1][0] < t) i++;
  const a = table[i];
  const b = table[i + 1];
  const k = clamp01((t - a[0]) / (b[0] - a[0]));
  out.set(a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
}
function scalarAt(table, t) {
  const first = table[0];
  const last = table[table.length - 1];
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  let i = 0;
  while (i < table.length - 2 && table[i + 1][0] < t) i++;
  const a = table[i];
  const b = table[i + 1];
  return a[1] + (b[1] - a[1]) * clamp01((t - a[0]) / (b[0] - a[0]));
}
function PspIntro({ onDone }) {
  const hostRef = useRef(null);
  const overlayRef = useRef(null);
  const sceRef = useRef(null);
  const titleRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const host = hostRef.current;
    const overlay = overlayRef.current;
    const sce = sceRef.current;
    const title = titleRef.current;
    if (!host || !overlay || !sce || !title) return;
    let disposed = false;
    let done = false;
    let raf = 0;
    let safety = 0;
    const finish = () => {
      if (done || disposed) return;
      done = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(safety);
      onDoneRef.current();
    };
    const renderer = acquireRenderer();
    const canvas = renderer.domElement;
    canvas.className = "teevy-pspintro__canvas";
    host.insertBefore(canvas, overlay);
    const prevPixelRatio = renderer.getPixelRatio();
    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = renderer.getClearAlpha();
    const prevOutputColorSpace = renderer.outputColorSpace;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uTime: { value: 0 },
      uTop: { value: setRaw(new THREE.Color(), GRADIENT[0][1]) },
      uBottom: { value: setRaw(new THREE.Color(), GRADIENT[0][2]) },
      uWave: { value: 0 },
      uWaveMix: { value: WAVE_MIX[0][1] },
      uRay: { value: new THREE.Vector3(0, RAY[0][2], 0) },
      uGlow: { value: new THREE.Vector2(GLOW[0][1], 0) }
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false
    });
    scene.add(new THREE.Mesh(geometry, material));
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);
    fit();
    const black = new THREE.Color(0);
    const top = new THREE.Color();
    const bottom = new THREE.Color();
    const ray = new THREE.Vector2();
    const apply = (t) => {
      uniforms.uTime.value = t;
      gradientAt(t, 1, top);
      gradientAt(t, 2, bottom);
      const out = 1 - smooth(ramp(t, T_FADE, T_END));
      const level = smooth(ramp(t, T_WAVE_IN, T_WAVE_FULL));
      uniforms.uTop.value.copy(black).lerp(top, level * out);
      uniforms.uBottom.value.copy(black).lerp(bottom, level * out);
      uniforms.uWave.value = level;
      uniforms.uWaveMix.value = scalarAt(WAVE_MIX, t);
      sampleAt(RAY, t, ray);
      uniforms.uRay.value.set(
        ray.x * out,
        ray.y,
        clamp01((t - RAY_FLOOR_IN) / (RAY_FLOOR_FULL - RAY_FLOOR_IN)) * RAY_FLOOR_MAX
      );
      sampleAt(GLOW, t, uniforms.uGlow.value);
      uniforms.uGlow.value.y *= out;
      sce.style.opacity = (ramp(t, T_SCE_IN, T_SCE_FULL) * (1 - ramp(t, T_SCE_OUT, T_SCE_GONE))).toFixed(3);
      title.style.opacity = (ramp(t, T_TITLE_IN, T_TITLE_FULL) * out).toFixed(3);
      renderer.render(scene, camera);
    };
    const start = () => {
      const t0 = performance.now();
      const tick = () => {
        const t = (performance.now() - t0) / 1e3;
        apply(Math.min(t, T_END));
        if (t >= T_END) {
          finish();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      safety = window.setTimeout(finish, (T_END + SAFETY_MARGIN_S) * 1e3);
    };
    apply(0);
    start();
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(safety);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      scene.clear();
      if (canvas.parentNode === host) host.removeChild(canvas);
      canvas.className = "";
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      renderer.outputColorSpace = prevOutputColorSpace;
      releaseRenderer(renderer);
    };
  }, []);
  return <div className="teevy-pspintro" ref={hostRef} aria-hidden="true">
      <div className="teevy-pspintro__overlay" ref={overlayRef}>
        <svg
    className="teevy-pspintro__svg"
    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
    preserveAspectRatio="xMidYMid meet"
  >
          {
  }
          <g ref={sceRef} opacity={0}>
            {SCE_WORDS.map(([word, x, w]) => <text
    key={word}
    className="teevy-pspintro__sce"
    x={x}
    y={SCE_BASELINE}
    fill={SCE_INK}
    textLength={w}
    lengthAdjust="spacingAndGlyphs"
  >
                {word}
              </text>)}
          </g>
          {
  }
          <g ref={titleRef} opacity={0}>
            {GLYPHS.map((d) => <path
    key={d}
    d={d}
    fill="none"
    stroke={INK}
    strokeWidth={STROKE}
    strokeLinecap="butt"
    strokeLinejoin="miter"
  />)}
            <text className="teevy-pspintro__tm" x={TM_X} y={TM_Y} fill={INK}>
              ™
            </text>
            <text
    className="teevy-pspintro__sub"
    x={SUB_CX}
    y={SUB_BASELINE}
    fill={INK}
    textAnchor="middle"
    textLength={SUB_W}
    lengthAdjust="spacingAndGlyphs"
  >
              PlayStation
              <tspan className="teevy-pspintro__reg">®</tspan>
              Portable
            </text>
          </g>
        </svg>
      </div>
    </div>;
}
export {
  PspIntro
};
