# GotIt UX 2.1 — DEV implementation checkpoint

## Scope and source

- Source of decisions: `GotIt-Consolidated-Review-and-Development-Spec-HE-v1.1.md`
  in the owner's `gotit-ux-v2-2026-10-05` delivery, superseding 2.0.
- Editable design: [Figma 2.1](https://www.figma.com/design/kgMHTv0q4TJdwxCHYzUnSM/GotIt-UX?node-id=56-2).
- Motion reference: owner-supplied `GotIt-Animations/GotIt-Animations.html`.
- Delivery branch: `feat/ux-2-1-dev`. **Do not merge or push this release to main**:
  production follows main. This request authorizes DEV only.
- Existing Core, Backend, Chrome and database contracts are retained. No migration.

## Screen/flow coverage

| Design families                                              | Live route or component                       | Implementation                                                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HOME, WORDS_HOME, NO_WORDS                                   | `/dashboard`                                  | One next action, actual active session, explicitly chosen program, due/new words, optional metrics and achievements. No auto-selection of a course.                                               |
| PROGRAMS, NEW_PROGRAM                                        | `/courses`, program chooser                   | Language groups, active/completed views, explicit selection, independent words/free conversation, existing course deletion confirmation.                                                          |
| WELCOME, INTAKE, PREF_REVIEW, PLAN_APPROVAL                  | `/courses?new=1`, `/courses/:id`              | Existing intake, separate preference/plan approvals, current message with expandable prior conversation, full plan and edit/version controls.                                                     |
| PERSONAL_MAP, MAP, UNIT_WORDS                                | `/courses/:id`, `/english-learning`           | Version-specific evidence, next lesson, collapsed levels/units, real unit words, preserved known/undo/add controls. Structured English catalog remains the current catalog pilot.                 |
| ACTIVITIES, HISTORY, SESSION_DETAILS                         | `/history`                                    | Practice pagination/language filter, actual active-session resume, read-only details, lesson-report links, homework. Lesson list uses existing bounded 50-record contract.                        |
| GAME_HUB, WARMUP, FILTERS                                    | `/learn`                                      | Existing server queue, independent games, explicit word/pack selection, capability gates, return context.                                                                                         |
| WORD_STUDY, RECALL, SPELLING, LISTEN, MATCH, DRAG, PRONOUNCE | `/learn/session/:type`                        | Existing study imagery/audio and authoritative exercises/attempts. Writing uses a full answer-language alphabet with repeat/delete/clear and normal keyboard/IME. No answer-derived letter bank.  |
| SMART_FEEDBACK, PRACTICE_SUMMARY                             | live session feedback/results                 | Existing server scores/XP, animations, optional effects, reduced motion, learned-word summary and restart/return.                                                                                 |
| LIBRARY, SAVEWORD                                            | `/vocabulary`, existing capture/detail modals | Smart/manual entry, selected-word games, preserved search/filter/page/selection on return, expandable row learning metrics, all existing advanced actions.                                        |
| READING_READER, READING_SAVE_FAILED                          | `/reading`                                    | Generated text readable immediately, automatic publication of the same preview, stable publication intent on retry, quiz after publication.                                                       |
| LESSON_PREP, CHAT_SETUP, TEACHERS, PREFS                     | `/private-lesson`, `?course=…`                | Actual teacher choices, existing preferences/support-language rules, independent warmup; scoped 30-minute preparation draft restored on explicit return.                                          |
| CHAT_LESSON, LESSON, HELP, RECONNECT, LESSON_SUMMARY         | existing private lesson flow                  | Current teacher message, expandable history, transcript speech at normal/slow rate, existing translation request, mute/end/disconnect/report/save states. No invented task/stage/resume protocol. |
| ACHIEVEMENTS and loading/error states                        | `/achievements`                               | User-opened server XP/level/streak/daily goal/weekly activity; learning retention separate. No invented gift, rank, badge or bonus rules.                                                         |
| Account/settings/billing/transfer/help                       | existing routes/account menu                  | Shared tokens, touch/type improvements, account status and secondary navigation; commercial banners on account-related pages.                                                                     |

The 247 canonical design states are review variants, not 247 independent features.
This checkpoint does **not** certify every variant as an independently implemented
server capability or every legacy screen as a pixel-exact design replica.

## Important behavior and limits

- Target, translation/support and UI languages are separate. The alphabet follows
  each server study card's language pair, not `prompt.languageCode` or a guessed
  English default. Ordinary writing retains only language metadata from study.
- Languages without a defined alphabet keep native text/IME input; they do not
  receive an unrelated letter keyboard. Letter clicks and native typing submit the
  same existing `answerText`; scores/scheduling/XP remain server-owned.
- Library return URL carries bounded presentation context, never resource authority.
  Preparation drafts are session-local, validated, user/application/language/course
  scoped and expire after 30 minutes. They are not lesson sessions or evidence.
- Replay synthesizes the **same transcript text using browser TTS**. It is not an
  archived recording of the teacher's original audio. Native voice availability
  varies; unsupported replay reports unavailable. Existing support-language
  translation uses the provider contract and does not advance a fabricated task.
- A teacher without microphone is not supported by the existing contract. The UI
  labels its alternative as independent written word practice, not text AI teaching.
- Guided task/stage snapshots, billing pause, durable voice-session resume,
  readiness-based teacher stations, per-skill channel capabilities, native Android
  sharing/billing and new reward economies remain separate proposed extensions.
- Hebrew/English new UX copy is authored. Root navigation is localized for the
  other six existing UI locales; many new helper strings use English fallback.
- Motion uses entry/fade/sheet/press/letter/feedback/XP/recording cues from the supplied
  reference. Existing teacher audio-driven animation is preserved; decorative
  timing never produces learning evidence. Reduced motion and game effects-off
  suppress movement while preserving feedback/actions.

## Verification and DEV release gate

Run `npm.cmd run check` and `npm.cmd run test:responsive -- --workers=4`.
Regressions cover hidden alphabet metadata in ordinary games, multilingual letters,
IME fallback, repeating letters, grouped spaces/capacity, stable article-publication
retry, context restoration, expired/cross-owner drafts, mobile navigation/focus,
course approvals/versioning, actual provider event fixtures and touch scrolling.
Browser fixtures intercept API calls; they do not prove real provider, microphone,
database or billing acceptance. Physical-device/zoom/screen-reader acceptance remains
separate from automated viewport coverage.

**Server deployment is blocked at this checkpoint.** Read-only Render inspection
confirmed that `gotIt-dev-backend` still uses the production database. The separate
`gotit_dev` database exists and its prior migration catch-up is documented in the
specification, but a direct DEV runtime credential was not verified. Do not perform
product mutations through this DEV service until it is retargeted and isolation is
verified. No production service/environment/database was changed for this release.

Read-only inspection also confirmed that Core DEV uses `gotit_dev` and that DEV Web's
Core/Backend proxy targets and public origin all point to their DEV services. Core's
existing connection uses the DEV administrator role; this task changed no credential
or database privilege. Backend isolation remains the deployment blocker.

After the owner completes the credential handoff, verify DEV Backend/Core runtime
database targets and readiness, configure only DEV Web to this release branch,
check `CORE_API_PROXY_TARGET`, `GOTIT_API_PROXY_TARGET` and `PUBLIC_APP_ORIGIN`, deploy
the exact commit and smoke authenticated learning against isolated DEV data.
The Vite fallback proxies point at production: for local manual work set explicit
safe targets; the automated tests use intercepted APIs.

Rollback is a DEV-only deployment of the prior Web commit/branch. No database down
migration is required. Test evidence and final source SHA are tracked in the separate
`gotit-project-spec` repository, `docs/28_UX_2_1_DEV.md`.
