---
target: meta-game loading state
total_score: 20
max_score: 28
na_heuristics: 6,7,10
p0_count: 0
p1_count: 2
target_identity: "file:/Users/thcolin/Projects/perso/thcol.in/src/projects/CinetropesGame.jsx"
target_fingerprint: "sha256:5a4a354074d2607d832e52b583154b30ee387ee0bacc9ef678bfaba9b06798d3"
target_path: /Users/thcolin/Projects/perso/thcol.in/src/projects/CinetropesGame.jsx
timestamp: 2026-10-13T18-30-32Z
slug: src-projects-cinetropesgame-jsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)

Scope: the loading state of the meta-game console screen (`.cg__loading`, `.cg__logo`), commit ebe5a32.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | LOADING + role=status; no progress, fine for ~1 s |
| 2 | Match System / Real World | 4 | Boot screen on a Game Boy |
| 3 | User Control and Freedom | 2 | 10 s fallback is long; nothing cancels the wait |
| 4 | Consistency and Standards | 3 | Word sized from --console-height, logo from cqh |
| 5 | Error Prevention | 2 | Iframe focused behind the loader: keys go to a hidden game |
| 6 | Recognition Rather Than Recall | n/a | Passive state |
| 7 | Flexibility and Efficiency | n/a | Passive state |
| 8 | Aesthetic and Minimalist Design | 4 | Two elements, no chrome |
| 9 | Error Recovery | 2 | No error state for a failed iframe |
| 10 | Help and Documentation | n/a | |
| **Total** | | **20/28** | |

## Design Specificity Verdict

Specific: the cinetropes logo at the game's pixel scale, on the screen's own gray, in the band's Determination font and --cg-active; the row-by-row reveal reads as a GBC screen being drawn. Detector: 0 findings in CinetropesGame.jsx; browser pass: no finding on the loader (page-wide findings are pre-existing).

## Priority Issues

- [P1] Ready signal absent in production until cinetropes ships: every Start would wait 10 s. Fix: deploy cinetropes first.
- [P1] The logo is rarely seen whole: draw 1.17 s, loader ~1 s. Fix: shorter draw, or hold the loader until the draw completes.
- [P2] The loop restarts by blanking on long loads. Fix: draw once, loop only the word.
- [P2] Restart can leave the loader up (timeout only re-armed by iframe load). Fix: arm in restart.
- [P3] Keys pressed during the loader go to the hidden game. Fix: focus the frame when the loader goes.

## Persona Red Flags

- Recruiter on a slow connection or before cinetropes ships: ~10 s of LOADING reads as a broken demo.
- Developer from GitHub: half-drawn wordmark then a hard cut.
- Screen-reader user: "cinetropes Loading" announced once; nothing on ready.

## Minor Observations

- 390×844: thin line at the top edge of the screen, also present without the loader (pre-existing).
- The loader covers the full screen width, the game only its square; same gray, invisible.
