# Program map design QA - 2026-10-13

Source visual truth: user-attached Hebrew program-map screenshot in this task,
1448 x 1086 pixels. The original attachment remains the source reference; it is
not a project asset. Implementation: docs/program-map/evidence/desktop-final.png
and mobile-rtl.png / mobile-ltr.png. Browser: existing Chrome profile, because the
in-app browser is not available and authenticated DEV inspection requires it.
Desktop CSS viewport 1448 x 1086, DPR 1; 15px stable scrollbar gutter. Mobile CSS
viewport 320 x 900, DPR 1; document client/scroll width 305px. Desktop capture is 1433 x 1075 pixels and mobile captures are 305 x 858
pixels after browser screenshot-surface cropping. CSS/DPR dimensions are stated
above; screenshots exclude browser controls. Compare app-owned body regions below the shared header.

State: same first-unit layout, prefix 1-4 collapsed, step 5 current, two future
steps visible, more steps collapsed. Real current server policy has nine stages
rather than the mock's 20. Fixture 4/9 = 44%; mock 14/20 = 70%. No fake progress
or mock lesson content enters the live app. The current fixture is a teacher
meeting, while the reference labels its illustrative current step as a lesson.

Full-view comparison: the supplied source and rendered inline browser captures
were reviewed together for the hero, title/progress/actions, two-column layout,
completed/current/future path and sidebar. Focused comparison inspected the
current-row borders, marker alignment, word tiles, subtitle direction and goal
ring, plus the narrow mobile timeline capture.

Comparison history:
- P2: inherited 1300px page limit reduced the roadmap/sidebar widths; fixed with
  map-scoped 1448px page container and 36px desktop inset. No shared header edit.
- P2: duplicate outer page padding shifted body down; map now owns one 20px inset.
- P2: original English subtitle aligned left in Hebrew; fixed explicit locale
  alignment. Native progress fill direction is LTR, as in the source.
- P2: numeric word ranges reversed in RTL; fixed Unicode directional isolation.
- P2: extra sidebar word link increased its card height; moved the explicit word
  action into the existing map navigation tools. Future rows compacted to 82px.
- Post-fix desktop and 320px RTL/LTR browser captures confirm these corrections.

Fidelity surfaces:
- Fonts: existing Assistant 400/600/700/800; 43px desktop title, 28px section
  headings, 25px step titles; responsive mobile title 30px. Long translations wrap.
- Layout: hero copy/art split, 2.36:1 roadmap/sidebar grid, 16px card radii,
  completed disclosure, yellow current row and vertical numbered markers match
  the reference composition. Shared canonical header deliberately remains intact.
- Colors: navy #090f35, teal #008b70, yellow #ffca3d, pale mint/cream states and
  neutral word tiles. Current-row border #f7bf2e. Existing shell colors retained.
- Image: generated 3D teal brain/books/leaves/cards, actual alpha, WebP 190,612
  bytes, 1774x887. No CSS/SVG substitute for the hero. Ring is a dynamic progress
  chart using the existing Circle icon and accessible native progress value.
- Copy: UI localized in all eight catalogs; unit description, words, counts,
  durations, homework identifiers and stage availability come from real data.
  First-unit translated title corresponds to the reference; other titles fallback
  to server content. No fabricated lesson titles or benefits specific to an
  unrepresented curriculum are asserted.

Functional checks: completed disclosure via Space; show more/less; word click;
unit selector callback; correct station/homework/return/review URLs; server locks;
loading/error/retry and full-completion model cases. Clean final browser load has
zero error/warning logs. Earlier development-only HMR context errors disappeared
on a full reload and were checked in a fresh tab. No live provider was started.

Findings: no unresolved actionable P0/P1/P2 body-layout issue. Expected constraints:
shared shell design and dynamic counts/content differ from illustrative mock.
P3: generated leaf/face details differ slightly; native scrollbar gutter reduces
capture width by 15px. Neither affects functionality or composition.

Verification: 350 Vitest cases/57 files; 21 gateway/security cases; typecheck,
ESLint and production build passed. Full responsive suite and physical-device
acceptance were not run. Existing bundle-size warning remains unchanged.

Implementation checklist: completed. Preserve DEV gate and server authority.
final result: passed
