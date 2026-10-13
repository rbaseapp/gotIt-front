# Program chooser visual QA

Source visual truth: owner-provided screenshot in the conversation, 1536×1024.
Implementation: real `ProgramChooser` in `docs/program-chooser/preview/index.html`.
State: Hebrew/RTL, English target, Hebrew support, available prepared catalog.
Viewport: 1536×1024 CSS pixels, screenshot at matching desktop density.

Desktop full-view and card-detail comparison was performed in Chrome. The initial
comparison found P2 vertical spacing, body-font weight, CTA arrow placement and
mascot scale differences. Rubik body typography, reduced heading/language spacing,
corrected arrows, bounded feature text and increased mascot scale address these.
An intermediate post-fix screenshot was visually inspected in the conversation.

Fonts/typography: Rubik display/body, Assistant fallback; localized copy matches
the target with selected-language interpolation. Spacing/layout: centered language
panel, two equal cards and aligned CTAs. Colors: emerald/mint foundation, cream/gold
personal, dark blue-green text. Assets: separately generated transparent raster
illustrations in the target clay style; standard library UI icons. Content: real
controlled language selections and existing server-dependent actions.

Intentional differences: shared application header follows the existing approved
DEV implementation; artwork is recreated rather than extracted from the screenshot;
the accessible back action and actual availability/loading/error states remain.
P3: headline Sparkles icons differ from the source's small yellow rays.

Final screenshot persistence, a comparison after the last CSS refinement, 320px
RTL/LTR, keyboard browser acceptance and authenticated deployed checks could not
be completed: the follow-up turn has no connected browsers. No screenshot path is
claimed. Component/state regression coverage passed; it does not replace browser QA.

Implementation checklist: reconnect browser, capture final desktop and 320px RTL/LTR,
confirm no overflow/focus issues, manually deploy the exact Web commit to DEV,
verify both navigation paths without creating a course merely to test the chooser.

final result: blocked
