# Dashboard word actions

Date: 2026-10-07

final result: passed

## Scope and visual truth

- Selected reference: `C:/Users/Ori/.codex/generated_images/01a11565-1182-70a2-b5ee-7dec34cccd1c/exec-52f2884f-7a5c-485a-9e18-ceaad091c807.png` (1423 x 1105 pixels).
- Implement only the word-card actions. The user explicitly required keeping the existing sidebar. Existing hero, navigation, illustrations, routes and surrounding card geometry remain authoritative.
- Implementation: `http://127.0.0.1:5173/dashboard`, using local test fixtures, not a deployed environment.
- Desktop capture: `test-results/dashboard-actions-desktop.png` (1920 x 1500 pixels, matching CSS viewport, density 1).
- Mobile capture: `test-results/dashboard-actions-mobile.png` (390 x 1196 pixels, full content capture for a 390 x 844 CSS viewport, density 1).
- Full-view and focused comparison: `test-results/dashboard-actions-comparison.png`. The word-card reference and implementation crops are normalized to 560 x 310 and displayed together. The reference is a main-content crop, while the implementation retains the complete shell. These are deliberately not treated as identical full-page viewports.
- State: Hebrew RTL, selected English program, two enabled practice links, 62 words due. The fixture name and hero state differ from the original image; those existing components are outside the edit scope.

## Findings

No actionable P0/P1/P2 findings in the requested component scope.

- Typography: existing application font retained. Compact buttons use 16px, weight 600, complete short labels, and 44px minimum height. This follows the agreed compact-button specification rather than copying the enlarged mockup's rendered text size. Full descriptions remain in accessible labels and native title tooltips.
- Spacing: two equal-width buttons, 8px gap, centered text link below. The desktop action area reserves the old space. At widths 1920, 1440 and 1000, card height differed from baseline by only 0.016 CSS pixels (rounding). Both cards align at top and bottom; teacher/reading links retain their document position.
- Tokens: original brand green, mint card background, white secondary button, existing border token and focus outline retained. Button radius is 14px.
- Assets: existing hero, word-card, program illustrations and logo reused directly. No new raster assets or replacement icons were introduced.
- Copy: short review/program labels supplied for all eight locales. The original full labels remain available for assistive technology. The game link retains the original text.
- Responsive behavior: inspected widths 320, 390, 1000, 1440 and 1920. No horizontal page overflow. Both labels fit at 320/390; controls stack at narrow widths and remain 44px high. Existing mobile navigation and desktop sidebar are retained.

## Interactions and checks

- Clicked the vocabulary review link and verified the smart-practice preparation page with the existing language/return scope.
- Clicked the game-selection link and verified the existing game-selection screen.
- Verified the program-practice href retains pack, language, ready and return parameters; disabled-state handling remains unchanged. No practice attempt was submitted.
- Browser console errors on the inspected local preview: none.
- Typecheck and ESLint for the modified component: passed.
- Production build: passed (existing bundle-size/dependency annotation warnings only).
- Translation tests: 6 passed.

## Comparison history

- Initial visual comparison confirmed the requested two-button hierarchy, compact controls, preserved card alignment and unchanged sidebar.
- A stitched full-page screenshot contained capture artifacts after viewport changes. Replaced it with a fresh 1920 x 1500 viewport screenshot and repeated the combined comparison; the final capture is clean. No code fixes were needed from that comparison.

## Implementation checklist

- [x] Compact button row and separate game link.
- [x] Original routes and disabled program behavior retained.
- [x] Desktop geometry and sidebar retained.
- [x] Narrow-screen layout and translation completeness checked.
- [x] Reference and browser-rendered output compared together.

## Follow-up polish

No blocking follow-up work. Full production session execution was outside this presentation change and was not re-tested.
