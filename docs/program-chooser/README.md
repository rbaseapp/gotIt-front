# Program chooser — DEV, 2026-10-13

The owner-supplied 1536×1024 Hebrew screenshot is the visual target. The existing
`/courses?choose=1` route uses `ProgramChooser` only through the existing
`programsDesignEnabled()` DEV hostname/explicit loopback-preview gate. Production
retains its prior chooser. The shared application header is unchanged.

The controlled view owns presentation only. `ProgramsPage` retains catalog reads,
selected language state, profile updates, error/retry handling and navigation.
The prepared action verifies the server catalog after saving a changed pair before
opening the existing map. Personal setup receives both selected language codes in
the existing URL. Merely selecting a language does not create a course or save a
profile. Unsupported pairs and failed/pending reads remain distinct states.

Eight locale catalogs supply all UI text. Language names and flags derive from
selected codes, including supported regional codes. Shared searchable comboboxes
retain keyboard operation. Cards stack below 760px; language fields stack below
380px. Busy actions are disabled, errors expose retry, and reduced motion is respected.

`preview/index.html` is a development-only fixture for the real component and
shared chrome. It is not imported by the application entry point or production
build. Run Vite with `VITE_DEMO_MODE=true` and open that fixture for read-only QA.

## Raster asset provenance

Both assets were made using the built-in imagegen tool, with transparency:

- `src/assets/program-chooser/books.png`: emerald graduation cap, gold tassel,
  two cream books with emerald covers, floating white Hello/World/Learn chips,
  golden sparkles, soft clay 3D illustration. 640×260 PNG.
- `src/assets/program-chooser/mohi.png`: canonical turquoise brain mascot,
  friendly eyes and pink cheeks, golden star wand left, open yellow book right,
  small gold sparkles, centered wide composition, no text/UI. 1920×768 PNG.

Artwork was visually inspected. Dynamic program data is never baked into images.

## Verification

- TypeScript, ESLint and production build passed.
- 341 Vitest tests in 56 files passed (`--pool=forks --maxWorkers=4 --fileParallelism`).
- 21 gateway/security tests passed.
- Twelve chooser regression cases cover both production and DEV views: pending
  catalog, unavailable pair, changed pair, verified navigation, save/API failures,
  retry, and selected-language propagation into personal setup.
- Desktop browser comparison at 1536×1024 was performed before the final small
  spacing/feature-text refinement. Mobile/LTR browser QA and final DEV acceptance
  remain unverified because the browser connection disappeared on the follow-up turn.
- Existing main-chunk size and third-party Rollup annotation warnings remain.

## Release

Base: `81798c0c8ce5bea0844d9f700d82e490fa85fe1b` (remote DEV and live DEV Web).
Only Web changes; no API/schema/migration/provider configuration changes.
DEV service: `srv-dar6dng473hc73a0ns1g`; auto-deploy is disabled. Publishing `dev`
does not deploy that service. Manual exact-commit deployment and browser acceptance
are pending. Rollback is the preceding DEV Web commit above. No production release.
