# My words: DEV implementation

Selected source: [Claude artboard ef360ce5746b](https://claude.ai/artifact/QxCJLacpzBzSSFVDuaotRV#artboard-ef360ce5746b), “המילים שלי · גרסה 2 (לפי ההדמיה)”. `MyWordsV2.original.html` is the exported reference, not executable application code. The supplied mascot PNG and decorative card wave are reused in `src/assets/mywords`.

`/vocabulary` uses `DevMyWordsPage` only on exact host `gotit-dev.rbaseapp.com`. Explicit loopback previews require `VITE_MYWORDS_DESIGN=true`. Production and demo retain their existing screen. The page is lazy-loaded.

The hero, goal/streak strip, search, challenge filter, multi-origin/POS/status filters, category counts, seven server sorts, card/list views, paginated loading, bulk toolbar, capture modal and side drawer use live APIs. Categories come from installed topics and user tags; illustrative source counts/categories are not seeded into accounts. Cards show the real source word, translation, POS, optional pronunciation guide, source host, status, five memory segments and timezone-based review date. Program provenance is shown when no page source exists. Missing context is explicit.

The drawer has highlighted plain-text source context, a safe source link, current-revision correct/total answers, next review, category, exact-word practice, manual mastery/return, tag editing, recoverable deletion and the existing richer detail editor. Selected practice IDs, library filters, language and page survive return navigation. Writes retain server entitlement, ownership, idempotency and confirmation behavior. No client grading/rewards or schema migration.

Backend release: `c66eb8d04a5e93594cf607c647b02e5c3afa768d`, based on deployed `cc7019f`. Its optional `GET /learning-items?view=cards` projection adds scoped source/POS/tags/program/answers and unfiltered language/status summary counts. New comma-separated `origins`, `partsOfSpeech`, and `learningStatuses` support combined filters. Card search also finds current translations and captured sentences. Legacy list responses retain their shape.

Verification: complete Web typecheck/lint/build and 20 gateway tests; 297 unit tests initially, then five focused word-screen regressions after the return-pagination fix. Final release gate is recorded in the specification. Windows Vitest thread execution stalled; the same complete suite passed with `--pool=forks --maxWorkers=2 --fileParallelism`. Backend: 257 fast, 34 real PostgreSQL practice tests, daily-task reward integration, typecheck/build. See [design QA](design-qa.md) for browser comparison evidence. No real account vocabulary was created, deleted or marked mastered for visual fixture testing.

Canonical release record: `gotit-project-spec/docs/38_MY_WORDS_DESIGN_DEV.md` (SCR-05 / UC-03 / P06).
