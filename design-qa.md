# DEV practice design QA — 2026-10-11

final result: passed

Source visual truth: [Claude artboard 63d9452f2a66](https://claude.ai/artifact/QxCJLacpzBzSSFVDuaotRV#artboard-63d9452f2a66), “דף תרגול 3 · לפי ההדמיה”. Its HTML ZIP and PNG export were downloaded through the artifact's Export controls. The ten original PNG illustrations were extracted unchanged.

## Evidence and state

- [Source](docs/practice-design-dev/source.png): 1280×1701 exported PNG, Hebrew RTL, idle desktop.
- [Final implementation](docs/practice-design-dev/desktop.jpg): 1280×1800 browser capture, same 1280 CSS-pixel desktop width, Hebrew RTL, idle. The viewport was extended to contain the page after full-page capture intermittently timed out. The bottom includes retained product shortcuts and viewport background.
- [Full comparison](docs/practice-design-dev/comparison.jpg) and [readable hero/card comparison](docs/practice-design-dev/comparison-focus.jpg) put both images in one input at the same scale. No density resampling was required for the final desktop pair.
- [Mobile](docs/practice-design-dev/mobile.jpg): 390×844 CSS viewport; available document width 375px after the scrollbar, no horizontal overflow.
- [English with actual large-text preference](docs/practice-design-dev/english-large.jpg): 900×600 CSS viewport; 885px available width, no horizontal overflow.
- Local fixtures exercise actual Web adapters and routes. They provide Spanish words, five recent sessions, a real-contract minute goal at 5/10, and a four-day streak. They are kept outside the repository and are excluded from delivery.

## Comparison history and resolved findings

1. P2: inherited application line height increased card/goal spacing. Set the scoped practice root to the source's normal line height. The post-fix full and focused comparisons above show the restored section rhythm.
2. P2: goal CTA used a navigation arrow rather than the source play icon. Restored a filled play icon. The desktop comparison shows the corrected CTA.
3. P2: the 900px English large-text header overlapped the last navigation item and upgrade link. At large text and widths up to 1100px, use the existing accessible menu. The final English capture shows separate, usable controls.
4. P2: mobile initially inherited the old brand image. Reused the selected artboard's logo on desktop and mobile; the final mobile capture shows the corrected brand.

## Required fidelity surfaces

- Typography: Rubik 800 headings, Assistant body, original sizes/weights, normal root line height, source headline line height and description wrapping. Explicit text-scale support preserves the profile preference.
- Layout: source 1180px wrapper with 24px gutters, 4×2 cards, 18px gaps, 28px hero/goal radii, original padding and image masks. The source's responsive 2-column cards and single-column hero/goal are retained.
- Color: original tokens, including #FAF9F5, #1F2B27, #2B6E58, #EBF4EE and #F5C542. Browser computed strip background is rgb(43,110,88), with no ancestor opacity/filter/blend. Native browser JPEG color rendering differs slightly from Claude's exported PNG; CSS tokens were verified rather than compensating for the capture pipeline.
- Images: all ten original PNGs, original proportions and crops. No generated or placeholder illustrations. The original source SVG brand mark and decorative headline mark are reused; standard control icons use the existing icon library.
- Copy: source Hebrew titles/descriptions and card order; complete catalogs in all eight existing locales. Language names, goal units, streak and recent activity are actual selected-language/server data.

## Functional integration differences

These are intentional product constraints rather than design drift:

- Sentence completion, dialogue and picture matching have no matching existing practice contract. Their source cards remain present with a coming-soon badge and an accessible availability dialog.
- The daily goal uses server items/minutes/attempts, rather than inventing five completed games. Correct numeric direction and a semantic progressbar are retained.
- Active history cards resume the recorded session with language/pack scope. Completed/abandoned cards open history instead of trying to resume a consumed session.
- Existing word selection, spelling, matching, pronunciation and history remain reachable through compact shortcuts/dialogs. They extend the page below the reference's main content.
- Production and demo keep their existing practice page; the new route/shell require the exact DEV hostname, or an explicit loopback-only preview flag.

## Verification

Browser checks: original assets load; mobile menu opens as a dialog with focus on its close button; recent carousel advances to the next actual session on mobile; unavailable card opens its explanation; English LTR and large text are readable. No browser warning/error logs were reported in the final local English check.

`npm.cmd run check`: typecheck, ESLint, 261 unit tests in 49 files, build and 20 gateway/security tests passed. Focused practice/i18n tests: 12 passed. Production dependency audit: zero vulnerabilities.

No remaining actionable P0/P1/P2 finding. The complete browser regression suite, physical devices, real scoring and paid provider calls were not exercised for this frontend presentation change.
