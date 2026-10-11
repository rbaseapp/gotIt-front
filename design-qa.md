# Focus games design QA - 2026-10-11

Source: owner-selected Claude artifact QxCJLacpzBzSSFVDuaotRV, five game artboards, four transitions and session end. Source truth captures: `docs/focus-games-dev/source-*.jpg`. Rendered implementation: isolated local fixtures, React application in Chrome via Cua. Final captures: `docs/focus-games-dev/implementation-*.png`.

## Viewport, state and normalization

Desktop CSS viewport 1280 x 860. Claude screenshots are 1280 x 940 including 80 pixels of artifact chrome; comparisons crop those 80 pixels, without scaling app content. Implementation game captures are 1280 x 860. Summary content capture excludes browser scrollbars (1271 x 854); its source is cropped to the same rectangle. Pixel density is normalized to captured CSS size, 1:1. Comparison images place source and implementation together in one image.

Same state: flashcard word face; matching with two acknowledged pairs and a selected third word; initial drag/listening/pronunciation; completed flashcard transition; unopened gift; final summary. Prototype sample content/XP/counts differ from actual fixture receipts. Matching has five pairs rather than four words plus a spare meaning. Optional IPA/POS, stress, full sentence translation and accessory awards are unavailable or not backed by a contract; they are not fabricated. Source gift focus outline reflects its currently focused close link.

Narrow frames: actual 320-pixel Hebrew matching and English pronunciation, and 390-pixel English listening. DOM body clientWidth/scrollWidth match 320/320 and 390/390. Screenshots crop the iframe content without scaling; lower pronunciation controls were reached by native scroll. Browser viewport override did not affect existing tabs, so actual iframe browsing contexts supplied the narrow CSS viewports. No device chrome was invented.

## Comparison history and fixes

1. P1 typography: absent Nunito and an oversized flashcard line box changed word proportions. Loaded original Rubik/Nunito weights and restored line-height 1. Final: `compare-flashcards.png`.
2. P1 matching connections/layout: auto direction placed dots on outer edges, omitted stage/board wrappers lost spacing, and language chips lacked their source styles. Restored inner-edge dot order, wrappers, chip classes, source state colors, word alignment and coach bubble. Equal board columns have no sample-only vertical offset. Connection strokes now use the same source palette as both endpoints. Final: `compare-matching.png`.
3. P2 transition rhythm: card placement, padding, button weights and square mascot differed. Restored source margins/gaps, original image proportions, confetti asset and weights. Final: `compare-transition-1.png`.
4. P2 narrow matching: chair/book wrapped in 320px columns. Reduced middle gutter and control spacing while preserving usable controls. Final: `mobile-320-matching.png`.
5. P1 pointer interaction: browser native dragging conflicted with captured pointer events. Removed competing native drag initiation; verified actual mouse drag to the blank, resulting in a server receipt. Click and keyboard remain available.
6. P2 drag/listening rhythm: extra fifth tile, removed paragraph margins, initially visible disabled submit and undersized letter boxes shifted composition. Use four valid server choice IDs where the canonical answer is known, restore paragraph rhythm, reveal submit after input and restore box width. Reset a global wave rotation. Finals: `compare-drag.png`, `compare-listening.png`.
7. P2 pronunciation slow control and end header: wrong slow-button class and global bar background leaked into scoped screens. Restored original class and transparent header. Gift pose uses original 0.82 scale. Finals: `compare-pronunciation.png`, `compare-end-gift.png`, `compare-end-summary.png`.

## Required fidelity surfaces

- Fonts: Rubik UI and Nunito display word/number families, weights, sizes and wrapping inspected. Flashcard word proportions now match. Native typing remains accessible beneath visual letter boxes.
- Spacing: full composition, card sizes, original stack/deck, inner dots, buttons, transitions, completion stage and responsive wrapping inspected. Content-dependent board rows and vertical scrolling are expected.
- Colors: original scoped source palette, mint/green backgrounds, semantic pair states, gold progress/XP and card shadows retained. JPEG antialiasing/compression differences are not color-token findings.
- Images: 22 original raster files verified byte-for-byte against exported ZIP assets; source confetti SVG reused. No replacement illustration was generated or hand drawn. Source accessory awards are intentionally omitted without an award contract.
- Copy: source Hebrew task headings retained; eight locales and RTL/LTR supported. Counts, outcomes, XP, time and streak use actual receipts/projections. Completion avoids an unsupported permanent-memory claim.

## Evidence and interactions

Full comparisons: `docs/focus-games-dev/compare-{flashcards,matching,drag,listening,pronunciation,transition-1,end-gift,end-summary}.png`. Focused typography/controls comparisons are saved as `compare-details.png`; these use crops from the same source and rendered captures. Narrow evidence: `mobile-320-matching.png`, `mobile-390-listening-en.png`, `mobile-320-pronunciation-en-bottom.png`.

Browser verified: reveal/rate, all five stages, pair selection, pointer drag, native word entry, skips, exit/cancel, inter-game continuation, idempotent close display and three-tap gift/summary. Tests cover replay/repair, actual assessment receipt handling, retry/expiry, creation response reload, close response recovery and owner isolation. Development hot-reload errors during signature changes are separated from cold-load verification. Final cold-load console results are recorded below.

## Residual acceptance limits

P3: icon strokes and source-only stress/IPA presentation vary where actual metadata is absent. Real microphone/audio/provider acceptance was not performed; no paid call or live learning write was made. This is a provider integration acceptance gap, not evidence of provider failure. Production was not exercised through a new game.

Final cold-load browser error/warning count: 0. Final focused suite: 11 passed; lint and production build passed. No actionable P0/P1/P2 difference remains after the recorded fixes.

final result: passed

## Owner correction pass — 2026-10-11, local working tree

Compared the supplied target exit screenshot and the original exported flashcard source with the corrected browser renders. Restored the mascot band, centered title, stage/card copy, primary action and secondary text link. Reconnected the original card-out/in/previous/rating-stamp animations; the supplied video is unavailable, so video-level fidelity is unverified.

Matching now renders a dashed preview before assessment and follows actual pointer movement; acknowledged results show immediately without a client feedback delay. Corrected its initial direction from actual geometry (source cards occupy different sides in RTL/LTR). At 320px the coach/help row wraps without clipping the mascot or extending the document width.

The end gift and full summary now render in the shared modal over the retained, inert game board. Narrow summaries scroll internally; the close control remains sticky. The portal carries explicit RTL/LTR. Checked actual tap and drag, wrong-answer correction, keyboard/focus return, gift/skip/summary and authoritative displayed totals using an isolated local fixture.

Captures: `docs/focus-games-dev/corrections-20261011/`, including final RTL/LTR desktop completion, 320px completion controls, 320px matching and English exit. Final cold-load console: zero errors/warnings. Full local check: 287 unit tests / 50 files and 20 gateway/security tests; typecheck, lint and build passed. Existing source CSS minification and bundle-size warnings remain. No live/provider/deployment acceptance is claimed.

final result: passed
