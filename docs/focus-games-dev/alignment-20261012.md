# DEV practice alignment — 2026-10-12

Source: owner-supplied `gotit-alignment-spec-plan-vs-dev.md` (11 October), with the owner's explicit decision to retain server-selected counts, XP and daily goals. Scope: the existing new DEV design only. Rollback source: `8f1cbd38f8c641d3d41307dc18a121a9d166cdf9`.

| Document item | Implemented behavior / acceptance |
| --- | --- |
| S1, §7 | 820px transition dialog, translucent scrim, pop, retained inert final game, segments inside the green header, score-dependent heading and last-game/summary labels. Escape opens the exit dialog; only one dialog traps focus. |
| S2, S4, S6 | Actual receipt XP updates/bump/float; zero awards are hidden. Compact feedback and 1.9-second automatic progression replace bottom Continue panels. Pending answers remain disabled and retry the same operation/payload; success and XP are never fabricated before acknowledgment. |
| S3, §3 | Wrong matching pair flashes/red preview for 1100ms and receives a fresh server question. Visible meanings map by text to each fresh opaque server choice ID. The original board survives the retry. Boards partition dynamically, use one extra server-issued owned meaning where the selected pool permits, and the last multi-board round supports audio/text toggle. Board success celebrates and advances after 1250ms. |
| S3, §4 | Wrong cloze choice shakes/red for 900ms, becomes unavailable, preserves the current sentence and requests a fresh question. After two errors the correct tile is highlighted. Solving speaks the full original sentence, reveals a real provider sentence translation when available, celebrates and advances automatically. Context is shortened around its gap to 14 words. |
| S5 | Compact desktop layouts fit 700px; mobile listening tray has reserved height and does not move after the first letter. No late Check button is inserted. Narrow layouts retain reachable controls and normal page scrolling when required by content or text size. |
| S7 | Stage first-attempt accuracy and session server accuracy determine the 75% heading threshold. Numeric accuracy is explicitly LTR. Practiced words count distinct attempted items; copy does not assert mastery or successful pronunciation for skipped words. |
| S8, S9, §5 | Listening uses authorized study data for immediate per-letter guidance; the server grades the full answer. Wrong letters do not enter slots; mistakes/hints mark assistance. Two errors allow a final try; the third reveals and queues the word once at the end. Error counts/requeue survive checkpoints. Native typing, tiles, backspace and click-to-remove work; audio-free mode writes from the translation and persists across words. |
| S10, §9 | Dynamic actual selected content, daily unique-word goals, target language, existing functional game/history/library links remain unchanged by the owner's decision. No demo counts, Spanish target or invented daily minutes were substituted. |
| §1.2 | Primary exit continuation receives autofocus, Escape works and normal game focus is restored. Checkpoint/progress and server retry semantics remain intact. |
| §1.3 | Automatic playback timers: flashcards 450ms, listening 250ms, pronunciation 300ms. Bounded current/next server audio is prefetched/cached; failure is a nonblocking toast. These timers do not promise an impossible network latency SLA. Full-sentence playback uses the existing browser TTS path. |
| §2 | Easy / Almost / Difficult order and helper text, all three stamps, 380ms outgoing / 440ms incoming, current-card navigation, difficult-review toast, localized real POS, source example at most 12 words plus provider translation. No unprovided POS/translation is invented. |
| §6 | App microphone consent, real existing assessment, five-second timer, three tries, slow tip, provider feedback/score. IPA and stress/syllable markers are rendered only when present in server phonetics. Can't speak ends the stage and pauses new speech games for 15 minutes. Provider failure offers explicitly unassessed continuation, recorded as skipped with no fabricated score/XP. |
| §8 | Fullscreen completion, eat → wow → gift → open → summary. Lead 900ms / word step 360ms / fly 500ms / pause 600ms / wow 1500ms. Three gift taps, 15 XP-count steps at 70ms, ten coins, confetti, decorative crown for actual perfect receipt totals or glasses for actual close bonus. Actual before/after streak changes after 600ms. Hardest word uses unique difficult items with audio. Replay resets animation counters. |
| §10 | DEV-scoped green/ink/muted tokens, original fonts/assets, white primary text, RTL/LTR and reduced-motion handling. A malformed imported flashcard selector was corrected. |

The primary recording consent states that audio is used for assessment; raw audio remains transient, never in checkpoints. No endpoint, learning rule, migration, Core or Chrome change was required. Extra matching questions remain bounded by the existing issuer's 100 outstanding-exercise limit.

## Verification and release evidence

`npm run check`: typecheck, lint, 293 tests / 50 files, production build and 20 gateway/security tests passed. Focused game/letter-input checks also passed (31 tests). Final transition focus and compact summary were verified in the browser. Local browser middleware is loopback-only, with in-memory fixture data; it is excluded from release. Live DEV evidence is appended below when deployed.

Observed locally: drag wrong retry / automatic success progression; listening letter rejection, stable tray coordinates, reveal and queue growth 4→5; 1366×700 drag document height 700; 390×700 listening document height 700 after final compact CSS. Screenshots are scaled browser previews of genuine CSS viewports, not a provider integration test.

Not established by local tests: microphone/device recording, audible output, external pronunciation quality and provider/network latency. IPA syllable boundaries/stress and POS are conditional on supplied metadata. A provider without syllable markers cannot support an invented per-syllable diagnosis. Decorative accessories do not create account rewards. No weekly-record claim is invented without a server record. Production stays untouched.

Final viewport checks: transition width 820px / height 539px in 1366?700; no close button in transition; primary action autofocus. Completion replay action ends at y=674, with all summary actions inside 700px. Local HMR briefly reset Feedback context after editing a shared component; a full reload restored the checkpoint. This is excluded from live acceptance evidence.

Narrow LTR listening at 320?700: width 320, audio-free action bottom y=690; page height 704 accommodates its trailing padding. Review transition counts include difficult items even after corrected retries.

## Live DEV release

Application source `62597664d6ceddc49736f2bd844ad9e0b9bdfa00` was pushed only to `dev` and deployed as `dep-db605ejbc2fs73abclcg` (Live, 55.4s, 2026-10-12 00:42 Asia/Jerusalem). `/ready`, `/learn`, focus JS/CSS returned 200; published focus CSS matched the final local build byte-for-byte. Tracked branch and disabled Auto-Deploy were preserved; production main stayed `778b3be97cd40b13283bcd446ff0697901945120`.

Authenticated two-item DEV drag acceptance verified wrong-tile rejection, fresh same-item retry, automatic progression, score-dependent transition (1/2 first try, one difficult word), three-tap gift and fullscreen summary with actual receipts and hardest word. Browser error/warning log was empty. Real listening acceptance verified letter rejection, second-error warning, third-error reveal and queue growth 2?3; translation mode persisted into the queued word, and actual XP updated to +3. A final text-only polish makes the silent-mode bubble prompt writing immediately. Final application source/deployment follows in the maintained specification.

Detailed live evidence: [canonical DEV release record](../../../gotit-project-spec/docs/37_FOCUS_GAMES_DEV.md). No direct database operation, configuration change or backend release was needed. Physical microphone, audible output and provider pronunciation quality were not tested. Server-unavailable self-rating awards and weekly records remain unfabricated.
