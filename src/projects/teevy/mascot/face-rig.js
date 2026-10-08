const FACE_GRID = 18;
const WIN_X = 1;
const WIN_Y = 3;
const WIN_W = 16;
const WIN_H = 12;
const AXIS = 7;
const FACE_INK_MIN = 12;
const FACE_INK_MAX = 28;
const PARTICLE_INK_MAX = 12;
const EYE_ANCHOR = { x: 3, y: 3 };
const EYE_GLYPHS = {
  bar2: { dx: 0, dy: 0, rows: ["#", "#"] },
  bar3: { dx: 0, dy: 0, rows: ["#", "#", "#"] },
  dot: { dx: 0, dy: 0, rows: ["#"] },
  closed: { dx: 0, dy: 1, rows: ["##"] },
  happy: { dx: -1, dy: 0, rows: [".#.", "#.#"] },
  x: { dx: -1, dy: -1, rows: ["#.#", ".#.", "#.#"] },
  wide: { dx: 0, dy: 0, rows: ["##", "##"] }
};
const NOSE_ANCHOR = { x: 7, y: 3 };
const NOSE_FOOT_Y = 7;
const NOSE_GLYPHS = {
  L: { dx: -1, dy: 0, rows: [".#", ".#", ".#", ".#", "##"] },
  V: { dx: -2, dy: 3, rows: ["#..#", ".##."] }
};
const MOUTH_ANCHOR = { x: AXIS, y: NOSE_FOOT_Y + 3 };
const MOUTH_GLYPHS = {
  smile: { dx: -3, dy: 0, rows: ["#....#", ".####."] },
  grin: { dx: -4, dy: 0, rows: ["#......#", ".######."] },
  flat: { dx: -2, dy: 1, rows: ["####"] },
  pout: { dx: -2, dy: 0, rows: [".##.", "#..#"] },
  sadmac: { dx: -4, dy: -1, rows: [".######...", "#......##.", ".........#"] },
  o: { dx: -1, dy: 0, rows: ["##", "##"] },
  open: { dx: -2, dy: -1, rows: [".##.", "#..#", ".##."] },
  wavy: { dx: -3, dy: 0, rows: [".#..#.", "#.##.#"] }
};
const BROW_ANCHOR = { x: 3, y: 0 };
const BROW_GLYPHS = {
  none: null,
  worried: { dx: 0, dy: 0, rows: [".##", "#.."] },
  determined: { dx: 0, dy: 0, rows: ["#..", ".##"] }
};
const CHEEK_ANCHOR = { x: 2, y: 6 };
const CHEEK_GLYPH = { dx: 0, dy: 0, rows: ["#"] };
const PARTICLE_GLYPHS = {
  music: {
    x: 14,
    y: 0,
    rows: ["..##", "..#.", "..#.", "..#.", "###.", "###."]
  },
  zzz: {
    x: 14,
    y: 0,
    rows: ["...#", "....", "####", "..#.", ".#..", "####"]
  },
  heart: {
    x: 0,
    y: 0,
    rows: [".#.#.", "#####", ".###.", "..#.."]
  },
  drop: {
    x: 0,
    y: 6,
    rows: [".#", "##", "##"]
  },
  spark: {
    x: 0,
    y: 10,
    rows: [".#.", "###", ".#."]
  },
  question: {
    x: 6,
    y: 0,
    rows: [".##.", "#..#", "..#.", "....", "..#."]
  },
  bang: {
    x: 8,
    y: 0,
    rows: ["#", "#", "#", ".", "#"]
  }
};
function emptyOwners() {
  return Array.from({ length: FACE_GRID }, () => Array.from({ length: FACE_GRID }, () => null));
}
function mirrorX(x) {
  return 2 * AXIS - x;
}
function mirrorOrigin(x0, w) {
  return mirrorX(x0 + w - 1);
}
function mirrorRows(rows) {
  return rows.map((row) => [...row].reverse().join(""));
}
function glyphWidth(rows) {
  return rows.reduce((max, row) => Math.max(max, row.length), 0);
}
function stampGrid(owners, rows, gx, gy, owner, clashes) {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] !== "#") continue;
      const x = gx + rx;
      const y = gy + ry;
      if (x < 0 || x >= FACE_GRID || y < 0 || y >= FACE_GRID) {
        clashes.push(`\xAB ${owner} \xBB d\xE9borde de la grille en (${x},${y})`);
        continue;
      }
      const prev = owners[y][x];
      if (prev !== null && prev !== owner) {
        clashes.push(`chevauchement : \xAB ${prev} \xBB et \xAB ${owner} \xBB partagent (${x},${y})`);
      }
      owners[y][x] = owner;
    }
  });
}
function stampWindow(owners, rows, wx, wy, owner, clashes) {
  stampGrid(owners, rows, WIN_X + wx, WIN_Y + wy, owner, clashes);
}
function stampPair(owners, glyph, anchor, owner, shift, clashes) {
  const x0 = anchor.x + glyph.dx;
  const y0 = anchor.y + glyph.dy;
  const w = glyphWidth(glyph.rows);
  stampWindow(owners, glyph.rows, x0 + shift, y0, owner, clashes);
  stampWindow(owners, mirrorRows(glyph.rows), mirrorOrigin(x0, w) + shift, y0, owner, clashes);
}
function paintFace(p, clashes) {
  const owners = emptyOwners();
  const brow = BROW_GLYPHS[p.brows];
  if (brow) stampPair(owners, brow, BROW_ANCHOR, "sourcils", 0, clashes);
  stampPair(owners, EYE_GLYPHS[p.eyes], EYE_ANCHOR, "yeux", p.gaze, clashes);
  if (p.cheeks) stampPair(owners, CHEEK_GLYPH, CHEEK_ANCHOR, "joues", p.gaze, clashes);
  const nose = NOSE_GLYPHS[p.nose];
  stampWindow(
    owners,
    nose.rows,
    NOSE_ANCHOR.x + nose.dx,
    NOSE_ANCHOR.y + nose.dy,
    "nez",
    clashes
  );
  const mouth = MOUTH_GLYPHS[p.mouth];
  stampWindow(
    owners,
    mouth.rows,
    MOUTH_ANCHOR.x + mouth.dx,
    MOUTH_ANCHOR.y + mouth.dy,
    "bouche",
    clashes
  );
  return owners;
}
function paintParticles(particles, clashes) {
  const owners = emptyOwners();
  for (const type of particles) {
    const glyph = PARTICLE_GLYPHS[type];
    if (!glyph) continue;
    stampGrid(owners, glyph.rows, glyph.x, glyph.y, `particule ${type}`, clashes);
  }
  return owners;
}
function countInk(owners) {
  return owners.reduce(
    (total, row) => total + row.reduce((n, cell) => cell === null ? n : n + 1, 0),
    0
  );
}
function composeFace(p) {
  const ignored = [];
  const face = paintFace(p, ignored);
  const parts = paintParticles(p.particles, ignored);
  return face.map(
    (row, y) => row.map((cell, x) => cell !== null || parts[y][x] !== null ? "1" : "0").join("")
  );
}
function validateFace(p) {
  const problems = [];
  const face = paintFace(p, problems);
  const parts = paintParticles(p.particles, problems);
  const faceInk = countInk(face);
  if (faceInk < FACE_INK_MIN || faceInk > FACE_INK_MAX) {
    problems.push(
      `encre du visage hors budget : ${faceInk} px (canon ${FACE_INK_MIN}..${FACE_INK_MAX})`
    );
  }
  const partInk = countInk(parts);
  if (partInk > PARTICLE_INK_MAX) {
    problems.push(`encre des particules hors budget : ${partInk} px (max ${PARTICLE_INK_MAX})`);
  }
  const merged = emptyOwners();
  for (let y = 0; y < FACE_GRID; y++) {
    for (let x = 0; x < FACE_GRID; x++) {
      const f = face[y][x];
      const q = parts[y][x];
      if (f !== null && q !== null) problems.push(`\xAB ${q} \xBB en collision avec \xAB ${f} \xBB en (${x},${y})`);
      merged[y][x] = f ?? q;
    }
  }
  for (let y = 0; y < FACE_GRID; y++) {
    for (let x = 0; x < FACE_GRID; x++) {
      const here = merged[y][x];
      if (here === null) continue;
      const right = x + 1 < FACE_GRID ? merged[y][x + 1] : null;
      const down = y + 1 < FACE_GRID ? merged[y + 1][x] : null;
      if (right !== null && right !== here) {
        problems.push(`\xAB ${here} \xBB et \xAB ${right} \xBB se touchent en (${x},${y}) \u2014 1 px de blanc exig\xE9`);
      }
      if (down !== null && down !== here) {
        problems.push(`\xAB ${here} \xBB et \xAB ${down} \xBB se touchent en (${x},${y}) \u2014 1 px de blanc exig\xE9`);
      }
    }
  }
  if (p.mouth !== "sadmac") {
    for (let wy = 0; wy < WIN_H; wy++) {
      const cols = [];
      for (let wx = 0; wx < WIN_W; wx++) {
        if (face[WIN_Y + wy][WIN_X + wx] !== null) cols.push(wx);
      }
      if (cols.length === 0) continue;
      const mid = (Math.min(...cols) + Math.max(...cols)) / 2;
      if (Math.abs(mid - AXIS) > 1) {
        problems.push(`sym\xE9trie : rang\xE9e ${wy} centr\xE9e sur x=${mid} au lieu de l'axe x=${AXIS}`);
      }
      const left = cols.filter((x) => x < AXIS).length;
      const right = cols.filter((x) => x > AXIS).length;
      if (Math.abs(left - right) > 1) {
        problems.push(`sym\xE9trie : rang\xE9e ${wy} d\xE9s\xE9quilibr\xE9e (${left} px \xE0 gauche, ${right} \xE0 droite)`);
      }
    }
  }
  return problems;
}
const STAGE_GLYPHS = {
  newborn: { eyes: ["bar2", "closed", "wide"], mouths: ["smile", "flat", "o"] },
  child: {
    eyes: ["bar2", "closed", "wide", "bar3", "dot"],
    mouths: ["smile", "flat", "o", "grin", "pout"]
  },
  teen: {
    eyes: ["bar2", "closed", "wide", "bar3", "dot", "happy"],
    mouths: ["smile", "flat", "o", "grin", "pout", "open", "wavy"]
  },
  adult: {
    eyes: ["bar2", "closed", "wide", "bar3", "dot", "happy", "x"],
    mouths: ["smile", "flat", "o", "grin", "pout", "open", "wavy", "sadmac"]
  },
  senior: {
    eyes: ["bar2", "closed", "wide", "bar3", "dot", "happy", "x"],
    mouths: ["smile", "flat", "o", "grin", "pout", "open", "wavy", "sadmac"]
  }
};
const STAGE_RANK = {
  newborn: 0,
  child: 1,
  teen: 2,
  adult: 3,
  senior: 4
};
const SLEEP_AROUSAL = 0.15;
const SURPRISE_AROUSAL = 0.82;
const ALERT_AROUSAL = 0.66;
const EYE_LADDER = ["dot", "bar2", "bar3", "wide"];
const EYE_THRESHOLDS = [0.38, ALERT_AROUSAL, SURPRISE_AROUSAL];
const MOUTH_LADDER = ["pout", "flat", "smile", "grin"];
const MOUTH_THRESHOLDS = [-0.45, -0.15, 0.7];
function clamp(v, lo, hi) {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}
function ladderIndex(value, thresholds) {
  let i = 0;
  while (i < thresholds.length && value >= thresholds[i]) i++;
  return i;
}
function nearestAllowed(ladder, idx, allowed) {
  for (let d = 0; d < ladder.length; d++) {
    const lower = ladder[idx - d];
    if (lower !== void 0 && allowed.includes(lower)) return lower;
    const higher = ladder[idx + d];
    if (higher !== void 0 && allowed.includes(higher)) return higher;
  }
  return ladder[0];
}
function firstAllowed(wanted, allowed) {
  for (const g of wanted) if (allowed.includes(g)) return g;
  return null;
}
function resolveGaze(offset, attention) {
  if (attention === "left") return offset > 0 ? 0 : offset;
  if (attention === "right") return offset < 0 ? 0 : offset;
  return offset;
}
function fitParticles(wanted, face) {
  const kept = [];
  const layer = emptyOwners();
  let ink = 0;
  for (const type of wanted) {
    if (kept.includes(type)) continue;
    const glyph = PARTICLE_GLYPHS[type];
    if (!glyph) continue;
    const cells = [];
    glyph.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === "#") cells.push([glyph.x + rx, glyph.y + ry]);
      }
    });
    if (ink + cells.length > PARTICLE_INK_MAX) continue;
    const blocked = cells.some(([x, y]) => {
      if (x < 0 || x >= FACE_GRID || y < 0 || y >= FACE_GRID) return true;
      const around = [
        [x, y],
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      ];
      return around.some(([nx, ny]) => {
        if (nx < 0 || nx >= FACE_GRID || ny < 0 || ny >= FACE_GRID) return false;
        return face[ny][nx] !== null || layer[ny][nx] !== null;
      });
    });
    if (blocked) continue;
    for (const [x, y] of cells) layer[y][x] = type;
    ink += cells.length;
    kept.push(type);
  }
  return kept;
}
function faceParamsFrom(state, opts) {
  const allowed = STAGE_GLYPHS[state.stage] ?? STAGE_GLYPHS.adult;
  if (state.override === "sad-mac") {
    return {
      eyes: "x",
      mouth: "sadmac",
      nose: "V",
      gaze: 0,
      brows: "none",
      cheeks: false,
      particles: []
    };
  }
  const valence = clamp(state.valence, -1, 1);
  const arousal = clamp(state.arousal, 0, 1);
  if (state.override === "sleep" || arousal < SLEEP_AROUSAL) {
    return {
      eyes: "closed",
      mouth: "flat",
      nose: "L",
      gaze: 0,
      brows: "none",
      cheeks: false,
      particles: ["zzz"]
    };
  }
  let eyes = nearestAllowed(EYE_LADDER, ladderIndex(arousal, EYE_THRESHOLDS), allowed.eyes);
  if (valence >= 0.8 && allowed.eyes.includes("happy")) eyes = "happy";
  if (opts.blink) eyes = "closed";
  let mouth = nearestAllowed(MOUTH_LADDER, ladderIndex(valence, MOUTH_THRESHOLDS), allowed.mouths);
  if (arousal >= SURPRISE_AROUSAL) {
    mouth = firstAllowed(valence >= 0 ? ["open", "o"] : ["o", "open"], allowed.mouths) ?? mouth;
  } else if (valence <= -0.55 && arousal < 0.5) {
    mouth = firstAllowed(["wavy"], allowed.mouths) ?? mouth;
  }
  const rank = STAGE_RANK[state.stage] ?? STAGE_RANK.adult;
  let brows = "none";
  if (rank >= STAGE_RANK.teen) {
    if (valence <= -0.35) brows = "worried";
    else if (valence >= 0.2 && arousal >= ALERT_AROUSAL) brows = "determined";
  }
  const cheeks = rank >= STAGE_RANK.child && valence >= 0.55 && mouth !== "open";
  const gaze = resolveGaze(opts.gazeOffset, state.attention);
  const params = {
    eyes,
    mouth,
    nose: "L",
    gaze,
    brows,
    cheeks,
    particles: []
  };
  params.particles = fitParticles(state.particles, paintFace(params, []));
  return params;
}
const DEBUG_EXPRESSIONS = [
  {
    name: "heureux",
    params: { eyes: "bar2", mouth: "smile", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: [] }
  },
  {
    name: "ravi",
    params: { eyes: "happy", mouth: "grin", nose: "L", gaze: 0, brows: "none", cheeks: true, particles: [] }
  },
  {
    name: "neutre",
    params: { eyes: "bar2", mouth: "flat", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: [] }
  },
  {
    name: "boudeur",
    params: { eyes: "dot", mouth: "pout", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: [] }
  },
  {
    name: "surpris",
    params: { eyes: "wide", mouth: "o", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: ["bang"] }
  },
  {
    name: "endormi",
    params: { eyes: "closed", mouth: "flat", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: ["zzz"] }
  },
  {
    name: "curieux",
    params: { eyes: "bar3", mouth: "flat", nose: "L", gaze: -1, brows: "none", cheeks: false, particles: ["question"] }
  },
  {
    name: "espi\xE8gle",
    params: { eyes: "bar2", mouth: "grin", nose: "L", gaze: 1, brows: "none", cheeks: true, particles: [] }
  },
  {
    name: "inquiet",
    params: { eyes: "dot", mouth: "wavy", nose: "L", gaze: 0, brows: "worried", cheeks: false, particles: ["drop"] }
  },
  {
    name: "waouh",
    params: { eyes: "wide", mouth: "open", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: ["spark"] }
  },
  {
    name: "groove",
    params: { eyes: "bar2", mouth: "smile", nose: "L", gaze: 0, brows: "none", cheeks: false, particles: ["music"] }
  },
  {
    name: "aim\xE9",
    params: { eyes: "happy", mouth: "smile", nose: "L", gaze: 0, brows: "none", cheeks: true, particles: ["heart"] }
  },
  {
    name: "d\xE9termin\xE9",
    params: { eyes: "bar2", mouth: "flat", nose: "L", gaze: 0, brows: "determined", cheeks: false, particles: [] }
  },
  {
    name: "ennuy\xE9",
    params: { eyes: "dot", mouth: "flat", nose: "L", gaze: -1, brows: "none", cheeks: false, particles: [] }
  },
  {
    name: "gav\xE9",
    params: { eyes: "closed", mouth: "wavy", nose: "L", gaze: 0, brows: "none", cheeks: true, particles: [] }
  },
  {
    name: "sad-mac",
    params: { eyes: "x", mouth: "sadmac", nose: "V", gaze: 0, brows: "none", cheeks: false, particles: [] }
  }
];
export {
  DEBUG_EXPRESSIONS,
  FACE_GRID,
  STAGE_GLYPHS,
  composeFace,
  faceParamsFrom,
  validateFace
};
