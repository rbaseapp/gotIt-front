# Settings design QA - 2026-10-14

Source visual truth: owner-supplied conversation attachment Image 1 (2560x2260
source pixels, displayed at 1667x1472). Implementation:
docs/settings/evidence/desktop-he.jpg, 1667x1472 browser/CSS pixels, density 1.
The browser's 15px scrollbar gutter is excluded when judging content alignment.
Profile default state; actual/demo identity intentionally differs from Shay.
The supplied source and rendered implementation were reviewed for full composition
and profile/connection/sidebar detail. Focused evidence: profile-detail.jpg in the
same evidence directory, cropped from the actual browser screenshot. This is not
a constructed mock. Mobile: mobile-he.jpg and mobile-en.jpg, 320x780 CSS pixels,
client/scroll 305/305. No source mobile artboard was supplied.

Findings and iteration history:
- P1 resolved: legacy shell max-width reduced sidebar/content proportions. Scoped
  selector specificity now removes that limit for settings only. Final sidebar
  starts at x20, content x372, roughly 20/80 columns, 30px gap.
- P2 resolved: LTR email collided with RTL pencil. Field direction now follows
  its container and editing affordance remains separate.
- P2 resolved: generic provider symbols replaced with actual Google identity and
  Simple Icons Apple assets, bundled locally.
- P2 resolved: separate local-name note inflated the card. Small inline note now
  preserves accurate tab-local scope and the intended field-row density.
- P2 resolved: category-resource failure/loading exposed misleading save. Save
  is now blocked until initial read succeeds; read failure offers retry.
Post-fix desktop and profile-detail evidence is saved above. No actionable
P0/P1/P2 finding remains within the owner-approved supported-settings scope.

Required fidelity surfaces:
- Typography: Assistant, 40px heading, 21px navigation/fields, 16-18px supporting
  copy; heavy labels, mobile scaling and localized wrapping inspected.
- Layout: cream full-width surface, green left sidebar, 26px cards, 60px controls,
  circular field icons, profile/avatar/connection order and geometry match.
  Existing canonical shared header is retained; its height differs from the mock.
- Tokens: #faf8ef page, #fffefa cards, #105c49 green, #132e50 headings,
  #e0f2e9 icon circles, #e3e7dc borders.
- Assets: existing GotIt logo/Mohi, actual provider brands, existing Lucide UI
  icons. No rasterized UI, custom icon drawings or placeholder assets.
- Copy/data: actual profile/email/timezone; all supported settings categories.
  Owner selected explicit unavailability for missing email/avatar/linking APIs.
  Display name stays tab-local; help opens existing help, not a fictional chatbot.

Interactions: local actual-component/demo timezone unlock/focus, UTC change,
explicit save/success announcement; category navigation/current item; shared
modal Escape/close. Hebrew RTL and English LTR at 320px have no document overflow.
Final browser console: no error/warning entries. Eight focused regressions cover
rollout, hashes, locale content, profile failure, retries and save isolation.
Full historical browser sweep, physical devices and live provider/identity writes
were not performed.

P3 follow-up: retained repository logo and Mohi artwork differ from the source's
small brand-art details (wand/book versus bulb). Canonical shared header is the
existing project design. Exact source artwork would allow verbatim replacement.
No source image file is archived locally; selected source remains the user's
conversation attachment. No claim of a side-by-side comparison file is made.

final result: passed
