---
target: src/projects/index.jsx scroll
total_score: 24
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 3
target_identity: "file:/Users/thcolin/Projects/perso/thcol.in/src/projects/index.jsx"
target_fingerprint: "sha256:2cffd73ef303beaf6aecd7744d9ac301eba14736c3eb70afdc4093180a3067dc"
target_path: /Users/thcolin/Projects/perso/thcol.in/src/projects/index.jsx
timestamp: 2026-10-11T13-36-53Z
slug: src-projects-index-jsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser)

Scope: the scroll-driven demos of #projects (useScrub in src/projects/shared.jsx, .scrub in src/projects/projects.css). Build of 6fdd550, before Thomas's six adjustments (9c76bc4..2adf3bb).

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Choices underline shows the step; nothing tells how much pinned scroll is left |
| 2 | Match system / real world | 4 | The scroll does each product's gesture: zap, type, deal, walk the rooms |
| 3 | User control and freedom | 2 | Hold leaves dead pinned scroll; released silently on return |
| 4 | Consistency and standards | 3 | Cadence 450-720 px per step; Sensorr tour 3 of 6 tabs |
| 5 | Error prevention | 3 | Phone steps fire off screen |
| 6 | Recognition rather than recall | 3 | Step controls stay visible in pinned bands |
| 7 | Flexibility and efficiency | 1 | ~46 screens, nothing links to the new anchors |
| 8 | Aesthetic and minimalist design | 3 | Pinned bands read well at 1440x900 |
| 9 | Error recovery | 3 | Scrolling back replays cleanly |
| 10 | Help and documentation | n/a | Portfolio surface |
| Total | | 24/36 | Good (67%, low end) |

Specificity: authored per project, not generic scrolljacking. Oleoo, Grid and Teevy lead.

Detector: 41 CLI findings in src/projects, 188 in browser; none on the code this work changed (fonts, bounce easing, small text and contrast inside replicated third-party UIs). Page height 46.2 screens desktop, 11.9 phone; 11 sticky bands desktop, 0 phone; no horizontal overflow at 390.

Priority issues
- [P1] Phone: steps fire while the demo is off screen (shared.jsx:158 measures the whole band). Fix: measure the demo element. /impeccable adapt
- [P1] Dead pinned scroll after a hold, silent release on return. Fix options: hold only for the current step; or show a held state; or unpin. /impeccable harden
- [P1] Cadence: pinned range is (n-1) screens split in n, last step gets a third of its share; nothing links to anchors (group names are plain li, shared.jsx:104). /impeccable distill
- [P2] Timed sequences cut by the next step (Workflow /morning cut by /ticket). Fix: finish or wait. /impeccable animate
- [P2] Nothing says the scroll drives the demo; help copy talks of arrows and swipes; Sensorr shows 6 linked tabs, tour stops at 3. /impeccable clarify

Persona red flags
- Jordan: clicks a Sensorr tab, scrolls two screens with nothing moving, thinks it broke.
- Casey: sees the step change in the legend while the TV is gone; never sees top-fan Printed.
- Riley: cursor on the grid, the wheel goes to an 80 000 px scroller (Grid.jsx onWheel hold); fast scroll chops Workflow; Daily grows 1800 px under him after Play.

Minor: a meta-game thumbnail broken once at capture (load race); Daily drawers open under the LOST card in the finished state; grid counter hides three cells.

Questions: keep discrete steps for 2-state bands? does 31 pinned screens serve the recruiter as much as the developer? why take the hand back silently on return?
