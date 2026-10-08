import {
  BATTERY_0,
  BATTERY_1,
  BATTERY_2,
  BATTERY_3,
  BATTERY_CHARGING,
  FACE_ANGRY,
  FACE_FROWN,
  FACE_GRINNING,
  FACE_GROSSED,
  FACE_HAPPY,
  FACE_LAUGHING,
  FACE_NEUTRAL,
  FACE_SAD,
  FACE_SMILING,
  SIGNAL_1,
  SIGNAL_2,
  SIGNAL_3,
  SIGNAL_4,
  SIGNAL_NONE
} from "./pack-icons.js";
const STATUS_ROWS = 16;
const METER_SEGMENTS = 10;
const WATT_DIGITS = 5;
const GHOST_ALPHA = 0.3;
const DIGIT_W = 5;
const DIGIT_H = 9;
const DIGIT_GAP = 1;
const BLOCK_GAP = 6;
const COUNTER_Y = Math.floor((STATUS_ROWS - DIGIT_H) / 2);
const COUNTER_W = WATT_DIGITS * DIGIT_W + (WATT_DIGITS - 1) * DIGIT_GAP;
const UNIT_SIDE = 5;
const UNIT_GAP = 1;
const PICTO_GAP = 5;
const COUNTER_BLOCK_W = COUNTER_W + UNIT_GAP + UNIT_SIDE;
const UNIT_Y = COUNTER_Y + DIGIT_H - UNIT_SIDE;
const SEG_W = 2;
const SEG_GAP = 1;
const BAR_W = METER_SEGMENTS * SEG_W + (METER_SEGMENTS - 1) * SEG_GAP;
const BAR_H = DIGIT_H;
const BAR_Y = COUNTER_Y;
function inkBox(rows) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  });
  if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const BATTERY_INK = inkBox(BATTERY_3);
