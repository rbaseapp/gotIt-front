# Program map UI/UX acceptance - 2026-10-22

final result: passed

Scope: adapt the selected unit-map interaction hierarchy to the existing GotIt
shared map; retain the existing product design system and authoritative behavior.
This is local implementation acceptance, not DEV deployment or a pixel clone.
Previous root settings report is preserved at docs/settings/design-qa-20261014.md.

## Source, implementation and comparison

Source visual truth: owner-selected Claude artifact
https://claude.ai/artifact/QxCJLacpzBzSSFVDuaotRV#play-491bf3f68d1b,
board UnitStartHere.dc.html. Authenticated artifact full-screen viewing supplied
source-desktop.jpg (1490 x 714 px), under docs/program-map/uiux-20261022/.
The public viewer itself remained on Loading. No unrelated design board is used.

Implementation: http://127.0.0.1:5187/design-preview/ using the real shared map
and explicit local in-memory data. desktop.png is 1475 x 1358 content pixels,
from a 1490 x 900 CSS viewport with a 15px scrollbar gutter. mobile.png is
375 x 2785 content pixels from 390 x 844 CSS; mobile-confirmation.png is 390 x 844.
All final CLI captures use CSS-pixel scale (density 1) and disabled animations.
Early CUA full-page captures were cropped incorrectly and were discarded.

State: Hebrew RTL; 2 completed steps of 14, steps 2 and 3 skipped, step 5 current.
Updated own-name titles intentionally differ from the illustrative Noa content.
The source header/demo controls are external presentation context, whereas the
implementation retains a labeled review shell and the existing product hero/title.

Source and implementation were combined and visually inspected together:
comparison-overview.png contains equal 1480 x 624 overview regions, removing the
source artifact toolbar and excluding the small scrollbar-gutter difference.
comparison-focus.png compares the heading, hint, completed row and vocabulary
region, normalizing component widths to 1133px; this focused image is for hierarchy
and detail, not a claim of identical grid proportions. Original screenshots remain
available to avoid hiding intentional size and wrapping differences.

## Iterations and resolved findings

- P2: 320px viewport overflow from the existing body's 320px minimum width plus
  its scrollbar. Added a map-scoped min-width reset. Post-fix browser measurements
  at viewport widths 320/390/768/1490: client and scroll widths both
  305/375/753/1475. Final responsive captures and assertions passed.
- P2: sidebar remaining count included skipped steps while the hero excluded them.
  Both now count unfinished, unskipped steps. Final desktop shows 10 in both places;
  browser skip/restore returns both counts to 10 without changing completed steps.
- P2: completed review inherited a gray default button surface. The review control
  now has a transparent surface and 44px hit area; post-fix desktop/mobile captures
  show the quiet green review action.
- Initial preview-only favicon 404 was corrected using the existing product icon.
  The final browser run recorded no new console or page errors.

No actionable P0/P1/P2 finding remains within the shared map change.

## Fidelity surfaces and deliberate product adaptations

- Typography: existing Assistant/Rubik stack, navy headings and responsive type
  hierarchy retained; row headings reduced from 25px to 22px on desktop. The
  current product's heavier/larger headings differ from the smaller reference.
  Long, updated titles wrap rather than truncate. This preserves the established
  product typography instead of introducing a second design system.
- Spacing/layout: existing hero, two-column roadmap/sidebar, rounded white cards,
  timeline, completed/future disclosures and mobile stacking retained. The wider
  current-product map and completed-range disclosure are intentional, not pixel
  copies of the mock. The new hint and secondary actions fit these existing regions.
- Colors/tokens: existing green/yellow/navy tokens retained. Yellow is reserved
  for the current continuation; white outlined green-text secondary entry appears
  on row hover/focus, and warm explanatory confirmation content remains distinct.
- Image quality: existing genuine compressed branded hero.webp retained, sharp
  at desktop/mobile sizes. The source's different mascot pose and demo logo were
  not recreated using shapes or placeholders. Standard icons use existing Lucide.
- Copy: live callers keep server titles, words, durations and progress. Updated
  own-name titles are used in the sample. Eight instruction/dialog translations
  were added. The confirmation accurately preserves the approved contract:
  choosing a step does not automatically complete or skip earlier work. Explicit
  skip and restore remain separate actions. No fake success/evidence is added.

## Interaction evidence

The final Playwright CLI run (explicitly authorized after CUA disconnected)
verified: two matching primary continuation actions, hover reveal, no entry CTA
for locked practice, no opening before confirmation, cancel restoring focus,
touch-menu entry, confirmed activity callback, explicit skip/restore, unchanged
2/14 completion, and equal client/scroll widths at four breakpoints. Console
and page-error capture returned []. The shared modal retains its existing Escape,
focus trap and focus restoration; focused unit tests also cover menu Escape.

## Verification and limits

27 focused cases in 4 files, typecheck, lint, build and 23 gateway checks passed.
The full forks run reported 420 passed and 1 failed in 67 files. The dedicated
English-path lazy-loading case in test/live.test.tsx failed while waiting for a
heading, also reproduced on unmodified observed DEV 9a95e23. A terminated threads
run is not counted as a pass. verification.json records exact scope and outcomes.

Authenticated DEV, full browser-suite sweep, physical devices, paid providers,
DB integration and production acceptance were not run. This Web-only change needs
no API, migration or configuration rollout. The local preview is excluded from
the normal production entry; its state cannot substitute for live learning.
