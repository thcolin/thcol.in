const JACKPOT_STAKE_W = 30;
const REEL_COUNT = 7;
const HINT_TOP_FRACTION = 1 / 3;
const REEL_STEP_MS = 167;
const GLIDE_MIN_MS = 170;
const GLIDE_ENABLED = false;
const JACKPOT_GLIDE_SPAN_MS = [56, 64, 74, 85, 97, 111, 127, 144];
function jackpotGlideSpanMs(unlocks) {
  if (typeof unlocks !== "number" || !Number.isFinite(unlocks) || unlocks <= 0) return JACKPOT_GLIDE_SPAN_MS[0];
  const index = Math.min(Math.floor(unlocks), JACKPOT_GLIDE_SPAN_MS.length - 1);
  return JACKPOT_GLIDE_SPAN_MS[index];
}
const GLIDE_DECEL_K = 0;
const JACKPOT_TIERS = [
  { minRepaired: 7, wattsW: 500 },
  { minRepaired: 6, wattsW: 200 },
  { minRepaired: 5, wattsW: 80 },
  { minRepaired: 4, wattsW: 30 },
  { minRepaired: 3, wattsW: 10 },
  { minRepaired: 2, wattsW: 3 }
];
const BLIND_REPAIRED_TAIL = [
  1,
  0.6600833229,
  0.2635138663,
  0.065229138,
  0.0101500468,
  9701983e-10,
  522134e-10,
  12143e-10
];
const EV_BLIND_W = 1.5052863;
const RTP_BLIND = EV_BLIND_W / JACKPOT_STAKE_W;
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function openJackpot(reserveW, unlocks, seed, nowMs) {
  if (typeof seed !== "string" || !seed.trim()) return { ok: false, reason: "graine" };
  if (typeof nowMs !== "number" || !Number.isFinite(nowMs)) return { ok: false, reason: "horloge" };
  const covered = typeof reserveW === "number" && Number.isFinite(reserveW) && reserveW >= JACKPOT_STAKE_W;
  const glideSpanMs = jackpotGlideSpanMs(unlocks);
  const glideMs = [];
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    glideMs.push(GLIDE_ENABLED ? GLIDE_MIN_MS + mulberry32(fnv1a(`${seed}|rouleau|${reel}`))() * glideSpanMs : 0);
  }
  const startPhase = Math.floor(mulberry32(fnv1a(`${seed}|cassure`))() * REEL_COUNT) % REEL_COUNT;
  return {
    ok: true,
    stakeW: covered ? JACKPOT_STAKE_W : 0,
    game: {
      seed,
      startedMs: nowMs,
      startPhase,
      glideSpanMs,
      glideMs,
      pressedMs: new Array(REEL_COUNT).fill(null),
      phase: new Array(REEL_COUNT).fill(null),
      status: "roule"
    }
  };
}
function barColor(reel, phase) {
  return ((reel - phase) % REEL_COUNT + REEL_COUNT) % REEL_COUNT;
}
function rollingCells(game, elapsedMs) {
  return game.startPhase + Math.max(0, elapsedMs) / REEL_STEP_MS;
}
function phaseOf(cells) {
  return (Math.floor(cells) % REEL_COUNT + REEL_COUNT) % REEL_COUNT;
}
function decelEase(u) {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) * (1 - t);
}
function restCellsOf(game, reel, pressedMs) {
  return Math.floor(rollingCells(game, pressedMs - game.startedMs + game.glideMs[reel]));
}
function brakeOf(game, reel) {
  const pressed = game.pressedMs[reel];
  if (pressed === null) return null;
  const from = rollingCells(game, pressed - game.startedMs);
  const to = restCellsOf(game, reel, pressed);
  return { from, to, pressed, durationMs: GLIDE_DECEL_K * (to - from) * REEL_STEP_MS };
}
function restsAtMs(game, reel) {
  const brake = brakeOf(game, reel);
  return brake === null ? null : brake.pressed + brake.durationMs;
}
function reelAt(game, reel, nowMs) {
  const brake = brakeOf(game, reel);
  if (brake === null || nowMs < brake.pressed) {
    const cells2 = rollingCells(game, nowMs - game.startedMs);
    const phase2 = phaseOf(cells2);
    return { phase: phase2, cells: cells2, motion: "tourne", repaired: phase2 === 0 };
  }
  if (brake.durationMs <= 0) {
    const phase2 = phaseOf(brake.to);
    return { phase: phase2, cells: brake.to, motion: "pos\xE9", repaired: phase2 === 0 };
  }
  const u = (nowMs - brake.pressed) / brake.durationMs;
  if (u >= 1) {
    const phase2 = phaseOf(brake.to);
    return { phase: phase2, cells: brake.to, motion: "pos\xE9", repaired: phase2 === 0 };
  }
  const cells = brake.from + (brake.to - brake.from) * decelEase(u);
  const phase = phaseOf(cells);
  return { phase, cells, motion: "freine", repaired: phase === 0 };
}
function mireAt(game, nowMs) {
  const views = [];
  for (let reel = 0; reel < REEL_COUNT; reel++) views.push(reelAt(game, reel, nowMs));
  return views;
}
function nextReel(game) {
  if (game.status !== "roule") return null;
  for (let reel = 0; reel < REEL_COUNT; reel++) if (game.pressedMs[reel] === null) return reel;
  return null;
}
function stopNext(game, nowMs) {
  const reel = nextReel(game);
  if (reel === null) return game;
  if (typeof nowMs !== "number" || !Number.isFinite(nowMs)) return game;
  const previous = reel === 0 ? game.startedMs : game.pressedMs[reel - 1] ?? game.startedMs;
  const pressed = Math.max(previous, nowMs);
  const pressedMs = [...game.pressedMs];
  const phase = [...game.phase];
  pressedMs[reel] = pressed;
  phase[reel] = phaseOf(restCellsOf(game, reel, pressed));
  return { ...game, pressedMs, phase, status: reel === REEL_COUNT - 1 ? "r\xE9gl\xE9" : "roule" };
}
function abandonJackpot(game) {
  if (game.status !== "roule") return game;
  return { ...game, status: "abandonn\xE9" };
}
function repairedCount(phases) {
  let count = 0;
  for (const phase of phases) if (phase === 0) count++;
  return count;
}
function jackpotPayoutFor(repaired) {
  for (const tier of JACKPOT_TIERS) if (repaired >= tier.minRepaired) return tier.wattsW;
  return 0;
}
function outcome(game) {
  if (game.status !== "r\xE9gl\xE9") return null;
  const phases = [];
  for (const phase of game.phase) {
    if (phase === null) return null;
    phases.push(phase);
  }
  const repaired = repairedCount(phases);
  return { repaired, wattsW: jackpotPayoutFor(repaired), perfect: repaired === REEL_COUNT };
}
export {
  BLIND_REPAIRED_TAIL,
  EV_BLIND_W,
  GLIDE_DECEL_K,
  GLIDE_ENABLED,
  GLIDE_MIN_MS,
  HINT_TOP_FRACTION,
  JACKPOT_GLIDE_SPAN_MS,
  JACKPOT_STAKE_W,
  JACKPOT_TIERS,
  REEL_COUNT,
  REEL_STEP_MS,
  RTP_BLIND,
  abandonJackpot,
  barColor,
  jackpotGlideSpanMs,
  jackpotPayoutFor,
  mireAt,
  nextReel,
  openJackpot,
  outcome,
  reelAt,
  repairedCount,
  restsAtMs,
  stopNext
};
