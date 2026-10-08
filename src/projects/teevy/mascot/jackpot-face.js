import { REEL_COUNT } from "./jackpot-core.js";
function base(over = {}) {
  return {
    eyes: "bar2",
    mouth: "smile",
    nose: "L",
    gaze: 0,
    brows: "none",
    cheeks: false,
    particles: [],
    ...over
  };
}
const JACKPOT_REACTION_MS = 500;
function jackpotScoreSignature(score) {
  return `${score.posees}|${score.reparees}|${score.derniere === null ? "-" : score.derniere ? "o" : "n"}|${score.visee ?? "-"}|${score.fini ? "f" : "-"}`;
}
function jackpotGaze(visee) {
  if (visee === null) return 0;
  if (visee <= 1) return -1;
  return visee >= 5 ? 1 : 0;
}
function jackpotParfait(score) {
  return score.reparees >= REEL_COUNT;
}
function verdict(reparees) {
  if (reparees >= REEL_COUNT) return base({ eyes: "wide", mouth: "open", particles: ["spark"] });
  if (reparees >= 4) return base({ eyes: "happy", mouth: "grin", cheeks: true, particles: ["spark"] });
  if (reparees === 3) return base({ eyes: "bar2", mouth: "smile", cheeks: true });
  if (reparees === 2) return base({ eyes: "bar2", mouth: "flat" });
  return base({ eyes: "dot", mouth: "pout", brows: "worried", particles: ["drop"] });
}
function reaction(score, possible) {
  const gaze = jackpotGaze(score.visee);
  if (score.derniere === true) {
    const parfait = score.reparees === score.posees;
    return base({ eyes: "happy", mouth: "grin", cheeks: true, gaze, particles: parfait ? ["spark"] : [] });
  }
  if (possible <= 1) return base({ eyes: "dot", mouth: "pout", brows: "worried", gaze, particles: ["drop"] });
  return base({ eyes: "dot", mouth: "flat", brows: "worried", gaze });
}
function tension(score, possible) {
  const gaze = jackpotGaze(score.visee);
  const tendu = score.posees >= 4;
  if (possible <= 1) return base({ eyes: "dot", mouth: "pout", brows: "worried", gaze });
  if (possible === 2) return base({ eyes: "bar2", mouth: "flat", gaze });
  if (possible <= 4) return base({ eyes: tendu ? "bar3" : "bar2", mouth: "flat", brows: "determined", gaze });
  if (score.posees === REEL_COUNT - 1) return base({ eyes: "wide", mouth: "o", gaze, particles: ["bang"] });
  if (possible >= REEL_COUNT) return base(tendu ? { eyes: "bar3", mouth: "grin", cheeks: true, gaze } : { eyes: "bar2", mouth: "smile", gaze });
  return base({ eyes: "bar3", mouth: "smile", brows: "determined", gaze });
}
function jackpotFace(score, depuisMs) {
  const possible = score.reparees + (REEL_COUNT - score.posees);
  if (score.fini || score.posees >= REEL_COUNT) return verdict(score.reparees);
  if (score.posees === 0) return base({ eyes: "happy", mouth: "grin", cheeks: true, gaze: jackpotGaze(score.visee) });
  const depuis = typeof depuisMs === "number" && depuisMs > 0 ? depuisMs : 0;
  return depuis < JACKPOT_REACTION_MS ? reaction(score, possible) : tension(score, possible);
}
export {
  JACKPOT_REACTION_MS,
  jackpotFace,
  jackpotGaze,
  jackpotParfait,
  jackpotScoreSignature
};
