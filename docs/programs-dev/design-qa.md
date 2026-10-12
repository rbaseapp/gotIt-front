# Programs design QA

final result: passed

Reference: user-supplied `התוכניות שלי · גרסה ה (מוחי עם הדגל)@2x.png`, 2534×3332. Compared at 1267 CSS pixels with the real React component, using controlled sample programs only in the development fixture. Runtime programs never use fixture images or fixture progress.

- `comparison-01.jpg`: source and implementation together; checked hierarchy, cream/green palette, RTL three-column active panel, illustrated cards, status/progress, filters, creation card and mascot with flag/speech bubbles.
- `local-desktop.png`: 1267-wide browser capture.
- `local-mobile-rtl.png` and `local-mobile-ltr.png`: 320-wide captures; document scroll width equals client width, no overflowing program elements. Native keyboard focus, Escape menu close, live statuses and labeled progress are implemented.
- Verified completion filter shows the completed course and keeps creation available. Seven component/model regressions cover real progress, draft state, multilingual content, activation and empty state.
- Deliberate data-driven differences from the reference: actual course level/progress/checkpoints and homework availability; no invented checkmarks, dates or minutes. Existing shared GotIt header uses the latest DEV branding/account and subscription controls.
- Generated art varies with content. Backend edits the canonical brain reference for each language; generated covers derive from owned course content. Loading and retry states remain usable when the provider is unavailable.

Validation: frontend 324 tests, typecheck, lint, production build; gateway 21 tests. Backend 262 fast tests, typecheck/build, one real PostgreSQL ownership/cache integration; dependency audit has no high findings.

Live deployment acceptance is recorded in the project specification release note.

Live acceptance follow-up: Web level label corrected in `9020e93`. Backend visual acceptance caught an incorrect English flag in the initial AI response; `941f59e` supplies explicit language/region-derived flag metadata and a new mascot subject policy to bypass that cache. All 262 Backend cases and the PostgreSQL integration pass again; changed-file formatting passes (the repository-wide formatting gate reports 218 unchanged baseline files). Real covers, active selection, reload reuse, empty filter, creation chooser and overview navigation were exercised on authenticated DEV. Evidence is canonical in specification document 39.
