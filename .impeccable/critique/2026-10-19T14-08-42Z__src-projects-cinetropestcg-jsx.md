---
target: src/projects/CinetropesTcg.jsx
total_score: 21
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 2
target_identity: "file:/Users/thcolin/Projects/perso/thcol.in/src/projects/CinetropesTcg.jsx"
target_fingerprint: "sha256:c485945c3fdf813208b26a38ce3218c13b05355528987ab04ee187cb412390a8"
target_path: /Users/thcolin/Projects/perso/thcol.in/src/projects/CinetropesTcg.jsx
timestamp: 2026-10-19T14-08-42Z
slug: src-projects-cinetropestcg-jsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score — 21/28 (75 %, Good). n/a: 7, 9, 10 (one-minute Experience demo, no error path, no returning user)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | hint follows each state; no progress over the 3–7 taps, no end-of-pack moment |
| 2 | Match system / real world | 4 | sachet, tear strip, deck, glass case: all physical |
| 3 | User control and freedom | 2 | opening the next booster silently empties the five cases |
| 4 | Consistency and standards | 3 | "Tap" with a mouse; the same tap flips then stows |
| 5 | Error prevention | 3 | button disabled while opening, taps ignored during the flight |
| 6 | Recognition rather than recall | 3 | the five labelled cases foreshadow the goal |
| 8 | Aesthetic and minimalist design | 3 | dark-on-dark deck, small cards in cases, crowded sachet column |

## Design specificity
Authored for this game (crinkling popcorn sachet, flying strip, velvet cases, rarity colours). Weak reward: card back near-black on the band's black, Common and Legendary look alike at rest, stowed card 47–80 px wide. Detector: CLI clean on CinetropesTcg.jsx and Cinetropes.jsx; browser: text-occlusion on the "5 films" banner (false positive, two clip-path layers), clipped-overflow-container at 390 (false positive), ai-color-palette on "Epic" purple (deliberate, the app's tier colour).

## Priority issues
1. [P1] Phone case strip ends at 358/390 px: third label cut, auto-scroll off-centre by ~16 px. Fix: `width: auto` on `.tcg__cases` in the max-width: 899px block. (adapt)
2. [P1] The end of the pack has no ending: after the fifth card the band resets, nothing acknowledges the full collection, and the next tap silently empties the cases. (delight, clarify)
3. [P2] Rarity has little visual weight: no resting holo, cases identical whatever the tier. (colorize, animate)
4. [P2] Sachet column crowded: the button's -4 %/108 % overflow touches the lead and the hint; the deck of backs is nearly invisible. (layout)
5. [P3] Screen reader never hears the film title in the live hint; focus ring flat around a tilting card; reduced motion removes the holo even on hover. (audit, polish)

## Persona red flags
- Jordan: random 3–7 taps with a faint "Again…" may read as broken; no "done" moment.
- Sam: title never announced; "Again…" announced once; empty cases have no state.
- Casey: clipped strip; never sees the five cards together at the end.

## Minor observations
- "PostgreSQL" wraps alone at 1440.
- Empty case labels at full colour.
- "Tap the card for the next one" actually stows the card.

## Questions
- Is the random 3–7 taps worth the "is it broken?" risk on a portfolio?
- Should the cases light up as cards arrive, making the end a reveal of the collection?
- Should the Legendary moment hold until the next tap?
