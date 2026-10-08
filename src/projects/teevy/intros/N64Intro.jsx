import { useEffect, useRef } from "react";
import * as THREE from "three";
import { acquireRenderer, frameCamera, releaseRenderer } from "../gl.js";
const C_YELLOW = 16759808;
const C_GREEN = 2459200;
const C_VIOLET = 5394331;
const C_RED = 15410201;
const C_DARKRED = 7737356;
const C_GREEN_LIT = 3123282;
const W_YELLOW = 15724541;
const W_GREEN = 12172741;
const W_VIOLET = 15395578;
const W_RED = 15591928;
const W_DARKRED = 7828865;
const W_GREEN_LIT = 15592955;
const SKY = 15592941;
const WATER_HOT = 10659562;
const WATER_COLD = 15198183;
const PILLAR = 25;
const SPAN = 30;
const HEIGHT = 76;
const DIAG_MEET = HEIGHT * (SPAN - PILLAR) / (2 * SPAN);
const PROFILE_N = [
  [-SPAN - PILLAR / 2, -HEIGHT / 2],
  [-SPAN + PILLAR / 2, -HEIGHT / 2],
  [-SPAN + PILLAR / 2, DIAG_MEET],
  [SPAN - PILLAR / 2, -HEIGHT / 2],
  [SPAN + PILLAR / 2, -HEIGHT / 2],
  [SPAN + PILLAR / 2, HEIGHT / 2],
  [SPAN - PILLAR / 2, HEIGHT / 2],
  [SPAN - PILLAR / 2, -DIAG_MEET],
  [-SPAN + PILLAR / 2, HEIGHT / 2],
  [-SPAN - PILLAR / 2, HEIGHT / 2]
];
const MERGE = 3;
const BULGE = 0.5;
const DIAG_TRIM = SPAN - PILLAR / 2 + MERGE;
const DIAG_CUT = HEIGHT / 2 - (PILLAR - MERGE) * HEIGHT / (2 * SPAN);
const PROFILE_DIAG = [
  [-DIAG_TRIM, HEIGHT / 2],
  [-DIAG_TRIM, DIAG_CUT],
  [SPAN - PILLAR / 2, -HEIGHT / 2],
  [DIAG_TRIM, -HEIGHT / 2],
  [DIAG_TRIM, -DIAG_CUT],
  [-SPAN + PILLAR / 2, HEIGHT / 2]
];
const F_CAP = 0;
const F_SIDE = 1;
const F_TOP = 2;
const F_BOTTOM = 3;
const F_SLANT_HI = 4;
const F_SLANT_LO = 5;
const FACES_Z = [C_GREEN, C_VIOLET, C_YELLOW, C_DARKRED, C_RED, C_DARKRED];
const FACES_X = [
  C_VIOLET,
  C_GREEN,
  C_YELLOW,
  C_DARKRED,
  C_GREEN_LIT,
  C_DARKRED
];
const PLASTER_Z = [W_GREEN, W_VIOLET, W_YELLOW, W_DARKRED, W_RED, W_DARKRED];
const PLASTER_X = [
  W_VIOLET,
  W_GREEN,
  W_YELLOW,
  W_DARKRED,
  W_GREEN_LIT,
  W_DARKRED
];
const CAM_FOV = 13;
const CAM_AZIMUTH = Math.PI / 4;
const CAM_ELEVATION = 27.2 * Math.PI / 180;
const CAM_DIST = 1095;
const CAM_TARGET_Y = 27.5;
const WATER_Y = -HEIGHT / 2;
const WATER_SIZE = 1400;
const WATER_SEG = 180;
const FOG_NEAR = 1157;
const FOG_FAR = 1445;
const WAVE_LEN = 80;
const WAVE_SPEED = 110;
const WAVE_SLOPE = 0.42;
const WAVE_FALLOFF = 420;
const WAVE_SHADE = 0.2;
const MIRROR_ALPHA = 0.22;
const T_WORLD_IN = 0.3;
const T_WORLD_FULL = 0.82;
const T_RISE_IN = 0.35;
const T_RISE_END = 1.23;
const T_SPIN_END = 1.8;
const T_WATER_IN = 0.8;
const T_WATER_END = 3.6;
const T_COLOR_IN = 1.75;
const T_COLOR_END = 3.92;
const T_END = 6.6;
const SPIN_TURN = -Math.PI;
const SPIN_DECAY = 1.6;
const T_WAVE_IN = 0.48;
const T_WAVE_PEAK = 1.05;
const T_WAVE_OUT = 1.5;
const T_WAVE_FLAT = 2.7;
const SAFETY_MARGIN_S = 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const easeOut = (x) => 1 - (1 - x) * (1 - x);
function hardwareStamp(now) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const h24 = now.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(now.getMinutes()).padStart(2, "0");
  return {
    date: `${now.getMonth() + 1} / ${now.getDate()}`,
    day: days[now.getDay()],
    time: `${h12}:${mm}`,
    half: h24 < 12 ? "a.m." : "p.m."
  };
}
function buildPrism(profile, final, plaster, skip = [], bulge = 0) {
  const w0 = SPAN - PILLAR / 2 - bulge;
  const w1 = SPAN + PILLAR / 2 + bulge;
  const positions = [];
  const faces = [];
  const push = (u, y, w, face) => {
    positions.push(u, y, w);
    faces.push(face);
  };
  const contour = profile.map(([u, y]) => new THREE.Vector2(u, y));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const [a, b, c] of triangles) {
    push(contour[a].x, contour[a].y, w1, F_CAP);
    push(contour[b].x, contour[b].y, w1, F_CAP);
    push(contour[c].x, contour[c].y, w1, F_CAP);
    push(contour[c].x, contour[c].y, w0, F_CAP);
    push(contour[b].x, contour[b].y, w0, F_CAP);
    push(contour[a].x, contour[a].y, w0, F_CAP);
  }
  for (let i = 0; i < profile.length; i++) {
    const [u0, y0] = profile[i];
    const [u1, y1] = profile[(i + 1) % profile.length];
    const du = u1 - u0;
    const dy = y1 - y0;
    const ny = -du;
    let face;
    if (Math.abs(dy) < 1e-6) face = ny > 0 ? F_TOP : F_BOTTOM;
    else if (Math.abs(du) < 1e-6) face = F_SIDE;
    else face = ny > 0 ? F_SLANT_HI : F_SLANT_LO;
    if (skip.includes(face)) continue;
    push(u0, y0, w0, face);
    push(u1, y1, w0, face);
    push(u1, y1, w1, face);
    push(u0, y0, w0, face);
    push(u1, y1, w1, face);
    push(u0, y0, w1, face);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Float32Array(faces.length * 3), 3)
  );
  return { geometry, faceOf: Uint8Array.from(faces), final, plaster };
}
function paintPrism(prism, k, tint) {
  const attribute = prism.geometry.getAttribute(
    "color"
  );
  const array = attribute.array;
  const a = new THREE.Color();
  const b = new THREE.Color();
  const table = new Float32Array(6 * 3);
  for (let f = 0; f < 6; f++) {
    a.setHex(prism.plaster[f], THREE.LinearSRGBColorSpace);
    b.setHex(prism.final[f], THREE.LinearSRGBColorSpace);
    a.lerp(b, k).multiplyScalar(tint);
    table[f * 3] = a.r;
    table[f * 3 + 1] = a.g;
    table[f * 3 + 2] = a.b;
  }
  for (let i = 0; i < prism.faceOf.length; i++) {
    const f = prism.faceOf[i] * 3;
    array[i * 3] = table[f];
    array[i * 3 + 1] = table[f + 1];
    array[i * 3 + 2] = table[f + 2];
  }
  attribute.needsUpdate = true;
}
function N64Intro({ onDone }) {
  const hostRef = useRef(null);
  const overlayRef = useRef(null);
  const stampRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const host = hostRef.current;
    const overlay = overlayRef.current;
    const stamp = stampRef.current;
    if (!host || !overlay || !stamp) return;
    stamp.textContent = "";
    const now = hardwareStamp(new Date());
    for (const [cls, text] of [
      ["teevy-n64intro__num", now.date],
      ["teevy-n64intro__brk", "\u3008"],
      ["teevy-n64intro__day", now.day],
      ["teevy-n64intro__brk", "\u3009"],
      ["teevy-n64intro__num", now.time],
      ["teevy-n64intro__half", now.half]
    ]) {
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = text;
      stamp.appendChild(span);
    }
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
    canvas.className = "teevy-n64intro__canvas";
    host.insertBefore(canvas, overlay);
    const prevPixelRatio = renderer.getPixelRatio();
    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = renderer.getClearAlpha();
    const prevOutputColorSpace = renderer.outputColorSpace;
    const prevLocalClipping = renderer.localClippingEnabled;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0, 1);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0);
    scene.background = skyColor;
    const fog = new THREE.Fog(skyColor, FOG_NEAR, FOG_FAR);
    scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(CAM_FOV, 4 / 3, 1, 4e3);
    camera.position.set(
      Math.cos(CAM_ELEVATION) * Math.cos(CAM_AZIMUTH) * CAM_DIST,
      Math.sin(CAM_ELEVATION) * CAM_DIST,
      Math.cos(CAM_ELEVATION) * Math.sin(CAM_AZIMUTH) * CAM_DIST
    );
    camera.lookAt(0, CAM_TARGET_Y, 0);
    const ownedGeometries = [];
    const ownedMaterials = [];
    const clipAbove = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WATER_Y);
    const clipBelow = new THREE.Plane(new THREE.Vector3(0, -1, 0), WATER_Y);
    const waterGeometry = new THREE.PlaneGeometry(
      WATER_SIZE,
      WATER_SIZE,
      WATER_SEG,
      WATER_SEG
    );
    waterGeometry.rotateX(-Math.PI / 2);
    ownedGeometries.push(waterGeometry);
    const waterMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      depthWrite: false,
      fog: true
    });
    ownedMaterials.push(waterMaterial);
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.y = WATER_Y;
    water.renderOrder = 0;
    scene.add(water);
    const waterPos = waterGeometry.getAttribute(
      "position"
    );
    const waterCol = new THREE.Float32BufferAttribute(
      new Float32Array(waterPos.count * 3),
      3
    );
    waterGeometry.setAttribute("color", waterCol);
    const waveR = new Float32Array(waterPos.count);
    const waveNX = new Float32Array(waterPos.count);
    const waveNZ = new Float32Array(waterPos.count);
    for (let i = 0; i < waterPos.count; i++) {
      const x = waterPos.getX(i);
      const z = waterPos.getZ(i);
      const r = Math.hypot(x, z) || 1e-6;
      waveR[i] = r;
      waveNX[i] = x / r;
      waveNZ[i] = z / r;
    }
    const LIGHT_X = -0.62;
    const LIGHT_Z = 0.78;
    const logo = new THREE.Group();
    const prisms = [];
    const logoMaterials = [];
    for (let k = 0; k < 4; k++) {
      const zPlane = k % 2 === 0;
      const prism = zPlane ? buildPrism(PROFILE_N, FACES_Z, PLASTER_Z) : buildPrism(
        PROFILE_DIAG,
        FACES_X,
        PLASTER_X,
        [F_SIDE, F_TOP, F_BOTTOM],
        BULGE
      );
      ownedGeometries.push(prism.geometry);
      prisms.push(prism);
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        clippingPlanes: [clipAbove]
      });
      ownedMaterials.push(material);
      logoMaterials.push(material);
      const mesh = new THREE.Mesh(prism.geometry, material);
      mesh.rotation.y = -k * Math.PI / 2;
      mesh.renderOrder = 2;
      logo.add(mesh);
    }
    scene.add(logo);
    const mirror = new THREE.Group();
    mirror.scale.set(1, -1, 1);
    const mirrorMaterials = [];
    for (let k = 0; k < 4; k++) {
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        transparent: true,
        opacity: MIRROR_ALPHA,
        depthWrite: true,
        side: THREE.DoubleSide,
        clippingPlanes: [clipBelow]
      });
      ownedMaterials.push(material);
      mirrorMaterials.push(material);
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace("void main() {", "varying float vDrop;\nvoid main() {").replace(
          "#include <fog_vertex>",
          "#include <fog_vertex>\n	vDrop = clamp((" + WATER_Y.toFixed(1) + " - (modelMatrix * vec4(transformed, 1.0)).y) / 200.0, 0.0, 1.0);"
        );
        shader.fragmentShader = shader.fragmentShader.replace("void main() {", "varying float vDrop;\nvoid main() {").replace(
          "#include <opaque_fragment>",
          "#include <opaque_fragment>\n	gl_FragColor.a *= 1.0 - vDrop;"
        );
      };
      const mesh = new THREE.Mesh(prisms[k].geometry, material);
      mesh.rotation.y = -k * Math.PI / 2;
      mesh.renderOrder = 1;
      mirror.add(mesh);
    }
    scene.add(mirror);
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      frameCamera(camera, host, w, h);
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);
    fit();
    const black = new THREE.Color(0);
    const skyFull = new THREE.Color().setHex(SKY, THREE.LinearSRGBColorSpace);
    const waterHot = new THREE.Color().setHex(
      WATER_HOT,
      THREE.LinearSRGBColorSpace
    );
    const waterCold = new THREE.Color().setHex(
      WATER_COLD,
      THREE.LinearSRGBColorSpace
    );
    const scratch = new THREE.Color();
    const apply = (t) => {
      const world = easeOut(ramp(t, T_WORLD_IN, T_WORLD_FULL));
      scratch.copy(black).lerp(skyFull, world);
      skyColor.copy(scratch);
      fog.color.copy(scratch);
      scratch.copy(waterHot).lerp(
        waterCold,
        1 - Math.pow(1 - ramp(t, T_WATER_IN, T_WATER_END), 1.5)
      ).multiplyScalar(world);
      const wr = scratch.r;
      const wg = scratch.g;
      const wb = scratch.b;
      const stir = smooth(ramp(t, T_WAVE_IN, T_WAVE_PEAK)) * (1 - smooth(ramp(t, T_WAVE_OUT, T_WAVE_FLAT)));
      const amp = WAVE_SLOPE * stir;
      const k = Math.PI * 2 / WAVE_LEN;
      const phase = -WAVE_SPEED * t;
      const colors = waterCol.array;
      for (let i = 0; i < waterPos.count; i++) {
        const r = waveR[i];
        const fall = WAVE_FALLOFF / (WAVE_FALLOFF + r);
        const slope = amp * fall * Math.cos((r + phase) * k);
        const shade = 1 + WAVE_SHADE * slope * (waveNX[i] * LIGHT_X + waveNZ[i] * LIGHT_Z);
        const j = i * 3;
        colors[j] = wr * shade;
        colors[j + 1] = wg * shade;
        colors[j + 2] = wb * shade;
      }
      waterCol.needsUpdate = true;
      const rise = smooth(ramp(t, T_RISE_IN, T_RISE_END));
      logo.position.y = -HEIGHT * (1 - rise);
      mirror.position.y = 2 * WATER_Y - logo.position.y;
      logo.rotation.y = Math.pow(1 - ramp(t, T_RISE_IN, T_SPIN_END), SPIN_DECAY) * SPIN_TURN;
      mirror.rotation.y = logo.rotation.y;
      const paint = ramp(t, T_COLOR_IN, T_COLOR_END);
      for (const prism of prisms) paintPrism(prism, paint, world);
      for (const material of mirrorMaterials)
        material.opacity = MIRROR_ALPHA * world * (1 - stir);
      overlay.style.opacity = paint.toFixed(3);
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
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
      ownedGeometries.length = 0;
      ownedMaterials.length = 0;
      logoMaterials.length = 0;
      mirrorMaterials.length = 0;
      scene.clear();
      if (canvas.parentNode === host) host.removeChild(canvas);
      canvas.className = "";
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      renderer.outputColorSpace = prevOutputColorSpace;
      renderer.localClippingEnabled = prevLocalClipping;
      releaseRenderer(renderer);
    };
  }, []);
  return <div className="teevy-n64intro" ref={hostRef} aria-hidden="true">
      <div className="teevy-n64intro__overlay" ref={overlayRef}>
        {
  }
        <svg
    className="teevy-n64intro__word"
    viewBox="0 0 208.9 29"
    role="presentation"
  >
          <g fill="#524f9b">
            <path d="M 14.3,6.6 V 19.1 H 14.2 L 9.8,6.6 H 0 V 28.4 H 6.6 V 15.8 h 0.1 l 4.4,12.6 v 0 h 9.8 V 6.6 Z" />
            <path d="M 33.1,6.6 V 28.4 H 24.9 V 6.6 6.6 Z" />
            <path d="M 51.3,6.6 V 19.1 H 51.2 L 46.8,6.6 H 37 v 21.8 h 6.6 V 15.8 h 0.1 l 4.4,12.6 v 0 h 9.8 V 6.6 Z" />
            <path d="m 65.5,28.4 v -15.9 0 H 60.3 V 6.6 h 18.6 v 5.9 h -5.2 v 15.9 z" />
            <path d="m 89.4,12.4 v 2.3 h 7.5 v 5.6 h -7.5 v 2.4 h 8.4 v 5.7 H 81.4 v -21.8 0 h 16.2 v 5.8 z" />
            <path d="m 115,6.6 v 12.5 h -0.1 L 110.5,6.6 h -9.8 v 21.8 h 6.6 V 15.8 h 0.1 l 4.4,12.6 v 0 h 9.8 V 6.6 Z" />
            <path d="m 125.2,6.6 h 9.7 c 8.3,0 10.9,4.7 10.9,11.1 0,6.6 -4.1,10.7 -10.4,10.7 h -10.2 z m 8,16.9 h 0.8 c 1.3,0 2.2,-0.4 2.7,-1.3 0.5,-0.9 0.6,-2.6 0.6,-4.7 0,-2.1 -0.1,-3.8 -0.6,-4.7 -0.5,-0.9 -1.4,-1.3 -2.7,-1.3 h -0.8 v 11.9 0 z" />
            <path d="m 158.6,6 c 7.1,0 10.7,4.7 10.7,11.5 0,6.8 -3.5,11.5 -10.7,11.5 -7.1,0 -10.7,-4.7 -10.7,-11.5 0,-6.8 3.5,-11.5 10.7,-11.5 z m 0,17.4 c 1.3,0 2.2,-0.6 2.2,-6 0,-5.2 -0.9,-6 -2.2,-6 -1.3,0 -2.2,0.7 -2.2,6 2.7e-4,5.3 0.9,6 2.2,6 z" />
            <path d="m 173.1,23.8 c -1.4,0 -2.6,1.2 -2.6,2.6 0,1.4 1.2,2.6 2.6,2.6 1.4,0 2.6,-1.2 2.6,-2.6 0,-1.4 -1.2,-2.6 -2.6,-2.6 z m 0,4.7 c -1.2,0 -2.1,-1 -2.1,-2.1 0,-1.2 1,-2.1 2.1,-2.1 1.2,0 2.1,1 2.1,2.1 0,1.2 -1,2.1 -2.1,2.1 z" />
            <path d="m 172.7,27.8 h -0.6 V 25 h 1.2 c 0.5,0 1,0.2 1,0.7 0,0.4 -0.2,0.6 -0.6,0.7 v 0 c 0.5,0.1 0.5,0.3 0.5,0.7 0,0.2 0.1,0.5 0.2,0.7 h -0.7 c -0.1,-0.3 -0.1,-0.5 -0.1,-0.8 0,-0.2 -0.1,-0.4 -0.3,-0.4 h -0.6 v 1.1 0 z m 0,-1.6 h 0.5 c 0.3,0 0.4,-0.1 0.4,-0.4 0,-0.3 -0.2,-0.4 -0.4,-0.4 h -0.5 z" />
          </g>
          <g fill="#ec241e" transform="translate(8.4 0)">
            <path d="m 184,3.7 c -0.4,0 -0.9,0 -1.5,0 -3.5,0.2 -4.8,1.6 -5.3,3.3 h 0.1 c 0.9,-0.8 1.9,-1.1 3.3,-1.1 2.7,0 5.2,2 5.2,5.7 0,3.6 -2.7,6.4 -6.4,6.4 -4.9,0 -7,-3.7 -7,-7.7 0,-3.2 1.1,-6 3,-7.7 1.8,-1.7 4.1,-2.5 6.9,-2.6 0.7,0 1.2,0 1.6,0 v 3.7 h -2.7e-4 z m -4.6,10.8 c 1.1,0 1.8,-1.1 1.8,-2.6 0,-1.2 -0.6,-2.6 -2.1,-2.6 -0.9,0 -1.6,0.6 -1.9,1.3 -0.1,0.2 -0.1,0.5 -0.1,1 0.1,1.4 0.8,2.9 2.3,2.9 z" />
            <path d="m 194.4,17.7 v -3.9 h -7.3 v -3.1 l 5.8,-10.4 h 5.8 v 10 h 1.8 v 3.6 h -1.8 v 3.9 h -4.4 v 0 z m 0,-7.5 v -3 c 0,-1.1 0.1,-2.3 0.1,-3.5 h -0.1 c -0.5,1.2 -1,2.3 -1.6,3.5 l -1.4,2.9 v 0.1 h 3 v -2.7e-4 z" />
          </g>
        </svg>
        <div className="teevy-n64intro__stamp" ref={stampRef} />
      </div>
    </div>;
}
export {
  N64Intro
};
