import { useEffect, useRef } from "react";
const VIEW_W = 640;
const VIEW_H = 480;
const S1_BG = "#afafaf";
const DIAMOND_CX = 321;
const DIAMOND_CY = 237.5;
const DIAMOND_RX = 126.5;
const DIAMOND_RY = 127;
const S1_INK = "#0a1d3c";
const DIAMOND_RED = "#b00d00";
const DIAMOND_GOLD = "#b08400";
const SQUARE = 240;
const TRI_SCALE = 0.45;
const TRI_DX = 0.35 * SQUARE;
const TRI_DY = 0.5 * SQUARE;
const PS_RED = "#fd1400";
const PS_RED_DARK = "#610400";
const PS_YELLOW = "#dcaa00";
const PS_YELLOW_DARK = "#6a5309";
const PS_TEAL = "#28957f";
const PS_TEAL_DARK = "#144a40";
const PS_BLUE = "#345386";
const PS_BLUE_DARK = "#1a2943";
const S2_WORD = "#ebebeb";
const S2_LEGAL = "#cfcfcf";
const LOGO_ORIGIN = "translate(-61.68556 -312.8684)";
const P_TR = { ox: 219.2, oy: 58.3, sx: 0.3545, sy: 0.3654 };
const RIB_TR = { ox: 231.8, oy: 66.55, sx: 0.28237, sy: 0.3552 };
const P_DEPTH_X = 5;
const P_DEPTH_Y = 2.5;
const RIB_DEPTH_Y = 7;
const WORD_TR = { ox: 150.79, oy: 261.92, k: 0.5023 };
const LOGO_P = "M 395.06807,434.21345 L 394.60021,863.39514 L 279.61012,825.99696 L 279.61012,321.53515 L 426.38841,360.34125 C 520.34231,385.59251 577.83949,434.67697 576.90381,520.70189 C 575.96956,620.75529 529.69221,660.95773 439.47538,634.77658 L 439.47538,437.47977 C 439.47538,413.635 395.06807,412.23866 395.06807,434.21345 L 395.06807,434.21345 z";
const LOGO_YELLOW = "M 226.78568,742.76757 L 172.56056,761.00535 C 137.49733,773.16387 107.58489,744.64627 139.83807,732.95128 L 166.01346,723.60717 L 67.381005,692.27665 C 36.994899,702.56663 8.4787729,724.53999 10.3531,755.3983 C 12.223081,786.7187 83.74009,794.20296 138.90381,803.08643 C 190.32031,811.49773 237.06553,806.82349 279.60869,791.86223 L 279.60869,759.60031 L 226.78568,742.76757 L 226.78568,742.76757 z M 394.60021,780 L 515.7,812.5 L 394.60021,845 z";
const LOGO_BLUE = "M 662.91715,769.42531 L 664.78565,768.95457 C 708.72663,753.53123 727.42501,732.01703 722.75363,711.92089 C 715.27373,678.26121 661.51646,660.02348 578.77524,653.9442 C 519.41092,649.73926 460.98092,662.82627 403.95154,682.46035 L 394.60164,685.73681 L 496.97405,717.52794 L 556.80624,697.42166 C 619.44554,685.73681 644.69244,706.30513 584.38808,725.47573 L 554.46981,735.75553 L 662.91715,769.42531 L 662.91715,769.42531 z M 279.61012,620.75529 L 234.26272,636.17869 L 279.61012,650.2057 L 279.61012,620.75529 L 279.61012,620.75529 z";
const LOGO_TEAL = "M 496.03688,828.32754 L 662.91715,769.42531 L 554.46695,735.75553 L 394.60021,790.45575 L 394.60021,796.07291 L 496.03688,828.32754 L 496.03688,828.32754 z M 279.61012,725.00349 L 226.78712,742.76906 L 279.61012,759.60031 L 279.61012,725.00349 L 279.61012,725.00349 z M 394.60021,752.5955 L 394.60021,685.73681 L 496.97262,717.52794 L 394.60021,752.5955 L 394.60021,752.5955 z M 166.01492,723.60717 L 279.60869,682.93251 L 279.60869,650.2057 L 234.26272,636.17869 L 69.718853,691.81461 C 69.250983,691.81461 68.316721,692.27665 67.38246,692.27665 L 166.01492,723.60717 L 166.01492,723.60717 z";
const WORD_GLYPHS = [
  ["m 0,0 -23.004,0.01 c -0.095,0 -0.171,-0.075 -0.171,-0.162 v -53.802 c 0,-0.086 0.076,-0.167 0.171,-0.167 h 9.323 l 0.164,0.167 0.011,47.962 0.055,0.08 10.675,0.02 c 3.887,0 6.022,-3.917 6.022,-11.015 0,-7.102 -2.135,-11.028 -6.022,-11.028 l -6.425,0.007 c -0.096,0 -0.161,-0.073 -0.161,-0.165 v -5.582 c 0,-0.109 0.065,-0.175 0.161,-0.175 H 0 c 3.246,0 6.425,1.504 8.719,4.089 2.718,3.068 4.149,7.497 4.149,12.805 C 12.868,-6.67 7.844,0 0,0", 178.8711, -22.0782],
  ["m 0,0 h -9.329 c -0.106,0 -0.182,-0.075 -0.182,-0.162 v -53.802 c 0,-0.087 0.076,-0.167 0.182,-0.167 H 0 l 0.171,0.167 V -0.162 L 0,0", 206.9867, -22.0681],
  ["m 0,0 c 0,0.095 -0.084,0.167 -0.176,0.167 h -16.613 c -14.897,0 -16.801,-10.935 -16.801,-20.545 l 0.011,-8.311 c 0,-7.152 4.448,-12.345 10.563,-12.345 h 9.064 l 0.164,0.166 v 5.576 c 0,0.091 -0.077,0.172 -0.164,0.172 l -6.474,-0.011 c -1.492,0.031 -3.5,0.662 -3.5,5.79 v 8.973 c -0.007,5.963 0.548,9.775 1.786,11.944 1.341,2.394 3.452,2.715 5.351,2.715 h 7.081 l 0.06,-0.084 -0.009,-35.075 c 0,-0.085 0.072,-0.166 0.171,-0.166 h 9.312 c 0.092,0 0.174,0.081 0.174,0.166", 247.6721, -35.1639],
  ["M 0,0 -0.108,-0.162 13.72,-40.655 c 0.023,-0.091 0.023,-0.231 -0.006,-0.32 L 5.928,-61.024 c -0.033,-0.095 0.01,-0.165 0.102,-0.165 h 8.108 c 0.1,0 0.205,0.07 0.238,0.165 L 38.65,-0.162 C 38.684,-0.065 38.641,0 38.546,0 H 29.7 C 29.604,0 29.503,-0.073 29.473,-0.162 L 19.196,-26.771 H 19.081 L 10.008,-0.162 C 9.987,-0.065 9.883,0 9.79,0", 252.932, -34.9979],
  ["m 0,0 -4.594,0.35 c -3.445,0.297 -6.007,2.205 -6.007,7.85 0,6.591 2.956,8.394 6.902,8.394 H 9.016 l 0.169,0.164 v 5.595 L 9.016,22.514 H 8.75 L -5.025,22.511 c -8.678,0 -14.849,-5.097 -14.849,-15.255 V 6.814 c 0,-8.015 4.932,-13.8 12.282,-14.362 l 4.572,-0.339 c 3.488,-0.264 5.66,-3.383 5.66,-8.116 v -1.331 c 0,-2.959 -0.74,-8.373 -7.086,-8.373 h -13.211 c -0.089,0 -0.166,-0.077 -0.166,-0.172 v -5.569 l 0.166,-0.167 h 16.402 c 5.054,0 13.517,2.045 13.517,15.801 0,4.984 -1.132,8.912 -3.427,11.751 C 6.879,-1.625 3.981,-0.306 0,0", 314.7781, -44.5828],
  ["m 0,0 h -10.12 l -0.053,0.062 v 6.78 c 0,0.09 -0.069,0.166 -0.163,0.166 h -9.32 c -0.095,0 -0.178,-0.076 -0.178,-0.166 V -28.86 c 0,-7.151 4.458,-12.341 10.596,-12.341 h 6.675 c 0.096,0 0.17,0.081 0.17,0.167 v 5.57 c 0,0.091 -0.074,0.177 -0.17,0.177 h -4.098 c -1.05,0.016 -3.512,0.069 -3.522,5.338 v 24.035 l 0.057,0.054 c 3.1,-0.016 10.126,0 10.126,0 l 0.164,0.153 v 5.54 C 0.164,-0.073 0.087,0 0,0", 353.6995, -34.9979],
  ["m 0,0 c 0,0.095 -0.079,0.167 -0.167,0.167 h -16.65 c -14.865,0 -16.789,-10.935 -16.789,-20.545 l 0.012,-8.311 c 0,-7.152 4.444,-12.345 10.591,-12.345 h 9.039 l 0.168,0.166 v 5.576 c 0,0.091 -0.079,0.172 -0.168,0.172 l -6.478,-0.011 c -1.486,0.031 -3.476,0.662 -3.482,5.79 v 8.973 c 0,5.963 0.561,9.775 1.77,11.944 1.342,2.394 3.467,2.715 5.334,2.715 h 7.113 l 0.07,-0.084 -0.017,-35.075 c 0,-0.085 0.077,-0.166 0.17,-0.166 h 9.325 c 0.092,0 0.159,0.081 0.159,0.166", 391.1779, -35.1639],
  ["m 0,0 h -10.063 l -0.068,0.062 v 6.78 l -0.154,0.166 h -9.339 c -0.092,0 -0.172,-0.076 -0.172,-0.166 V -28.86 c 0,-7.151 4.45,-12.341 10.584,-12.341 h 6.673 c 0.1,0 0.165,0.081 0.165,0.167 v 5.57 c 0,0.091 -0.065,0.177 -0.165,0.177 h -4.097 c -1.053,0.016 -3.495,0.069 -3.495,5.338 v 24.035 l 0.056,0.054 C -6.999,-5.876 0,-5.86 0,-5.86 l 0.166,0.153 v 5.54 C 0.166,-0.073 0.082,0 0,0", 418.7856, -34.9979],
  ["m 0,0 h -9.319 c -0.087,0 -0.17,-0.073 -0.17,-0.167 v -40.867 l 0.17,-0.167 H 0 c 0.102,0 0.172,0.081 0.172,0.167 V -0.167 C 0.172,-0.073 0.102,0 0,0", 434.1963, -34.9979],
  ["m 0,0 h -9.319 l -0.17,-0.162 v -7.813 c 0,-0.095 0.083,-0.165 0.17,-0.165 H 0 c 0.102,0 0.172,0.07 0.172,0.165 v 7.813 C 0.172,-0.075 0.102,0 0,0", 434.1963, -22.0681],
  ["m 0,0 c -1.467,-2.416 -3.796,-2.739 -5.909,-2.739 -2.092,0 -4.428,0.323 -5.911,2.739 -1.337,2.174 -1.956,5.983 -1.956,11.989 v 0.048 c 0,7.088 0.872,11.115 2.823,13.033 1.167,1.164 2.68,1.636 5.044,1.636 2.398,0 3.896,-0.472 5.062,-1.636 C 1.087,23.152 1.961,19.108 1.961,11.989 1.961,5.975 1.34,2.163 0,0 m -5.909,32.581 c -15.568,0 -17.558,-10.986 -17.558,-20.592 0,-9.617 1.99,-20.639 17.558,-20.639 15.569,0 17.554,11.022 17.554,20.639 0,9.606 -1.985,20.592 -17.554,20.592", 464.0459, -67.5785],
  ["m 0,0 h -16.633 c -0.087,0 -0.164,-0.073 -0.164,-0.167 l -0.005,-40.867 0.156,-0.167 h 9.336 l 0.158,0.167 -0.013,35.085 0.065,0.068 7.092,0.005 c 1.918,0 4.022,-0.309 5.368,-2.527 1.231,-2.004 1.789,-5.527 1.789,-11.056 0.008,-0.239 -0.007,-21.575 -0.007,-21.575 0,-0.086 0.074,-0.167 0.166,-0.167 h 9.296 c 0.101,0 0.175,0.081 0.175,0.167 v 20.495 C 16.779,-10.934 14.86,0 0,0", 498.6763, -34.9979]
];
const T_BG_IN = 0.03;
const T_BG_FULL = 0.97;
const T_DIAMOND = 1;
const T_DIAMOND_FULL = 1.03;
const T_SPLIT = 1.15;
const T_SPLIT_END = 2;
const T_S1_TEXT = 2;
const T_S1_TEXT_FULL = 2.07;
const T_S1_CLEAR = 6.23;
const T_S1_FADE = 6.23;
const T_S1_BLACK = 6.46;
const T_S2_IN = 6.55;
const T_S2_LOGO_FULL = 7.02;
const T_S2_WORD = 7.05;
const T_S2_WORD_FULL = 7.53;
const T_S2_LEGAL = 7.05;
const T_S2_LEGAL_FULL = 7.09;
const T_CUT = 14.5;
const T_END = 14.6;
const SAFETY_MARGIN_S = 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
function Ps1Intro({ onDone }) {
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
    const el = (name, attrs = {}) => {
      const node = document.createElementNS(NS, name);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
      return node;
    };
    const svg = el("svg", {
      class: "teevy-ps1intro__svg",
      viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
      preserveAspectRatio: "xMidYMid meet"
    });
    const defs = el("defs");
    svg.appendChild(defs);
    const screen1 = el("g", { opacity: 0 });
    svg.appendChild(screen1);
    screen1.appendChild(el("rect", { x: -4 * VIEW_W, y: -4 * VIEW_H, width: 9 * VIEW_W, height: 9 * VIEW_H, fill: S1_BG }));
    const grad = el("linearGradient", {
      id: "ps1-diamond",
      gradientUnits: "userSpaceOnUse",
      gradientTransform: "rotate(-45)",
      x1: -SQUARE * 0.7072,
      y1: 0,
      x2: SQUARE * 0.7072,
      y2: 0
    });
    for (const [offset, color] of [
      ["0", DIAMOND_RED],
      ["0.5", DIAMOND_GOLD],
      ["1", DIAMOND_RED]
    ]) {
      grad.appendChild(el("stop", { offset, "stop-color": color }));
    }
    defs.appendChild(grad);
    const diagonal = SQUARE * Math.SQRT2 / 2;
    const diamond = el("g", {
      transform: `translate(${DIAMOND_CX} ${DIAMOND_CY}) scale(${(DIAMOND_RX / diagonal).toFixed(5)} ${(DIAMOND_RY / diagonal).toFixed(5)}) rotate(45)`,
      opacity: 0
    });
    screen1.appendChild(diamond);
    const half = SQUARE / 2;
    diamond.appendChild(
      el("rect", { x: -half, y: -half, width: SQUARE, height: SQUARE, fill: "url(#ps1-diamond)" })
    );
    const triOne = el("polygon", {
      points: `${-half},${-half} ${-half},${half} ${half},${half}`,
      fill: "url(#ps1-diamond)",
      opacity: 0
    });
    const triTwo = el("polygon", {
      points: `${-half},${-half} ${half},${-half} ${half},${half}`,
      fill: "url(#ps1-diamond)",
      opacity: 0
    });
    diamond.append(triOne, triTwo);
    const s1Text = el("g", { opacity: 0, fill: S1_INK });
    screen1.appendChild(s1Text);
    const s1Line = (cls, y, len, content, x = 320) => {
      const node = el("text", {
        class: cls,
        x,
        y,
        "text-anchor": "middle",
        textLength: len,
        lengthAdjust: "spacingAndGlyphs"
      });
      node.textContent = content;
      return node;
    };
    const sony = s1Line("teevy-ps1intro__sony", 100, 239, "SONY");
    const computer = s1Line("teevy-ps1intro__ce", 414, 239, "COMPUTER");
    const entertainment = s1Line("teevy-ps1intro__ce teevy-ps1intro__ce--small", 438, 239, "ENTERTAINMENT");
    const s1Tm = s1Line("teevy-ps1intro__tm", 369, 24, "TM", 351.5);
    s1Text.append(sony, computer, entertainment, s1Tm);
    const screen2 = el("g", { opacity: 0 });
    svg.appendChild(screen2);
    screen2.appendChild(el("rect", { x: -4 * VIEW_W, y: -4 * VIEW_H, width: 9 * VIEW_W, height: 9 * VIEW_H, fill: "#000" }));
    const logo = el("g", { opacity: 0 });
    screen2.appendChild(logo);
    const placed = (tr, dx = 0, dy = 0) => el("g", {
      transform: `translate(${tr.ox + dx} ${tr.oy + dy}) scale(${tr.sx} ${tr.sy}) ` + LOGO_ORIGIN
    });
    const ribbonParts = [
      [LOGO_BLUE, PS_BLUE, PS_BLUE_DARK],
      [LOGO_TEAL, PS_TEAL, PS_TEAL_DARK],
      [LOGO_YELLOW, PS_YELLOW, PS_YELLOW_DARK]
    ];
    const ribDark = placed(RIB_TR, 0, RIB_DEPTH_Y);
    for (const [d, , dark] of ribbonParts)
      ribDark.appendChild(el("path", { d, fill: dark, "fill-rule": "evenodd" }));
    const ribFace = placed(RIB_TR);
    for (const [d, face] of ribbonParts)
      ribFace.appendChild(el("path", { d, fill: face, "fill-rule": "evenodd" }));
    const pDark = placed(P_TR, P_DEPTH_X, P_DEPTH_Y);
    pDark.appendChild(el("path", { d: LOGO_P, fill: PS_RED_DARK, "fill-rule": "evenodd" }));
    const pFace = placed(P_TR);
    pFace.appendChild(el("path", { d: LOGO_P, fill: PS_RED, "fill-rule": "evenodd" }));
    logo.append(ribDark, ribFace, pDark, pFace);
    const s2Word = el("g", { opacity: 0 });
    const s2Legal = el("g", { opacity: 0 });
    screen2.append(s2Word, s2Legal);
    const word = el("g", {
      fill: S2_WORD,
      transform: `translate(${WORD_TR.ox} ${WORD_TR.oy}) scale(${WORD_TR.k} ${-WORD_TR.k})`
    });
    for (const [d, tx, ty] of WORD_GLYPHS)
      word.appendChild(el("path", { d, transform: `translate(${tx} ${ty})` }));
    s2Word.appendChild(word);
    const LEGAL_SQUEEZE = 0.85;
    const s2Line = (x, y, len, content) => {
      const node = el("text", {
        class: "teevy-ps1intro__legal",
        x,
        y,
        fill: S2_LEGAL,
        "text-anchor": "middle",
        textLength: (len / LEGAL_SQUEEZE).toFixed(2),
        lengthAdjust: "spacing",
        transform: `translate(${x} 0) scale(${LEGAL_SQUEEZE} 1) translate(${-x} 0)`
      });
      node.textContent = content;
      return node;
    };
    const tm = (x, y, len, cls, fill) => {
      const node = el("text", {
        class: cls,
        x,
        y,
        fill,
        textLength: len,
        lengthAdjust: "spacingAndGlyphs"
      });
      node.textContent = "TM";
      return node;
    };
    s2Word.appendChild(tm(413, 300, 14, "teevy-ps1intro__tm2", S2_WORD));
    s2Legal.append(
      s2Line(325, 348, 123, "Licensed by"),
      s2Line(320.5, 368, 400, "Sony Computer Entertainment America"),
      s2Line(320.5, 408, 60, "SCEA"),
      tm(356, 408, 16, "teevy-ps1intro__tm3", S2_LEGAL)
    );
    host.appendChild(svg);
    const apply = (t) => {
      const s1 = ramp(t, T_BG_IN, T_BG_FULL) * (1 - ramp(t, T_S1_FADE, T_S1_BLACK));
      screen1.setAttribute("opacity", s1.toFixed(3));
      const drawn = t < T_S1_CLEAR ? 1 : 0;
      diamond.setAttribute(
        "opacity",
        (ramp(t, T_DIAMOND, T_DIAMOND_FULL) * drawn).toFixed(3)
      );
      const u = ramp(t, T_SPLIT, T_SPLIT_END);
      const k = u * u * (3 - 2 * u);
      const scale = 1 + (TRI_SCALE - 1) * k;
      const dx = TRI_DX * k;
      const dy = TRI_DY * k;
      triOne.setAttribute("transform", `scale(${scale.toFixed(4)}) translate(${-dx} ${-dy})`);
      triTwo.setAttribute("transform", `scale(${scale.toFixed(4)}) translate(${dx} ${dy})`);
      const halves = k > 0 ? "1" : "0";
      triOne.setAttribute("opacity", halves);
      triTwo.setAttribute("opacity", halves);
      s1Text.setAttribute("opacity", (ramp(t, T_S1_TEXT, T_S1_TEXT_FULL) * drawn).toFixed(3));
      const live = t < T_CUT ? 1 : 0;
      screen2.setAttribute("opacity", (ramp(t, T_S1_BLACK, T_S2_IN) * live).toFixed(3));
      logo.setAttribute("opacity", ramp(t, T_S2_IN, T_S2_LOGO_FULL).toFixed(3));
      s2Word.setAttribute("opacity", ramp(t, T_S2_WORD, T_S2_WORD_FULL).toFixed(3));
      s2Legal.setAttribute("opacity", ramp(t, T_S2_LEGAL, T_S2_LEGAL_FULL).toFixed(3));
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
  return <div className="teevy-ps1intro" ref={hostRef} aria-hidden="true" />;
}
export {
  Ps1Intro
};
