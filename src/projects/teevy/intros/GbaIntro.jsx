import { useEffect, useRef } from "react";
import lettersSvg from "./gameboy-letters.js";
const VIEW_W = 640;
const VIEW_H = 480;
const BG = "#fff7ff";
const LOGO_INK_LEFT = 77;
const LOGO_INK_RIGHT = 566;
const LOGO_BASELINE = 237;
const LOGO_CAP_H = 90;
const LOGO_INK_TOP = LOGO_BASELINE - LOGO_CAP_H;
const WORD_CX = (LOGO_INK_LEFT + LOGO_INK_RIGHT) / 2;
const LETTERS = [
  { char: "G", x: 77 },
  { char: "A", x: 135.08 },
  { char: "M", x: 194.58 },
  { char: "E", x: 293.31 },
  { char: "B", x: 362.48 },
  { char: "O", x: 431.44 },
  { char: "Y", x: 496.76 }
];
const BRAND_CX = (179 + 482) / 2;
const BRAND_WIDTH = 304;
const BRAND_BASELINE = 378;
const BRAND_COLOR = "#ff00ff";
const WALK = [
  [31, 31, 31],
  [31, 0, 31],
  [31, 0, 0],
  [31, 31, 0],
  [0, 31, 0],
  [0, 31, 31],
  [0, 0, 31]
];
const WALK_EDGE_STEPS = 8;
const WALK_STEPS = (WALK.length - 1) * WALK_EDGE_STEPS;
const SCALE = [
  [0, 3.95],
  [0.05, 3.3],
  [0.1, 2.55],
  [0.15, 2],
  [0.2, 1.68],
  [0.25, 1.55],
  [0.3, 1.5],
  [0.35, 1.43],
  [0.4, 1.32],
  [0.45, 1.24],
  [0.5, 1.15],
  [0.55, 1.06],
  [0.6, 1],
  [1, 1]
];
const SQUEEZE = [
  [0, 1.79],
  [0.025, 1.6],
  [0.05, 1.39],
  [0.0625, 1.27],
  [0.075, 1.17],
  [0.0875, 1.103],
  [0.1, 1.015],
  [0.1125, 0.948],
  [0.125, 0.906],
  [0.1375, 0.833],
  [0.15, 0.809],
  [0.1625, 0.76],
  [0.175, 0.731],
  [0.1875, 0.701],
  [0.2, 0.68],
  [0.225, 0.63],
  [0.25, 0.606],
  [0.3, 0.62],
  [0.35, 0.61],
  [0.4, 0.66],
  [0.45, 0.72],
  [0.5, 0.78],
  [0.55, 0.88],
  [0.6, 0.99],
  [0.625, 1],
  [1, 1]
];
const LIFT = [
  [0, 215],
  [0.025, 135],
  [0.0375, 93],
  [0.05, 53],
  [0.0625, 15],
  [0.075, -6],
  [0.0875, -22],
  [0.1, -48],
  [0.125, -73],
  [0.15, -104],
  [0.175, -112],
  [0.2, -123],
  [0.225, -116],
  [0.25, -100],
  [0.275, -94],
  [0.3, -80],
  [0.325, -70],
  [0.35, -52],
  [0.375, -34],
  [0.4, -17],
  [0.45, -10],
  [0.5, -8],
  [0.55, -4],
  [0.575, -1],
  [0.6, -6],
  [0.625, -18],
  [0.653, -24],
  [0.703, -30],
  [0.753, -24],
  [0.778, -18],
  [0.803, -6],
  [0.828, -3],
  [0.878, -10],
  [0.928, -3],
  [0.953, 0],
  [0.978, -3],
  [1, 0]
];
const T_BRAND_FADE = 0.267;
const T_FIRST_LETTER = 0.35;
const LETTER_DELAY = 0.08333;
const T_ENTRY = 1.3333;
const T_WALK = 0.8;
const T_WAVE_START = 1.767;
const T_WAVE = 1.267;
const T_FADE = 3.517;
const T_FADE_END = 4.05;
const T_END = 4.1;
const GLINT_T0 = 2.013;
const GLINT_SPEED = 533;
const GLINT_HALF = 29;
const GLINT_PEAK = 0.6;
const SAFETY_MARGIN_S = 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const mix = (a, b, k) => a + (b - a) * k;
function curveAt(keys, u) {
  const p = clamp01(u);
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] < p) i++;
  const [p0, v0] = keys[i];
  const [p1, v1] = keys[i + 1];
  return p1 === p0 ? v0 : mix(v0, v1, (p - p0) / (p1 - p0));
}
function walkColor(n) {
  const s = n < 0 ? 0 : n > WALK_STEPS ? WALK_STEPS : n;
  const edge = Math.min(WALK.length - 2, Math.floor(s / WALK_EDGE_STEPS));
  const k = (s - edge * WALK_EDGE_STEPS) / WALK_EDGE_STEPS;
  const a = WALK[edge];
  const b = WALK[edge + 1];
  return [
    mix(a[0], b[0], k) * 255 / 31,
    mix(a[1], b[1], k) * 255 / 31,
    mix(a[2], b[2], k) * 255 / 31
  ];
}
const css = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
function GbaIntro({ onDone }) {
  const hostRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
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
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "teevy-gbaintro__svg");
    svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", String(-4 * VIEW_W));
    bg.setAttribute("y", String(-4 * VIEW_H));
    bg.setAttribute("width", String(9 * VIEW_W));
    bg.setAttribute("height", String(9 * VIEW_H));
    bg.setAttribute("fill", BG);
    svg.appendChild(bg);
    const defs = document.createElementNS(NS, "defs");
    svg.appendChild(defs);
    const uid = `gba${Math.random().toString(36).slice(2, 8)}`;
    const stage = document.createElementNS(NS, "g");
    svg.appendChild(stage);
    const brand = document.createElementNS(NS, "text");
    brand.setAttribute("class", "teevy-gbaintro__brand");
    brand.setAttribute("x", String(BRAND_CX));
    brand.setAttribute("y", String(BRAND_BASELINE));
    brand.setAttribute("text-anchor", "middle");
    brand.setAttribute("textLength", String(BRAND_WIDTH));
    brand.setAttribute("lengthAdjust", "spacingAndGlyphs");
    brand.setAttribute("fill", BRAND_COLOR);
    brand.textContent = "Nintendo";
    const reg = document.createElementNS(NS, "tspan");
    reg.setAttribute("class", "teevy-gbaintro__reg");
    reg.textContent = "\xAE";
    brand.appendChild(reg);
    stage.appendChild(brand);
    const source = new DOMParser().parseFromString(lettersSvg, "image/svg+xml");
    const byChar = new Map();
    for (const node of Array.from(source.querySelectorAll("path"))) {
      const id = node.getAttribute("id");
      if (id) byChar.set(id, node);
    }
    const letters = [];
    const GRAD_STOPS = 5;
    const placed = LETTERS.flatMap((letter) => {
      const glyph = byChar.get(letter.char);
      if (!glyph) return [];
      const path = document.importNode(glyph, true);
      const place = document.createElementNS(NS, "g");
      place.appendChild(path);
      const group = document.createElementNS(NS, "g");
      group.appendChild(place);
      stage.appendChild(group);
      return [{ ...letter, path, place, group }];
    });
    host.appendChild(svg);
    const boxes = placed.map((p) => p.path.getBBox());
    const artTop = boxes.length ? Math.min(...boxes.map((b) => b.y)) : 0;
    const artBottom = boxes.length ? Math.max(...boxes.map((b) => b.y + b.height)) : 1;
    const scaleY = LOGO_CAP_H / (artBottom - artTop);
    const originY = LOGO_INK_TOP - artTop * scaleY;
    const last = placed[placed.length - 1];
    const lastBox = boxes[boxes.length - 1];
    const rawRight = last ? last.x + lastBox.width * scaleY : LOGO_INK_RIGHT;
    const kx = (LOGO_INK_RIGHT - LOGO_INK_LEFT) / (rawRight - LOGO_INK_LEFT);
    const scaleX = scaleY * kx;
    placed.forEach((letter, index) => {
      const box = boxes[index];
      const inkLeft = LOGO_INK_LEFT + (letter.x - LOGO_INK_LEFT) * kx;
      const originX = inkLeft - box.x * scaleX;
      letter.place.setAttribute(
        "transform",
        `translate(${originX.toFixed(3)} ${originY.toFixed(3)}) scale(${scaleX.toFixed(6)} ${scaleY.toFixed(6)})`
      );
      const grad = document.createElementNS(NS, "linearGradient");
      grad.setAttribute("id", `${uid}-${index}`);
      grad.setAttribute("gradientUnits", "userSpaceOnUse");
      grad.setAttribute("x1", String(box.x));
      grad.setAttribute("x2", String(box.x + box.width));
      const stops = [];
      const sampleX = [];
      for (let s = 0; s < GRAD_STOPS; s++) {
        const stop = document.createElementNS(NS, "stop");
        stop.setAttribute("offset", String(s / (GRAD_STOPS - 1)));
        grad.appendChild(stop);
        stops.push(stop);
        sampleX.push(inkLeft + box.width * scaleX * s / (GRAD_STOPS - 1));
      }
      defs.appendChild(grad);
      letters.push({
        node: letter.group,
        stops,
        sampleX,
        cx: inkLeft + box.width * scaleX / 2,
        cy: originY + (box.y + box.height / 2) * scaleY,
        index,
        start: T_FIRST_LETTER + index * LETTER_DELAY
      });
    });
    const apply = (t) => {
      const glintX = LOGO_INK_LEFT + GLINT_SPEED * (t - GLINT_T0);
      const glintOn = glintX > LOGO_INK_LEFT - GLINT_HALF && glintX < LOGO_INK_RIGHT + GLINT_HALF;
      for (const letter of letters) {
        const local = t - letter.start;
        letter.node.setAttribute("visibility", local < 0 ? "hidden" : "visible");
        if (local < 0) continue;
        const p = clamp01(local / T_ENTRY);
        const s = curveAt(SCALE, p);
        const squeeze = curveAt(SQUEEZE, p);
        const x = WORD_CX + squeeze * (letter.cx - WORD_CX);
        const y = letter.cy + curveAt(LIFT, p);
        letter.node.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)}) translate(${(-letter.cx).toFixed(2)} ${(-letter.cy).toFixed(2)})`
        );
        let color;
        if (local < T_WALK) {
          color = walkColor(local / T_WALK * WALK_STEPS);
        } else {
          const w = (t - (T_WAVE_START + letter.index * LETTER_DELAY)) / T_WAVE;
          const up = w <= 0 || w >= 1 ? 0 : w < 0.5 ? w * 2 : (1 - w) * 2;
          color = [up * 255, 0, 255];
        }
        if (glintOn) {
          for (let i = 0; i < letter.stops.length; i++) {
            const d = Math.abs(letter.sampleX[i] - glintX) / GLINT_HALF;
            const a = d >= 1 ? 0 : GLINT_PEAK * 0.5 * (1 + Math.cos(Math.PI * d));
            letter.stops[i].setAttribute(
              "stop-color",
              css([mix(color[0], 255, a), mix(color[1], 255, a), mix(color[2], 255, a)])
            );
          }
          letter.node.setAttribute("fill", `url(#${uid}-${letter.index})`);
        } else {
          letter.node.setAttribute("fill", css(color));
        }
      }
      const step16 = (v) => Math.round(v * 16) / 16;
      brand.setAttribute("opacity", step16(ramp(t, 0, T_BRAND_FADE)).toFixed(4));
      stage.setAttribute("opacity", step16(1 - ramp(t, T_FADE, T_FADE_END)).toFixed(4));
      bg.setAttribute("opacity", t >= T_END ? "0" : "1");
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
      if (svg.parentNode === host) host.removeChild(svg);
    };
  }, []);
  return <div className="teevy-gbaintro" ref={hostRef} aria-hidden="true" />;
}
export {
  GbaIntro
};
