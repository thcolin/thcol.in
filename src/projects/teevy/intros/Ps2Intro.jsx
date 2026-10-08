import { useEffect, useRef } from "react";
import * as THREE from "three";
import { acquireRenderer, frameCamera, releaseRenderer } from "../gl.js";
const NUM_X = 14;
const NUM_Y = 8;
const SPACING = 1.2;
const GRID_Z = 70;
const CAM_FOV = 25;
const CAM_Z0 = 106;
const CAM_Z1 = 102;
const CAM_Z2 = 87;
const CAM_ROLL_1 = 0.42;
const CAM_ROLL_2 = 1.15;
const T_WORLD_IN = 0.05;
const T_CAPTION_IN = 0.62;
const T_CAPTION_FULL = 0.97;
const T_CAPTION_OUT = 2.4;
const T_CAPTION_GONE = 2.87;
const T_SLOW_END = 7.7;
const T_RUSH_END = 8.55;
const T_WORD_IN = 14.5;
const T_WORD_SNAP = 14.7;
const T_WORD_FULL = 14.83;
const T_FADE = 16.65;
const T_END = 16.95;
const SAFETY_MARGIN_S = 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const mix = (a, b, k) => a + (b - a) * k;
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const SEED = 1347629569;
const WORDMARK_PATHS = [
  "m189.72,175.41l0,45.71l7.14,0l0,-41.33l6.6,0s4.8,0 6.44,2.14c1.4,1.83 1.66,5.13 1.66,7.37s-0.16,6.08 -1,7.43c-1.21,2.07 -3.21,2.48 -5,2.48l-4.36,0l0,4.06l6.27,0s5.66,0.23 8.09,-2.24c3,-3 3.74,-7.11 3.74,-12.56c0,-5 -1.8,-10 -5.47,-11.66c-3.05,-1.4 -8.54,-1.4 -8.54,-1.4l-15.57,0",
  "m224.91,221.12l7.09,0l0,-45.71l-7.13,0l0,45.71l0.04,0z",
  "m270,186.07l13.05,34.21l-7.49,18.36l5.92,0l21.58,-52.57l-6.61,0l-9.4,25.62l-8.75,-25.62l-8.3,0",
  "m308.45,220.85l0,-4.32s7.54,0.29 9.11,0.29c3.49,0 5.22,-0.74 6.53,-2.14c0.78,-0.85 1.48,-4.58 1.48,-5.9a18.29,18.29 0 0 0 -0.78,-5.36a4.23,4.23 0 0 0 -3.57,-2.38c-1.3,-0.11 -3.31,-0.38 -5.66,-0.48a9.08,9.08 0 0 1 -6.52,-3.12c-1.05,-1.23 -2.44,-3.09 -2.44,-8.79s1.48,-8.91 3,-10.39a10,10 0 0 1 5.31,-2.45a41,41 0 0 1 5,-0.34l10,0.29l0,4.32s-7.29,-0.29 -8.85,-0.29c-3.49,0 -4.53,0.74 -5.84,2.14a8.43,8.43 0 0 0 -1.37,4.46a17,17 0 0 0 0.68,5.17a4.23,4.23 0 0 0 3.57,2.39c1.29,0.1 3.31,0.36 5.65,0.47a9,9 0 0 1 6.52,3.11c1.05,1.24 2.45,3.86 2.45,9.55s-1.49,9.79 -3,11.27a10,10 0 0 1 -5.31,2.44a39.94,39.94 0 0 1 -5.05,0.35l-10.94,-0.29",
  "m347.38,179.79l-7.13,0l0,33.55s0.17,3.07 0.34,4.14s1.75,3.64 5.84,3.64l7.39,-0.15l0,-4.3s-2,0.14 -3.21,0.14s-2.71,-0.08 -3,-2.15a41.27,41.27 0 0 1 -0.27,-4.53l0,-19.76l8.06,0l0,-4.3l-8.06,0l0,-6.28",
  "m416.24,221.12l7.13,0l0,-35.05l-7.13,0l0,35.05z",
  "m416.24,181.77l7.13,0l0,-6.36l-7.13,0l0,6.36z",
  "m445.92,185.77c4.85,0 8.62,1.08 10.64,2.72s4.55,5.1 4.55,15.11s-2.51,13.46 -4.55,15.1s-5.79,2.73 -10.64,2.73s-8.62,-1.09 -10.66,-2.73s-4.53,-5.1 -4.53,-15.1s2.49,-13.47 4.53,-15.11s5.79,-2.72 10.66,-2.72zm-4.92,6.72c-1,1.21 -2.18,3.75 -2.18,11.11s1.19,9.89 2.18,11.1a7.54,7.54 0 0 0 10.23,0c1,-1.21 2.18,-3.75 2.18,-11.1s-1.2,-9.9 -2.18,-11.11a7.54,7.54 0 0 0 -10.23,0",
  "m475.89,191l7,-0.29c1.83,0 4,0.49 5,1.81a7.71,7.71 0 0 1 1.59,5.14l0,23.43l7.14,0l0,-24c0,-4.55 -1.4,-7.19 -3.49,-8.85c-3,-2.37 -8.36,-2.14 -8.36,-2.14l-16,0.29l0,34.72l7.08,0l0,-30.11",
  "m402,179.79l-7.1,0l0,33.55s0.16,3.07 0.34,4.14s1.73,3.64 5.84,3.64l7.39,-0.15l0,-4.3s-2,0.14 -3.22,0.14s-2.7,-0.08 -3,-2.15a42.84,42.84 0 0 1 -0.26,-4.53l0,-19.76l8,0l0,-4.3l-8,0l0,-6.28",
  "m259.12,197.65a7.71,7.71 0 0 0 -1.59,-5.14c-1,-1.32 -3.19,-1.81 -5,-1.81l-9.41,0.29l0,-4.63l11.33,-0.29s5.36,-0.23 8.35,2.14c2.09,1.66 3.48,4.3 3.48,8.85l0,23.68l-13.67,0.3s-6.19,0 -9.31,-1.24s-4.7,-4.63 -4.7,-9.34c0,-4.55 1.39,-7.19 3.48,-8.85c3,-2.38 8.36,-2.14 8.36,-2.14l4.36,0l0,4l-2.45,0c-1.83,0 -3.72,0.34 -4.77,1.67a6.5,6.5 0 0 0 -1.5,4.7c0,3.15 0.61,4.55 2.09,5.62c1.31,1 3.65,1.16 6.27,1.16l4.71,-0.28l0,-18.69",
  "m379.43,197.65a7.71,7.71 0 0 0 -1.58,-5.14c-1.05,-1.32 -3.2,-1.81 -5,-1.81l-9.41,0.29l0,-4.63l11.32,-0.29s5.35,-0.23 8.35,2.14c2.09,1.66 3.48,4.3 3.48,8.85l0,23.68l-13.67,0.3s-6.2,0 -9.31,-1.24s-4.71,-4.63 -4.71,-9.34c0,-4.55 1.41,-7.19 3.48,-8.85c3,-2.38 8.37,-2.14 8.37,-2.14l4.36,0l0,4l-2.45,0c-1.83,0 -3.73,0.34 -4.76,1.67a6.46,6.46 0 0 0 -1.51,4.7c0,3.15 0.61,4.55 2.09,5.62c1.3,1 3.66,1.16 6.27,1.16l4.7,-0.28l0,-18.69",
  "m509.58,221.4a7,7 0 1 0 -4.92,-2a7,7 0 0 0 4.92,2zm-5.8,-7a5.8,5.8 0 1 1 1.7,4.1a5.79,5.79 0 0 1 -1.7,-4.1",
  "m513,217.68a0.45,0.45 0 0 1 -0.22,-0.34a3.27,3.27 0 0 1 -0.07,-0.59l0,-1a1.81,1.81 0 0 0 -0.29,-1a1.42,1.42 0 0 0 -0.45,-0.38a2,2 0 0 0 0.58,-0.57a2.15,2.15 0 0 0 0.3,-1.18a1.93,1.93 0 0 0 -1.14,-1.91a3.55,3.55 0 0 0 -1.47,-0.26l-3.6,0l0,7.76l1.36,0l0,-3.21l2.11,0a2.38,2.38 0 0 1 0.84,0.11a0.89,0.89 0 0 1 0.44,0.83l0.06,1.24a4.64,4.64 0 0 0 0,0.61a2.39,2.39 0 0 0 0.1,0.29l0.06,0.1l1.49,0l0,-0.46l-0.1,0l0,-0.04zm-1.55,-5a1,1 0 0 1 -0.32,0.88a1.8,1.8 0 0 1 -1,0.26l-2.13,0l0,-2.2l2.29,0a1.71,1.71 0 0 1 0.74,0.14a0.93,0.93 0 0 1 0.47,0.92",
  "m560.64,181.31c0.1,5.27 -0.16,8 -1.93,10.69c-1.56,2.31 -4.65,4.44 -11.48,4.44l-8.47,-0.26c-1.33,0 -4.8,0.41 -6.44,2.18c-1.41,1.5 -1.5,2.64 -1.66,6.68l0,11.81l28.81,0l0,5.81l-31.47,0l-1.5,0a4.12,4.12 0 0 1 -4.25,-4.35l0,-8.82c0.14,-10.32 0.89,-11.8 3.13,-14.5c1.55,-1.86 5.18,-3.95 9.62,-4.18a45.35,45.35 0 0 1 4.79,-0.07c1.7,0.05 3.36,0.1 4.1,0.1c3.92,0.05 5.35,-0.67 6.43,-2.08c1.22,-1.59 1.87,-3.45 1.87,-6.51c0,-2.85 -0.58,-5.57 -1.67,-6.82c-1.33,-1.45 -2.58,-2.42 -6.28,-2.42c-9.3,0 -20.18,0.21 -20.18,0.21l0,-5.46s10.63,-0.47 21.47,-0.63c6.75,-0.1 10.46,1.68 12.35,4.15s2.7,5 2.78,10.05"
];
const WORDMARK_X = 189.72;
const WORDMARK_W = 370.94;
const WORDMARK_TOP = 167.126;
const WORDMARK_BASELINE = 221.12;
const WORDMARK_CAP = WORDMARK_BASELINE - WORDMARK_TOP;
const WORD_CAP_H = 0.09125;
const WORD_BASELINE_H = 0.5385;
const CAPTION_TEXT = "Sony Computer Entertainment";
const CAPTION_CAP_H = 0.0325;
const CAPTION_BASELINE_H = 0.5232;
const CAPTION_WIDTH_W = 0.562;
const CAPTION_CAP_EM = 0.714;
const CAPTION_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const HAZE_WIDE = "#8099ff";
const HAZE_TIGHT = "#dfe6ff";
const WORD_WHITE = "#ffffff";
const WIDE_GAIN = 1.15;
const MID_GAIN = 0.55;
const TIGHT_GAIN = 0.8;
const TRAIL_SPAN_S = 3.4;
const TRAIL_SAMPLES = 40;
const TRAIL_HALF_W = 0.022;
const ORBS = [
  {
    at: (t) => [-6.2 + 1.15 * t, -1.4 + 0.9 * Math.sin(0.42 * t), 82 + 0.8 * Math.cos(0.3 * t)],
    head: 15138800,
    tail: 3135688
  },
  {
    at: (t) => [
      5.4 - 0.95 * t,
      1.1 + 0.7 * Math.sin(0.33 * t + 1.7),
      79 + 0.6 * Math.sin(0.25 * t)
    ],
    head: 16759204,
    tail: 12596590
  }
];
function Ps2Intro({ onDone }) {
  const hostRef = useRef(null);
  const titleRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const host = hostRef.current;
    const title = titleRef.current;
    if (!host || !title) return;
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
    canvas.className = "teevy-ps2intro__canvas";
    host.insertBefore(canvas, title);
    const prevPixelRatio = renderer.getPixelRatio();
    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = renderer.getClearAlpha();
    const prevOutputColorSpace = renderer.outputColorSpace;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    const camera = new THREE.PerspectiveCamera(CAM_FOV, 4 / 3, 1, 1100);
    camera.position.set(0, 0, CAM_Z0);
    camera.lookAt(0, 0, 0);
    const ownedGeometries = [];
    const ownedMaterials = [];
    const spot = new THREE.SpotLight(16777215, 0.61);
    spot.position.set(0, 0, 100);
    spot.decay = 0;
    spot.distance = 100;
    scene.add(spot);
    const core = new THREE.PointLight(10139903, 3, 34);
    core.position.set(0, 0, GRID_Z + 8);
    core.decay = 0;
    scene.add(core);
    const ambient = new THREE.AmbientLight(11123932, 0.076);
    scene.add(ambient);
    const glowSize = 128;
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowSize;
    glowCanvas.height = glowSize;
    const glowCtx = glowCanvas.getContext("2d");
    if (glowCtx) {
      const g = glowCtx.createRadialGradient(
        glowSize / 2,
        glowSize / 2,
        0,
        glowSize / 2,
        glowSize / 2,
        glowSize / 2
      );
      g.addColorStop(0, "rgba(226,236,255,1)");
      g.addColorStop(0.1, "rgba(150,182,255,0.6)");
      g.addColorStop(0.34, "rgba(84,116,220,0.26)");
      g.addColorStop(0.62, "rgba(58,84,190,0.09)");
      g.addColorStop(1, "rgba(40,60,140,0)");
      glowCtx.fillStyle = g;
      glowCtx.fillRect(0, 0, glowSize, glowSize);
    }
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    const glowGeometry = new THREE.PlaneGeometry(22, 22);
    ownedGeometries.push(glowGeometry);
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    ownedMaterials.push(glowMaterial);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(0, 0, GRID_Z + 4);
    glowMesh.renderOrder = -1;
    scene.add(glowMesh);
    const gridMaterials = [];
    const random = makeRandom(SEED);
    const color = new THREE.Color();
    for (let x = -NUM_X / 2; x < NUM_X / 2; x++) {
      for (let y = -NUM_Y / 2; y < NUM_Y / 2; y++) {
        if (random() < 0.07) continue;
        if (random() * (1 - x * x * y * y / ((NUM_X * NUM_X / 4 - 2) * (NUM_Y * NUM_Y / 4 - 2))) < 0.3)
          continue;
        const depth = 5 + random() * (15 - x * x / 3);
        const geometry = new THREE.BoxGeometry(1, 1, depth);
        ownedGeometries.push(geometry);
        color.setHSL(189 / 360, 0, (40 + Math.floor(random() * 30)) / 100);
        const material = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          emissive: color,
          emissiveIntensity: 0.08
        });
        ownedMaterials.push(material);
        gridMaterials.push(material);
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x * SPACING, y * SPACING, GRID_Z);
        scene.add(cube);
      }
    }
    const glassGeometry = new THREE.BoxGeometry(1, 1, 1);
    ownedGeometries.push(glassGeometry);
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: 4669761,
      transparent: true,
      opacity: 0.8
    });
    ownedMaterials.push(glassMaterial);
    const glass = [];
    const GLASS = [
      [-4, 1, 85, [0, 0, 0], [0.12, 0, -0.12]],
      [3.5, 2, 86, [0, 0, 0], [-0.12, 0, -0.12]],
      [-0.5, 0.5, 81, [0.3, 0.4, 0.1], [0.12, 0, 0]],
      [-2.8, -2, 88, [0, 0, 0], [0.12, -0.12, 0]],
      [3, -1.3, 80, [0, 0, 0], [0.12, -0.12, 0]]
    ];
    for (const [x, y, z, rot, spin] of GLASS) {
      const mesh = new THREE.Mesh(glassGeometry, glassMaterial);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      scene.add(mesh);
      glass.push({ mesh, rest: rot, spin });
    }
    const trails = [];
    const headGeometry = new THREE.SphereGeometry(0.03, 8, 6);
    ownedGeometries.push(headGeometry);
    for (const spec of ORBS) {
      const count = TRAIL_SAMPLES;
      const positions = new Float32Array(count * 2 * 3);
      const colors = new Float32Array(count * 2 * 3);
      const indices = [];
      const head = new THREE.Color(spec.head);
      const tail = new THREE.Color(spec.tail);
      for (let i = 0; i < count; i++) {
        const k = i / (count - 1);
        const fade = (1 - k) * (1 - k);
        const r = mix(head.r, tail.r, k) * fade;
        const g = mix(head.g, tail.g, k) * fade;
        const b = mix(head.b, tail.b, k) * fade;
        for (let s = 0; s < 2; s++) {
          colors[(i * 2 + s) * 3] = r;
          colors[(i * 2 + s) * 3 + 1] = g;
          colors[(i * 2 + s) * 3 + 2] = b;
        }
        if (i > 0) {
          const a = (i - 1) * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      const position = new THREE.BufferAttribute(positions, 3);
      position.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("position", position);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      ownedGeometries.push(geometry);
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      ownedMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 80), 60);
      scene.add(mesh);
      const headMaterial = new THREE.MeshBasicMaterial({
        color: spec.head,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });
      ownedMaterials.push(headMaterial);
      const headMesh = new THREE.Mesh(headGeometry, headMaterial);
      scene.add(headMesh);
      trails.push({
        position,
        materials: [material, headMaterial],
        head: headMesh,
        spec
      });
    }
    const wordPath = new Path2D();
    for (const d of WORDMARK_PATHS) wordPath.addPath(new Path2D(d));
    const titleCtx = title.getContext("2d");
    const MIP_LEVELS = 5;
    const MIP_TIGHT = 2;
    const MIP_WIDE = 4;
    const mipDown = [];
    const mipUp = [];
    for (let i = 0; i < MIP_LEVELS; i++) {
      mipDown.push(document.createElement("canvas"));
      mipUp.push(document.createElement("canvas"));
    }
    const buildPyramid = (fill, deepest) => {
      const c0 = mipDown[0].getContext("2d");
      if (!c0) return;
      c0.setTransform(1, 0, 0, 1, 0, 0);
      c0.clearRect(0, 0, mipDown[0].width, mipDown[0].height);
      strokeWord(c0, 0.5, fill);
      for (let i = 1; i <= deepest; i++) {
        const c = mipDown[i].getContext("2d");
        if (!c) return;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, mipDown[i].width, mipDown[i].height);
        c.imageSmoothingEnabled = true;
        c.drawImage(mipDown[i - 1], 0, 0, mipDown[i].width, mipDown[i].height);
      }
    };
    const compose = (ctx, level, alpha) => {
      if (alpha <= 2e-3) return;
      let src = mipDown[level];
      for (let i = level - 1; i >= 0; i--) {
        const dst = mipUp[i];
        const c = dst.getContext("2d");
        if (!c) return;
        c.clearRect(0, 0, dst.width, dst.height);
        c.imageSmoothingEnabled = true;
        c.drawImage(src, 0, 0, dst.width, dst.height);
        src = dst;
      }
      ctx.imageSmoothingEnabled = true;
      let left = alpha;
      while (left > 2e-3) {
        ctx.globalAlpha = Math.min(left, 1);
        ctx.drawImage(src, 0, 0, ctx.canvas.width, ctx.canvas.height);
        left -= 1;
      }
      ctx.globalAlpha = 1;
    };
    const strokeWord = (ctx, k, fill) => {
      const h = title.height;
      const s = WORD_CAP_H * h / WORDMARK_CAP * k;
      const x0 = (title.width * k - WORDMARK_W * s) / 2;
      const y0 = WORD_BASELINE_H * h * k;
      ctx.save();
      ctx.setTransform(s, 0, 0, s, x0 - WORDMARK_X * s, y0 - WORDMARK_BASELINE * s);
      ctx.fillStyle = fill;
      ctx.fill(wordPath);
      ctx.restore();
    };
    const strokeCaption = (ctx, alpha) => {
      const size = CAPTION_CAP_H * title.height / CAPTION_CAP_EM;
      ctx.font = `400 ${size}px ${CAPTION_FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.letterSpacing = "0px";
      const natural = ctx.measureText(CAPTION_TEXT).width;
      const target = CAPTION_WIDTH_W * title.width;
      const extra = (target - natural) / CAPTION_TEXT.length;
      ctx.letterSpacing = `${extra}px`;
      const width = ctx.measureText(CAPTION_TEXT).width;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(CAPTION_TEXT, (title.width - width) / 2, CAPTION_BASELINE_H * title.height);
      ctx.globalAlpha = 1;
      ctx.letterSpacing = "0px";
    };
    const paintTitle = (t) => {
      if (!titleCtx) return;
      titleCtx.setTransform(1, 0, 0, 1, 0, 0);
      titleCtx.globalCompositeOperation = "source-over";
      titleCtx.globalAlpha = 1;
      titleCtx.clearRect(0, 0, title.width, title.height);
      const out = 1 - ramp(t, T_FADE, T_END);
      const captionAlpha = ramp(t, T_CAPTION_IN, T_CAPTION_FULL) * (1 - ramp(t, T_CAPTION_OUT, T_CAPTION_GONE)) * out;
      if (captionAlpha > 2e-3) strokeCaption(titleCtx, captionAlpha);
      const wide = ramp(t, T_WORD_IN, 14.55) * (1 - ramp(t, 14.64, 14.8)) * out;
      const tight = ramp(t, 14.6, 14.78) * (1 - ramp(t, 14.75, 14.83)) * out;
      const crisp = ramp(t, T_WORD_SNAP, T_WORD_FULL) * out;
      if (wide <= 2e-3 && tight <= 2e-3 && crisp <= 2e-3) return;
      if (wide > 2e-3 || tight > 2e-3) {
        titleCtx.globalCompositeOperation = "lighter";
        buildPyramid(HAZE_WIDE, MIP_WIDE);
        compose(titleCtx, MIP_WIDE, wide * WIDE_GAIN);
        compose(titleCtx, MIP_WIDE - 1, wide * MID_GAIN);
        buildPyramid(HAZE_TIGHT, MIP_TIGHT);
        compose(titleCtx, MIP_TIGHT, tight * TIGHT_GAIN);
      }
      if (crisp > 2e-3) {
        titleCtx.globalCompositeOperation = "lighter";
        titleCtx.globalAlpha = crisp;
        strokeWord(titleCtx, 1, WORD_WHITE);
        titleCtx.globalAlpha = 1;
      }
      titleCtx.globalCompositeOperation = "source-over";
    };
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      frameCamera(camera, host, w, h);
      title.width = title.clientWidth || w;
      title.height = title.clientHeight || h;
      for (let i = 0; i < MIP_LEVELS; i++) {
        const d = 2 << i;
        const mw = Math.max(2, Math.round(w / d));
        const mh = Math.max(2, Math.round(h / d));
        mipDown[i].width = mw;
        mipDown[i].height = mh;
        mipUp[i].width = mw;
        mipUp[i].height = mh;
      }
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);
    fit();
    const dir = new THREE.Vector3();
    const apply = (t) => {
      const slow = clamp01(t / T_SLOW_END);
      const rush = smooth(ramp(t, T_SLOW_END, T_RUSH_END));
      camera.position.z = mix(mix(CAM_Z0, CAM_Z1, slow), CAM_Z2, rush);
      camera.rotation.z = mix(0, CAM_ROLL_1, slow) + CAM_ROLL_2 * rush;
      for (const { mesh, rest, spin } of glass) {
        mesh.rotation.set(rest[0] + spin[0] * t, rest[1] + spin[1] * t, rest[2] + spin[2] * t);
      }
      const level = smooth(ramp(t, 0, T_WORLD_IN)) * (1 - ramp(t, 8.09, 8.61));
      spot.intensity = mix(0.66, 0.44, slow) * level;
      core.intensity = mix(1.42, 1.6, slow) * level;
      ambient.intensity = 0.076 * level;
      glowMaterial.opacity = 0.42 * level;
      for (const material of gridMaterials) material.emissiveIntensity = 0.08 * level;
      const step = TRAIL_SPAN_S / (TRAIL_SAMPLES - 1);
      const orbLevel = 0.55 * smooth(ramp(t, 0.5, 1.6)) * (1 - smooth(ramp(t, T_SLOW_END, T_RUSH_END)));
      for (const { position, spec, materials, head } of trails) {
        const array = position.array;
        for (let i = 0; i < TRAIL_SAMPLES; i++) {
          const ti = t - i * step;
          const p = spec.at(ti);
          const q = spec.at(ti + 0.05);
          dir.set(q[0] - p[0], q[1] - p[1], 0);
          const len = Math.hypot(dir.x, dir.y) || 1;
          const nx = -dir.y / len * TRAIL_HALF_W;
          const ny = dir.x / len * TRAIL_HALF_W;
          const a = i * 6;
          array[a] = p[0] + nx;
          array[a + 1] = p[1] + ny;
          array[a + 2] = p[2];
          array[a + 3] = p[0] - nx;
          array[a + 4] = p[1] - ny;
          array[a + 5] = p[2];
        }
        position.needsUpdate = true;
        const p0 = spec.at(t);
        head.position.set(p0[0], p0[1], p0[2]);
        for (const material of materials) material.opacity = orbLevel;
      }
      renderer.render(scene, camera);
      paintTitle(t);
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
      scene.clear();
      if (canvas.parentNode === host) host.removeChild(canvas);
      canvas.className = "";
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      renderer.outputColorSpace = prevOutputColorSpace;
      releaseRenderer(renderer);
    };
  }, []);
  return <div className="teevy-ps2intro" ref={hostRef} aria-hidden="true">
      <canvas className="teevy-ps2intro__title" ref={titleRef} />
    </div>;
}
export {
  Ps2Intro
};
