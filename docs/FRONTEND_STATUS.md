# Frontend delivery status

Source of truth: all 20 files in `rbaseapp_project_docs_updated`, checked against the current read-only Core and GotIt sources. Active implementation is exclusively `gotIt-front`.

## Capability coverage

| Capability | Frontend | Real service requirement |
| --- | --- | --- |
| Email register/login, me, refresh, logout | Implemented against documented Core API | Reachable, configured Core |
| Profile, languages, CEFR A1–C2, goals, interests, timezone | Implemented against B1 GET/PATCH | Reachable GotIt B1 |
| Word library, filters, tags, editing, senses and occurrences | Interactive local demo; live availability screen | B2/B7 contracts and endpoints |
| Selected-word sessions, flashcards, typed/MCQ recall, listening, matching | Interactive local demo with stable snapshots and attempt evidence | B3/B5 contracts and endpoints |
| Soft delete/restore, pause, archive, manual mastery | Local demo preserves history and skill scores | B2/B4 lifecycle endpoints |
| Mastery calculation, review scheduling, recommended queues | Deliberately not reimplemented in client | B4 configuration and learning engine |
| XP, level, streak, time, dashboard | Evidence-based demo statistics, sample skill scores explicitly labeled | B4/B8 authoritative aggregates |
| Pronunciation | Browser TTS, transient microphone recording/playback; no evaluation or score | B6 provider and contract |
| AI reading | Controls, source-context examples, highlighted words, local opened-history | B9 provider, generation and quiz contracts |
| Google | Availability text only, no pretend login | GotIt browser OAuth client configuration |
| Email verification/password reset/reminders | Availability text only | Core/product service workflows |
| Import/export, extension synchronization | Not implemented; not invented from an absent contract | B10, extension integration contracts |

Production learning cannot be completed within a frontend-only authorization while B2–B10 services and several product policies remain open. Demo evidence types are intentionally local and do not claim to be the unpublished server DTOs. Future integration must adapt to finalized contracts, including server queues, attempt idempotency and authoritative aggregates, rather than exposing the demo reducer as a production engine.

## Automated acceptance checks

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Tests cover identity/response validation, password field policy, profile payload allowlisting, CEFR and goal limits, canonical language/interest handling, real-profile UI wiring with mocked responses, live/demo isolation, refresh single-flight and rotation, bounded 401 retries, pending-refresh logout safety, network/server failures, stable targeted queues, partial spelling correction, session completion/replay, XP replay cap, soft delete/restore and history preservation, and reading without evidence/XP.

No tests modify an external account or database. jsdom cannot verify layout, audible TTS, actual browser permission prompts, codecs or device microphone capture. The in-app browser was unavailable in this session, so visual/device QA is still required.

## Manual browser acceptance checklist

1. Open desktop and 375px mobile views; confirm RTL navigation, legible copy, tables and modals without page overflow.
2. Use keyboard only: open/close a modal, Tab/Shift+Tab, Escape, and confirm focus is restored. Use Ctrl/Cmd+K in the library.
3. Add/edit a word in a non-English language pair; add a second sense with the same spelling. Explicitly merge a context and confirm accepted translation/progress remain unchanged.
4. Select words and launch a targeted session. Complete, replay, skip, leave midway, reload, and inspect retained local history.
5. Play TTS using the item's language. Allow, deny and dismiss microphone permissions; record, stop and replay. Leave while recording and confirm microphone use ends.
6. Change each daily-goal type and timezone. Confirm measured attempts/items/minutes are reflected and profile validation rejects unsupported values.
7. Test actual Core login/register/refresh/logout and GotIt GET/PATCH in an approved integration environment; verify service errors and expired tokens. Do not use real credentials in automated fixtures.
8. Deploy the built SPA behind configured API proxies or approved HTTPS/CORS. Deep-link directly to library and game routes.

## Deployment blockers outside this frontend

- GotIt production URL and cross-origin policy are not documented/configured.
- The local Core tree already contains overlapping product-route changes; no repairs were authorized or performed.
- Google client ID/origin policy, AI/pronunciation providers and production mastery/review/XP rules remain open.
- Browser visual and real-service end-to-end verification have not been performed.
