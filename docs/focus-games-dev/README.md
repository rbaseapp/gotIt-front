# Approved DEV focus games

Implementation base: `6740e16`; isolated branch `feat/practice-games-dev-20261011`.
The owner authorized DEV only. Exact hostname gate, production and demo separation
are unchanged. No Backend/Core/Chrome, migration, gateway or provider configuration change.

The [Claude artifact](https://claude.ai/artifact/QxCJLacpzBzSSFVDuaotRV) supplies
the five games, four transitions and animated completion. The supplied
`49f4d980cab5` is another drag-to-listening transition. Every mode now has a
generalized receipt-based transition and final completion.

`asset-provenance.json` verifies all 22 original rasters byte-for-byte using
SHA-256. `transition-confetti.svg` copies the original SVG artwork; only the root
SVG namespace was added. No exported vendor runtime is executed or bundled.

## Real behavior

- Flashcards: reveal, explicit server self-rating, keyboard shortcuts and read-only back navigation.
- Matching: opaque choice IDs, pointer/tap connections, duplicate-meaning exclusion, acknowledged pair locking and correction.
- Drag: actual redacted context or translation fallback, four server-issued choices when possible, pointer/touch/click/keyboard selection and assisted hint tracking.
- Listening: actual item audio, slow playback, repeated letter tiles, native keyboard, server whole-word grading and a fresh second attempt.
- Pronunciation: bounded WAV recording, existing real assessment endpoint, receipt-based feedback, microphone cleanup and skip/error recovery.
- One scoped smart session, applicable skill/speech guards, replay/repair, stable creation and answer retries, owner-scoped checkpoint/resume and authoritative close totals.
- Original completion poses/gift animation; reduced motion and animation skip; actual XP, accuracy, streak and dashboard level projection.

Prototype words/counts, sample XP and reward accessories are replaced with real
data. IPA/POS are optional existing metadata. No invented stress, sentence
translation, per-letter grading, mastery claim or accessory award. Server-issued
matching content/count can differ from the sample's four words/fifth distractor.
Exercise issuance has no idempotency contract; a lost issuance response can leave
an unused exercise. Scoring/creation retry intent stays stable.

## Verification

Full `npm run check` passed: typecheck, ESLint, 271 unit tests / 50 files, build,
and 20 gateway/source-map security tests. Later changes were checked with the
focused game suite, lint and production build; the suite additionally covers an
ambiguous creation response surviving a remount.

Browser verification used temporary in-memory API middleware on loopback.
It made no live learning/database/provider writes. Screenshots cover all five
layouts, actual pointer drag, tap/native typing, skipped words, all stage
transitions, exit modal, gift and completed summary. Temporary narrow iframes
provided actual 320/390 CSS-pixel viewports: DOM content width equals viewport
width, in Hebrew RTL and English LTR. Lower pronunciation controls remain
reachable by scrolling. The temporary harness is excluded from the release.

React hot-reload errors occurred while changing hook/component signatures during
development; final verification uses cold loads. The final QA report records
the clean-load console check, comparisons and remaining provider acceptance gap.
Real microphone recording, live audio playback and paid assessment were not
performed. Local mocked receipts do not establish external provider health.

See project-root [design-qa.md](../../design-qa.md) and the specification's
`docs/37_FOCUS_GAMES_DEV.md` for canonical acceptance/release evidence.

## DEV availability regression (2026-10-11)

The first release incorrectly treated a library language absent from the profile-only capabilities list as having no enabled skills. The hub allowed entry while the game rejected it before session creation. Both now share skill resolution: an existing language capability entry is authoritative; otherwise the game reads the real profile preferences, retaining the server default only when preferences are absent. Explicitly disabled skills remain disabled; no profile write is made. The hub now exposes all five approved games directly, with writing/mixed practice, replacing three unfinished placeholder cards. Listening requires both listening and spelling plus speech configuration in both entry points.

Regression coverage starts all five games and mixed practice with an omitted language, preserves disabled preferences and verifies every visible game card destination. `npm run check` passed typecheck, lint, 284 unit tests in 50 files, production build and 20 gateway/security tests. Live DEV acceptance is tracked in the canonical specification.

## Owner visual corrections — 2026-10-11 (local working tree)

The exit dialog now follows the original exported flashcard `xq` design: mint mascot band, centered “לצאת באמצע?”, actual stage/card position, “להמשיך לשחק” and an underlined “לצאת, נמשיך אחר כך”. All eight catalogs retain equivalent localized copy; progress remains tab-scoped.

Flashcards now connect the exported 380ms rating exit, colored rating stamp, 420ms incoming deck and previous-card animation to the real engine. Rating starts the motion immediately while the answer is submitted; only an acknowledged receipt advances. Reduced motion bypasses the animation wait. A failed submission restores the visible card and existing stable retry.

Matching shows a dashed connection on selection and stretches it with the pointer, including captured pointer/touch gestures. Pending choices connect immediately; correct/incorrect colors and XP follow the actual server receipt without an added feedback timeout. Latency of a deployed API is unchanged. Preview direction and coordinates follow actual board geometry in RTL/LTR; the small-screen coach/help row wraps within the viewport.

Completion retains the final game board as an inert background and opens the original mascot/gift/summary flow in a bounded, scrollable shared Modal. The close control stays available while scrolling. Modal portals explicitly follow the UI locale's direction. Resume/checkpoint, authoritative totals and the existing completion endpoint remain intact.

Verification: `npm run check` passed typecheck, lint (zero warnings), 287 unit tests / 50 files, build and 20 gateway/security tests. Final CSS polish was additionally checked by formatting, lint/build and Chrome screenshots. Browser fixtures verified tap, actual pointer connection, a wrong answer, exit/cancel/focus, animated flashcard progression, gift/skip/summary, 320/390px RTL and English LTR. Final cold load: zero console errors/warnings; the earlier optional-metadata fixture 404s and development hot-reload errors were excluded by restarting with a complete local fixture.

Evidence: [captures](corrections-20261011/). The attached video was not available; flashcard motion was recovered from the original local exported source. No live API, database, microphone/provider call, publication or deployment was performed for this correction. Existing production/DEV gates remain unchanged; DEV release is pending.
