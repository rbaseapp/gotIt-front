# Program map — DEV, 2026-10-13

Owner: supplied Hebrew program-map screenshot (1448 × 1086) in this task.
Route: `/english-learning?unit=<packId>`. Existing shared Topbar/status bar remains
the canonical shell; its previously approved brand, measurements and metrics are
retained. The new map uses the existing `programsDesignEnabled` boundary: DEV
hostname, or explicit `VITE_PROGRAMS_DESIGN=true` on loopback. Production retains
`EnglishUnitMap`. No API, database, migration, provider or billing change.

`ProgramUnitMap` owns the hero, timeline disclosures and navigation;
`ProgramMapSidebar` owns words and goal presentation; `programMapModel` projects
existing server evidence into navigation steps. The isolated preview under
`preview/` is not an application entry point or a live-data fallback.

Each returned teacher station contributes its word range, meeting and preparation
step. Word-range completion uses server `progress.introduced`, meeting completion
uses `meetingCompleted`, and preparation completion uses `preparationComplete`.
The displayed percentage is completed navigation steps divided by actual steps,
not mastery, XP or a new learning score. A standard current three-station unit has
nine steps. The screenshot's illustrative 14/20, 70%, lesson titles and durations
are not hardcoded. `nextAction` determines the highlighted action; `available`
controls meeting entry. Historical out-of-order evidence remains visible, and the
active step is always included even if earlier steps are incomplete.

Words come from the existing stage-scoped `path.words` response (first six shown).
Clicking a word opens the existing unit word browser. Homework actions use its
real assignment ID and retain unit return scope; completed homework uses the
existing read/review route. Reading or expanding the map triggers no homework
preparation, learning evidence, lesson start or reward write. Homework preparation
continues in the existing HomeworkPage. Full unit selection is limited to the
published prepared-path catalog using `englishPathLevels`.

All eight locale catalogs contain the new UI copy. The known first-unit title has
a localized presentation; unknown unit titles and all descriptions remain server
content. The adapter removes the existing catalog's `Unit N:` / `יחידה N:` prefix
before adding the localized unit label. Numeric word ranges have bidi isolation.

Verification: 350 Vitest cases / 57 files (including nine focused map cases),
21 gateway/security cases, typecheck, ESLint and production build passed. Browser
checks cover 1448px desktop and 320px Hebrew/English layouts, collapsed/completed/
future states and Space-key activation. Document client/scroll width matched
1433px at desktop and 305px at mobile with the stable scrollbar gutter. The clean
final browser tab was checked separately from transient Vite HMR context errors.
Detailed visual evidence and comparison history: root `design-qa.md`.

Not performed: the complete Playwright sweep, physical device/provider/lesson
acceptance or production deployment. No backend change requires a DB suite.

## Hero asset

`public/assets/program-map/hero.webp`: 1774 × 887 RGBA, 190,612 bytes. Generated with
the built-in ImageGen tool using the supplied reference; PNG encoded to WebP at
quality 88 without changing composition or alpha. No runtime image-generation
request/quota. Prompt: `public/assets/program-map/hero.prompt.txt`.

DEV release and authenticated acceptance are recorded in `evidence/release.json`
once observed. Rollback source: previous live Web `06b1764883f8cef69d9dcac08713e3fa2699a868`.
