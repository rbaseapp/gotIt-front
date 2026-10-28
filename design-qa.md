# Subscription selection design QA — 2026-10-22

final result: passed

Source: https://claude.ai/artifact/QxCJLacpzBzSSFVDuaotRV#artboard-2a786bd673d2,
Pricing artboard, annual selected. Source truth capture:
`output/pricing-evidence/source-desktop.png` and `source-minutes-faq.png`.
Implementation: `http://127.0.0.1:5194/output/pricing-preview.html`, actual BillingPage
and application header with a local-only catalog/account fixture.

## Comparison evidence and scope

- Desktop: source and implementation screenshots were emitted together in the same
  comparison input, including a second focused comparison of table/minutes/FAQ.
  Captures are approximately 1280 x 1000 CSS pixels; source browser zoom is 125%
  (DPR 1.25), so its viewport override was 1600 x 1250 to obtain the same CSS width.
  Implementation uses DPR 1 and 1280 x 1000. Source artifact toolbars and the
  existing product header are excluded when judging content alignment.
- Final desktop capture: `output/pricing-evidence/implementation-desktop.png`.
  Mobile capture: `implementation-mobile.png`, 320 x 780; document and scroll
  widths both 305px after the scrollbar. No page-level horizontal overflow.
- Source first four content offsets relative to main start: 0, 35, 173, 265px.
  Revised implementation: 0, 35, 173, 265px. Source illustration renders at
  120 x 110.3px. The existing `src/assets/mywords/moohi.png` is byte-identical
  (SHA-256 verified) to the reference illustration.
- Intended content changes: real Pro/Tutor tiers replace the illustrative
  Free/Basic/Premium tiers; one actual pack replaces four illustrative packs.
  Card height reflects the real entitlement list. Prices, discounts, minute-bank
  terms and refund text are grounded in the existing contracts.

## Findings and iteration history

1. P1: legacy `.billing-plan` styling clipped the recommendation ribbon and added
   an unwanted card gradient. Removed that legacy class; comparison after the fix
   shows the complete ribbon, white cards and reference border/shadow treatment.
2. P2: legacy current-plan bottom margin and forced square illustration shifted
   the period selector/cards. Scoped away the margin, restored the image's natural
   aspect ratio, normal body leading and source card spacing. Final measured offsets
   above match the source; final desktop comparison was captured after these fixes.
3. P3: real plan names are longer than the mock's Hebrew labels; headings use a
   modestly smaller size, while retaining Rubik, weight and hierarchy. The existing
   application logo/header, actual progress and account controls remain in use.

## Required surfaces

- Typography: Rubik headings/prices and Assistant body; matching weight, body
  leading and price hierarchy. Actual long names and localized currencies wrap.
- Layout: three desktop cards, 18px gutters, 26px card radii, 28px section rhythm,
  54px plan actions and 56px pack action. Below 980px cards stack, matching source.
- Color: cream #FAF9F5, ink #22322C, green #286F5C/#173F35 and gold #F5C542;
  comparison highlight, minute panel and native disclosure styling are retained.
- Images/icons: exact existing mascot; library icons replace the mock's inline
  symbols. No recreated illustration or placeholder asset.
- Copy: Hebrew/English plus existing supported locale catalogs; catalog-specific
  rights and period totals, no invented savings or allowances. Six additional
  locales retain English fallback for newly introduced copy.

## Functional checks and limitations

Browser checked period switching, unavailable quarterly Pro, selected pack,
comparison and FAQ disclosure, 320px layout. Billing/checkout/Paddle regressions
cover amount/currency normalization, correct SKU, Free status-only, portal routing,
status failures and empty catalog. No real payment completed. Preview HMR logged
createRoot warnings during edits; fresh navigation is used for acceptance.
Production rollout and physical-device/payment-provider acceptance are not claimed.

No remaining actionable P0/P1/P2 visual findings within the requested catalog adaptation.

Fresh English browser tab: LTR rendering and clean console verified; `implementation-ltr.png`. An English charge-line separator was corrected after this screenshot.

## Authenticated DEV acceptance

Render deploy `dep-dbck1r29lscs73e5liv0` is Live at source commit
`d9d11230ea19f9bb463c031c5ae6423bdaa81823` (2026-10-22 01:48:11 Asia/Jerusalem).
`https://gotit-dev.rbaseapp.com/billing` and `/ready` return 200; served billing
chunk is `BillingPage-DMH-PNIc.js`. Existing authenticated account loads actual
Core plans, zero remaining minutes and Paddle ILS quotes. Monthly/quarterly/yearly
selection and quarterly Pro unavailability were verified without submitting a
purchase; console errors/warnings: none. Evidence stays local in
`output/pricing-evidence/dev-deployment.json`, `dev-acceptance.json` and
`dev-pricing.png`. No account screenshot is published to the Git repository.

Final focused gate: 20 billing/Paddle/localization tests passed; 23 gateway tests,
typecheck, ESLint and production build passed. The broad suite had 429/430 passing
and an English-path wait that passed separately on both baseline and changed tree;
a clean complete broad-suite pass is not claimed. No real payment was completed.