const FACE_INK = inkBox(FACE_NEUTRAL);
const SIGNAL_INK = inkBox(SIGNAL_4);
const spriteY = (ink) => Math.floor((STATUS_ROWS - ink.h) / 2);
const SIGNAL_X = 0;
const GAUGE_GAP = 12;
const ALIM_OFF = 0;
const ALIM_BAR_OFF = ALIM_OFF + BATTERY_INK.w + PICTO_GAP;
const MORAL_OFF = ALIM_BAR_OFF + BAR_W + GAUGE_GAP;
const MORAL_BAR_OFF = MORAL_OFF + FACE_INK.w + PICTO_GAP;
const GAUGES_W = MORAL_BAR_OFF + BAR_W;
const gaugesX = () => SIGNAL_X + SIGNAL_INK.w + GAUGE_GAP;
const STATUS_LABELS = [
  { slot: "signal", word: "SIGNAL" },
  { slot: "food", key: "F", word: "FOOD" },
  { slot: "play", key: "P", word: "PLAY" },
  { slot: "watts", word: "WATTS" }
];
const statusLabelText = ({ key, word }) => key ? `[${key}] ${word}` : word;
const LABEL_CELLS_PER_GLYPH = 2.42;
function statusLabelSlots(cols) {
  const gx = gaugesX();
  return {
    signal: { x: SIGNAL_X, w: SIGNAL_INK.w },
    food: { x: gx + ALIM_OFF, w: ALIM_BAR_OFF + BAR_W - ALIM_OFF },
    play: { x: gx + MORAL_OFF, w: MORAL_BAR_OFF + BAR_W - MORAL_OFF },
    watts: { x: cols - COUNTER_BLOCK_W, w: COUNTER_BLOCK_W }
  };
}
const STATUS_MIN_COLS = SIGNAL_INK.w + GAUGE_GAP + GAUGES_W + BLOCK_GAP + COUNTER_BLOCK_W;
const DIGIT_GLYPHS = [
  [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  [".###.", "#...#", "....#", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  [".###.", "#...#", "....#", "...#.", "..##.", "....#", "....#", "#...#", ".###."],
  ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#.", "...#.", "...#."],
  ["#####", "#....", "#....", "####.", "....#", "....#", "....#", "#...#", ".###."],
  ["..##.", ".#...", "#....", "#....", "####.", "#...#", "#...#", "#...#", ".###."],
  ["#####", "....#", "....#", "...#.", "...#.", "..#..", "..#..", ".#...", ".#..."],
  [".###.", "#...#", "#...#", "#...#", ".###.", "#...#", "#...#", "#...#", ".###."],
  [".###.", "#...#", "#...#", "#...#", ".####", "....#", "....#", "...#.", ".##.."]
];
const GHOST_DIGIT = DIGIT_GLYPHS[8];
const UNIT_W = [
  "#...#",
  "#...#",
  "#.#.#",
  "##.##",
  "#...#"
];
const BATTERY_LEVELS = [BATTERY_0, BATTERY_1, BATTERY_2, BATTERY_3];
const MORAL_FACES = [
  FACE_ANGRY,
  FACE_GROSSED,
  FACE_FROWN,
  FACE_SAD,
  FACE_NEUTRAL,
  FACE_SMILING,
  FACE_HAPPY,
  FACE_GRINNING,
  FACE_LAUGHING
];
function moralFace(value) {
  return MORAL_FACES[Math.round(clamp01(value) * (MORAL_FACES.length - 1))];
}
const BATTERY_GHOST = BATTERY_3;
function subtract(a, b) {
  return a.map((row, y) => [...row].map((c, x) => c === "#" && b[y]?.[x] !== "#" ? "#" : ".").join(""));
}
function intersect(sprites) {
  const [first, ...rest] = sprites;
  return first.map(
    (row, y) => [...row].map((c, x) => c === "#" && rest.every((o) => o[y]?.[x] === "#") ? "#" : ".").join("")
  );
}
const SIGNAL_BASE = intersect([SIGNAL_NONE, SIGNAL_1, SIGNAL_2, SIGNAL_3, SIGNAL_4]);
const SIGNAL_STEPS = [SIGNAL_BASE, SIGNAL_1, SIGNAL_2, SIGNAL_3, SIGNAL_4];
const SIGNAL_LIT = SIGNAL_STEPS.map((step) => subtract(step, SIGNAL_BASE));
const BLINK_PATTERNS = {
  left: [
    { bars: 0, ms: 3630 },
    { bars: 1, ms: 70 },
    { bars: 2, ms: 80 },
    { bars: 1, ms: 60 },
    { bars: 0, ms: 120 },
    { bars: 2, ms: 70 }
  ],
  mad: [
    { bars: 2, ms: 320 },
    { bars: 0, ms: 160 },
    { bars: 2, ms: 200 },
    { bars: 0, ms: 140 },
    { bars: 1, ms: 100 },
    { bars: 2, ms: 260 },
    { bars: 0, ms: 380 },
    { bars: 2, ms: 160 },
    { bars: 0, ms: 220 },
    { bars: 2, ms: 120 },
    { bars: 0, ms: 280 }
  ],
  ok: [
    { bars: 2, ms: 1380 },
    { bars: 3, ms: 260 },
    { bars: 2, ms: 200 },
    { bars: 1, ms: 180 },
    { bars: 2, ms: 220 },
    { bars: 3, ms: 900 },
    { bars: 2, ms: 340 },
    { bars: 1, ms: 120 }
  ],
  likes: [
    { bars: 3, ms: 4800 },
    { bars: 2, ms: 180 },
    { bars: 3, ms: 1200 },
    { bars: 2, ms: 180 }
  ],
  loves: [
    { bars: 4, ms: 8800 },
    { bars: 3, ms: 260 }
  ]
};
const DEFAULT_BOND = "ok";
function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function wattDigits(value, count = WATT_DIGITS) {
  const max = 10 ** count - 1;
  const raw = Number.isFinite(value) ? Math.floor(value) : 0;
  const w = raw < 0 ? 0 : raw > max ? max : raw;
  const text = String(w).padStart(count, " ");
  return [...text].map((c) => c === " " ? null : Number(c));
}
function meterFill(value, segments = METER_SEGMENTS) {
  return Math.round(clamp01(value) * segments);
}
function batteryState(power, charging) {
  if (charging) return "charging";
  return Math.round(clamp01(power) * 3);
}
function blinkBars(bond, nowMs) {
  const pattern = BLINK_PATTERNS[bond] ?? BLINK_PATTERNS[DEFAULT_BOND];
  const period = pattern.reduce((total, frame) => total + frame.ms, 0);
  if (period <= 0) return pattern[0]?.bars ?? 0;
  let t = Number.isFinite(nowMs) ? (nowMs % period + period) % period : 0;
  for (const frame of pattern) {
    if (t < frame.ms) return frame.bars;
    t -= frame.ms;
  }
  return pattern[pattern.length - 1].bars;
}
function blinkHoldMs(bond, nowMs) {
  const pattern = BLINK_PATTERNS[bond] ?? BLINK_PATTERNS[DEFAULT_BOND];
  const period = pattern.reduce((total, frame) => total + frame.ms, 0);
  if (period <= 0) return 0;
  let t = Number.isFinite(nowMs) ? (nowMs % period + period) % period : 0;
  for (const frame of pattern) {
    if (t < frame.ms) return frame.ms - t;
    t -= frame.ms;
  }
  return 0;
}
function emptyOwners(cols) {
  return Array.from({ length: STATUS_ROWS }, () => Array.from({ length: cols }, () => null));
}
function fill(owners, x0, y0, x1, y1, piece, problems) {
  const cols = owners[0].length;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || x >= cols || y < 0 || y >= STATUS_ROWS) {
        problems.push(`${piece} : d\xE9borde la grille en (${x},${y})`);
        continue;
      }
      const owner = owners[y][x];
      if (owner !== null && owner !== piece) problems.push(`${piece} : recouvre ${owner} en (${x},${y})`);
      owners[y][x] = piece;
    }
  }
}
function stamp(owners, rows, x, y, piece, problems) {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] !== "#") continue;
      fill(owners, x + rx, y + ry, x + rx, y + ry, piece, problems);
    }
  });
}
function stampSprite(owners, rows, ink, x, y, piece, problems) {
  stamp(owners, rows, x - ink.x, y - ink.y, piece, problems);
}
function stampBar(owners, x, filled, piece, problems) {
  for (let i = 0; i < filled; i++) {
    const sx = x + i * (SEG_W + SEG_GAP);
    fill(owners, sx, BAR_Y, sx + SEG_W - 1, BAR_Y + BAR_H - 1, `${piece}/segment ${i}`, problems);
  }
}
function withDefaults(readout, options) {
  return {
    moral: options.moral ?? readout.needs.morale,
    bond: options.bond ?? DEFAULT_BOND,
    nowMs: options.nowMs ?? 0
  };
}
function paint(readout, charging, options, lit, cols, problems) {
  const owners = emptyOwners(cols);
  const counterX = cols - COUNTER_BLOCK_W;
  const unitX = counterX + COUNTER_W + UNIT_GAP;
  const digits = wattDigits(readout.wattsW);
  digits.forEach((d, i) => {
    const x = counterX + i * (DIGIT_W + DIGIT_GAP);
    const glyph = d === null ? lit ? null : GHOST_DIGIT : DIGIT_GLYPHS[d];
    if (glyph) stamp(owners, glyph, x, COUNTER_Y, `chiffre ${i}`, problems);
  });
  stamp(owners, UNIT_W, unitX, UNIT_Y, "unit\xE9", problems);
  const battery = batteryState(readout.needs.power, charging);
  const batteryRows = lit ? battery === "charging" ? BATTERY_CHARGING : BATTERY_LEVELS[battery] : BATTERY_GHOST;
  const gx = gaugesX();
  stampSprite(owners, batteryRows, BATTERY_INK, gx + ALIM_OFF, spriteY(BATTERY_INK), "pile", problems);
  stampBar(owners, gx + ALIM_BAR_OFF, lit ? meterFill(readout.needs.power) : METER_SEGMENTS, "alim", problems);
  const face = moralFace(options.moral);
  stampSprite(owners, face, FACE_INK, gx + MORAL_OFF, spriteY(FACE_INK), "visage", problems);
  stampBar(owners, gx + MORAL_BAR_OFF, lit ? meterFill(options.moral) : METER_SEGMENTS, "moral", problems);
  const bars = blinkBars(options.bond, options.nowMs);
  const signalRows = lit ? SIGNAL_LIT[bars] : SIGNAL_STEPS[bars];
  stampSprite(owners, signalRows, SIGNAL_INK, SIGNAL_X, spriteY(SIGNAL_INK), "signal", problems);
  return owners;
}
function composeStatusLine(readout, charging = false, cols = STATUS_MIN_COLS, options = {}) {
  const ignored = [];
  const width = Number.isFinite(cols) ? Math.max(STATUS_MIN_COLS, Math.floor(cols)) : STATUS_MIN_COLS;
  const opts = withDefaults(readout, options);
  const on = paint(readout, charging, opts, true, width, ignored);
  const all = paint(readout, charging, opts, false, width, ignored);
  return {
    rows: on.map((row) => row.map((cell) => cell === null ? "0" : "1").join("")),
    ghost: all.map((row, y) => row.map((cell, x) => cell !== null && on[y][x] === null ? "1" : "0").join(""))
  };
}
function validateStatusLine(readout, charging = false, cols = STATUS_MIN_COLS, options = {}) {
  const problems = [];
  const width = Number.isFinite(cols) ? Math.max(STATUS_MIN_COLS, Math.floor(cols)) : STATUS_MIN_COLS;
  const opts = withDefaults(readout, options);
  const on = paint(readout, charging, opts, true, width, problems);
  const all = paint(readout, charging, opts, false, width, problems);
  for (let y = 0; y < STATUS_ROWS; y++) {
    for (let x = 0; x < width; x++) {
      if (on[y][x] === null || all[y][x] !== null) continue;
      if (on[y][x] === "pile") continue;
      problems.push(`fant\xF4me incomplet : (${x},${y}) est allum\xE9 sans emplacement`);
    }
  }
  return problems;
}
export {
  BLINK_PATTERNS,
  DEFAULT_BOND,
  DIGIT_GLYPHS,
  GHOST_ALPHA,
  GHOST_DIGIT,
  LABEL_CELLS_PER_GLYPH,
  METER_SEGMENTS,
  STATUS_LABELS,
  STATUS_MIN_COLS,
  STATUS_ROWS,
  WATT_DIGITS,
  batteryState,
  blinkBars,
  blinkHoldMs,
  composeStatusLine,
  meterFill,
  moralFace,
  statusLabelSlots,
  statusLabelText,
  validateStatusLine,
  wattDigits
};
