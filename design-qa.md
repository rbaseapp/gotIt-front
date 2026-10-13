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

## Reconnected QA — 2026-10-13

Final desktop screenshot: `docs/program-chooser/evidence/desktop.png` at the
1536×1024 CSS viewport. Compared again with the conversation reference after the
last CSS refinement: two-card geometry, typography, CTA placement and feature
wrapping are acceptable. Shared header differences and regenerated artwork are
intentional; yellow headline Sparkles remain P3. No unresolved P0/P1/P2 finding.

Focused comparisons: books and Mohi art, language controls and card headings/CTAs
were checked in the full-resolution desktop image; important text is readable.
The reference raster is 1536×1024; the saved desktop transport raster is
1521×1014. Mobile transport outputs are 138×897 (RTL full-page overview) and
305×858 (LTR viewport). Chrome's screenshot transport can downsample and omit the
reserved scrollbar edge. DOM geometry at the stated CSS sizes, rather than these
transport raster dimensions, verifies responsive layout. No pixel identity claim.

320×900 CSS checks in Hebrew/RTL and English/LTR both report document client and
scroll width 305px (15px reserved scrollbar), with no horizontal overflow.
`evidence/mobile-rtl.png` and `evidence/mobile-ltr.png` preserve viewport captures.
Both illustrations load. Shared combobox keyboard ArrowDown opens the list and
Escape closes it. Component tests separately verify core navigation/error states.

Remaining acceptance: actual DEV release and authenticated navigation are recorded
in the release evidence after deployment. Full browser automation and physical
devices are outside these focused checks.

Follow-up: live testing at an effective 480 CSS pixels exposed 10px overflow
from the scaled Mohi raster. `06b1764` clips artwork only at the mobile breakpoint.
Fresh 320×900 browser contexts in both locales confirm client/scroll width 305px;
`evidence/mobile-rtl-final.png` and `mobile-ltr-final.png` record the corrected UI.
The build passed again. This CSS correction does not change any interaction.

final result: passed
