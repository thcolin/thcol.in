import { useEffect, useRef } from "react";
const VIEW_X = 240;
const VIEW_W = 1440;
const VIEW_H = 1080;
const VIEW_RIGHT = VIEW_X + VIEW_W;
const BLUE = "#0b00c8";
const RED = "#f51000";
const GREEN = "#00c800";
const YELLOW = "#fae100";
const R0 = 98;
const FINAL = {
  blue: { cx: 960, cy: 305, rx: 98, ry: 98 },
  green: { cx: 821, cy: 407, rx: 98, ry: 58 },
  red: { cx: 1143, cy: 406, rx: 100, ry: 100 },
  yellow: { cx: 1013, cy: 503, rx: 97, ry: 58 }
};
const HALO = 55;
const TITLE_CX = 969;
const TITLE_W = 1068;
const TITLE_BASELINE = 879;
const BAR_L = 429;
const BAR_W = 1052;
const BAR_TOP = 897;
const BAR_H = 61;
const MIRROR_AXIS = BAR_TOP + BAR_H + 6;
const MIRROR_ALPHA = 0.17;
const T_CONVERGE = 0.9;
const T_SWIRL_END = 3.1;
const T_SETTLE_END = 3.95;
const T_WORD_IN = 4.45;
const T_WORD_FULL = 5.05;
const T_FADE = 6.3;
const T_END = 6.8;
const SWIRL_R = 112;
const SWIRL_CX = 984;
const SWIRL_CY0 = 544;
const SWIRL_CY1 = 393;
const SWIRL_TURNS = 3;
const SWIRL_CRUISE = 0.88;
const SAFETY_MARGIN_S = 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const mix = (a, b, k) => a + (b - a) * k;
const ENTRY = {
  blue: { cx: SWIRL_CX, cy: -R0 - 6 },
  green: { cx: VIEW_X - R0 - 6, cy: SWIRL_CY0 },
  red: { cx: VIEW_RIGHT + R0 + 6, cy: SWIRL_CY0 },
  yellow: { cx: SWIRL_CX, cy: VIEW_H + R0 + 6 }
};
function swirlAngle(u) {
  const total = SWIRL_TURNS * Math.PI * 2;
  const p = SWIRL_CRUISE;
  const omega = total / (p + (1 - p) / 2);
  if (u <= p) return omega * u;
  const d = (u - p) / (1 - p);
  return omega * p + omega * (1 - p) * (d - d * d / 2);
}
function shapesAt(t) {
  const keys = ["blue", "green", "red", "yellow"];
  const baseAngle = { blue: -Math.PI / 2, green: Math.PI, red: 0, yellow: Math.PI / 2 };
  if (t < T_CONVERGE) {
    const k2 = ramp(t, 0, T_CONVERGE);
    const out2 = {};
    for (const key of keys) {
      const a = baseAngle[key];
      out2[key] = {
        cx: mix(ENTRY[key].cx, SWIRL_CX + Math.cos(a) * SWIRL_R, k2),
        cy: mix(ENTRY[key].cy, SWIRL_CY0 + Math.sin(a) * SWIRL_R, k2),
        rx: R0,
        ry: R0
      };
    }
    return out2;
  }
  if (t < T_SWIRL_END) {
    const u = ramp(t, T_CONVERGE, T_SWIRL_END);
    const rot = swirlAngle(u);
    const cy = mix(SWIRL_CY0, SWIRL_CY1, smooth(u));
    const out2 = {};
    for (const key of keys) {
      const a = baseAngle[key] + rot;
      out2[key] = {
        cx: SWIRL_CX + Math.cos(a) * SWIRL_R,
        cy: cy + Math.sin(a) * SWIRL_R,
        rx: R0,
        ry: R0
      };
    }
    return out2;
  }
  const k = smooth(ramp(t, T_SWIRL_END, T_SETTLE_END));
  const out = {};
  for (const key of keys) {
    const a = baseAngle[key];
    const from = {
      cx: SWIRL_CX + Math.cos(a) * SWIRL_R,
      cy: SWIRL_CY1 + Math.sin(a) * SWIRL_R,
      rx: R0,
      ry: R0
    };
    const to = FINAL[key];
    out[key] = {
      cx: mix(from.cx, to.cx, k),
      cy: mix(from.cy, to.cy, k),
      rx: mix(from.rx, to.rx, k),
      ry: mix(from.ry, to.ry, k)
    };
  }
  return out;
}
function SnesIntro({ onDone }) {
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
    svg.setAttribute("class", "teevy-snesintro__svg");
    svg.setAttribute("viewBox", `${VIEW_X} 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const defs = document.createElementNS(NS, "defs");
    svg.appendChild(defs);
    const ell = (fill) => {
      const e = document.createElementNS(NS, "ellipse");
      e.setAttribute("fill", fill);
      return e;
    };
    const cutMask = (id) => {
      const mask = document.createElementNS(NS, "mask");
      mask.setAttribute("id", id);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("x", String(VIEW_X));
      mask.setAttribute("y", "0");
      mask.setAttribute("width", String(VIEW_W));
      mask.setAttribute("height", String(VIEW_H));
      const bg = document.createElementNS(NS, "rect");
      bg.setAttribute("x", String(VIEW_X));
      bg.setAttribute("y", "0");
      bg.setAttribute("width", String(VIEW_W));
      bg.setAttribute("height", String(VIEW_H));
      bg.setAttribute("fill", "#fff");
      const hole = ell("#000");
      mask.append(bg, hole);
      defs.appendChild(mask);
      return { mask, hole };
    };
    const greenHalo = cutMask("snes-cut-green");
    const yellowHalo = cutMask("snes-cut-yellow");
    const blue = ell(BLUE);
    blue.setAttribute("mask", "url(#snes-cut-green)");
    const red = ell(RED);
    red.setAttribute("mask", "url(#snes-cut-yellow)");
    const green = ell(GREEN);
    const yellow = ell(YELLOW);
    const rosace = document.createElementNS(NS, "g");
    rosace.append(blue, red, green, yellow);
    svg.appendChild(rosace);
    const word = document.createElementNS(NS, "g");
    word.setAttribute("class", "teevy-snesintro__word");
    word.setAttribute("opacity", "0");
    const wordBody = document.createElementNS(NS, "g");
    wordBody.setAttribute("id", "snes-word");
    word.appendChild(wordBody);
    const mkTitle = (fill, dx, dy) => {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("class", "teevy-snesintro__title");
      t.setAttribute("x", String(TITLE_CX + dx));
      t.setAttribute("y", String(TITLE_BASELINE + dy));
      t.setAttribute("fill", fill);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("textLength", String(TITLE_W));
      t.setAttribute("lengthAdjust", "spacingAndGlyphs");
      t.textContent = "SUPER NINTENDO";
      return t;
    };
    wordBody.appendChild(mkTitle("#6b0500", -7, 7));
    wordBody.appendChild(mkTitle(RED, 0, 0));
    const barMask = document.createElementNS(NS, "mask");
    barMask.setAttribute("id", "snes-bar");
    barMask.setAttribute("maskUnits", "userSpaceOnUse");
    barMask.setAttribute("x", String(VIEW_X));
    barMask.setAttribute("y", "0");
    barMask.setAttribute("width", String(VIEW_W));
    barMask.setAttribute("height", String(VIEW_H));
    const barBg = document.createElementNS(NS, "rect");
    barBg.setAttribute("x", String(BAR_L));
    barBg.setAttribute("y", String(BAR_TOP));
    barBg.setAttribute("width", String(BAR_W));
    barBg.setAttribute("height", String(BAR_H));
    barBg.setAttribute("fill", "#fff");
    const barText = document.createElementNS(NS, "text");
    barText.setAttribute("class", "teevy-snesintro__sub");
    barText.setAttribute("x", String(BAR_L + BAR_W / 2));
    barText.setAttribute("y", String(BAR_TOP + BAR_H - 12));
    barText.setAttribute("fill", "#000");
    barText.setAttribute("text-anchor", "middle");
    barText.setAttribute("textLength", String(BAR_W - 28));
    barText.setAttribute("lengthAdjust", "spacing");
    barText.textContent = "ENTERTAINMENT SYSTEM";
    barMask.append(barBg, barText);
    defs.appendChild(barMask);
    const bar = document.createElementNS(NS, "rect");
    bar.setAttribute("x", String(BAR_L));
    bar.setAttribute("y", String(BAR_TOP));
    bar.setAttribute("width", String(BAR_W));
    bar.setAttribute("height", String(BAR_H));
    bar.setAttribute("fill", RED);
    bar.setAttribute("mask", "url(#snes-bar)");
    wordBody.appendChild(bar);
    const fade = document.createElementNS(NS, "linearGradient");
    fade.setAttribute("id", "snes-mirror-fade");
    fade.setAttribute("gradientUnits", "userSpaceOnUse");
    fade.setAttribute("x1", "0");
    fade.setAttribute("y1", String(MIRROR_AXIS));
    fade.setAttribute("x2", "0");
    fade.setAttribute("y2", String(MIRROR_AXIS + 420));
    for (const [offset, stop] of [
      ["0", String(MIRROR_ALPHA)],
      ["1", "0"]
    ]) {
      const s = document.createElementNS(NS, "stop");
      s.setAttribute("offset", offset);
      s.setAttribute("stop-color", "#fff");
      s.setAttribute("stop-opacity", stop);
      fade.appendChild(s);
    }
    defs.appendChild(fade);
    const mirrorMask = document.createElementNS(NS, "mask");
    mirrorMask.setAttribute("id", "snes-mirror");
    mirrorMask.setAttribute("maskUnits", "userSpaceOnUse");
    mirrorMask.setAttribute("x", String(VIEW_X));
    mirrorMask.setAttribute("y", "0");
    mirrorMask.setAttribute("width", String(VIEW_W));
    mirrorMask.setAttribute("height", String(VIEW_H));
    const mirrorRect = document.createElementNS(NS, "rect");
    mirrorRect.setAttribute("x", String(VIEW_X));
    mirrorRect.setAttribute("y", String(MIRROR_AXIS));
    mirrorRect.setAttribute("width", String(VIEW_W));
    mirrorRect.setAttribute("height", String(VIEW_H));
    mirrorRect.setAttribute("fill", "url(#snes-mirror-fade)");
    mirrorMask.appendChild(mirrorRect);
    defs.appendChild(mirrorMask);
    const mirror = document.createElementNS(NS, "g");
    mirror.setAttribute("mask", "url(#snes-mirror)");
    const mirrorUse = document.createElementNS(NS, "use");
    mirrorUse.setAttribute("href", "#snes-word");
    mirrorUse.setAttribute("transform", `translate(0 ${2 * MIRROR_AXIS}) scale(1 -1)`);
    mirror.appendChild(mirrorUse);
    word.insertBefore(mirror, wordBody);
    svg.appendChild(word);
    host.appendChild(svg);
    const apply = (t) => {
      const s = shapesAt(t);
      const set = (node, sh) => {
        node.setAttribute("cx", sh.cx.toFixed(2));
        node.setAttribute("cy", sh.cy.toFixed(2));
        node.setAttribute("rx", sh.rx.toFixed(2));
        node.setAttribute("ry", sh.ry.toFixed(2));
      };
      set(blue, s.blue);
      set(red, s.red);
      set(green, s.green);
      set(yellow, s.yellow);
      const halo = HALO * smooth(ramp(t, T_SWIRL_END, T_SETTLE_END));
      set(greenHalo.hole, {
        cx: s.green.cx,
        cy: s.green.cy,
        rx: s.green.rx + halo,
        ry: s.green.ry + halo
      });
      set(yellowHalo.hole, {
        cx: s.yellow.cx,
        cy: s.yellow.cy,
        rx: s.yellow.rx + halo,
        ry: s.yellow.ry + halo
      });
      word.setAttribute("opacity", ramp(t, T_WORD_IN, T_WORD_FULL).toFixed(3));
      svg.style.opacity = (1 - ramp(t, T_FADE, T_END)).toFixed(3);
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
  return <div className="teevy-snesintro" ref={hostRef} aria-hidden="true" />;
}
export {
  SnesIntro
};
