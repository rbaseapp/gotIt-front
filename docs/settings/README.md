# Settings — DEV, 2026-10-22

Current owner's request supersedes the historical exclusions below. The DEV
settings view has nine dedicated category compositions, persisted account photo
and display name, actual Google/Facebook/Email connection status and provider
linking, and server-backed notification scheduling/consents. Apple is removed.
Web uses authenticated Core `auth/methods` reads and Google/Facebook linking,
product profile `displayName/avatarData`, and extended notification preferences.
Profile photo selection decodes/crops/strips metadata before explicit Save;
reload/header hydration uses the server copy. Email connection uses verified
password recovery; changing the identity email remains unsupported.

Reminder controls include master, minute, weekday selection, four kinds × two
channels, timezone guidance and overnight quiet hours. Initial read failures
offer retry; failed saves retain drafts. Push opt-in registers the service worker
and subscription. Actual recipient delivery and real provider linking require
user/provider interaction and are not claimed by configuration/readback checks.

Language/learning, teacher, interface, transfer/history, password recovery and
Paddle portal use existing services. Teacher focus/mix/personal goal controls
are composed under Goals and Practice. Profile saves and each remote editor
retain separate resource mutations. New high-contrast/text-direction preferences
are applied to the document. Existing production settings stay behind the rollout
boundary. No Chrome code or new client dependency was added.

The canonical cross-repository API/schema, scheduling semantics, consent defaults,
migration, ownership and traceability live in specification
`docs/42_SETTINGS_DESIGN_DEV.md`, Current contract — 2026-10-22. Backend requires
migration `1792645000000_settings-profile-and-reminders` before code deployment.
Core/Backend secrets stay server-side. DEV Facebook, email and VAPID configuration
was completed without changing production or auto-deploy settings.

Verification: full integrated Web checks passed 425 tests/68 files, typecheck,
lint, build and 23 gateway/security tests; final visual follow-up passed focused
settings cases, typecheck/lint/build and four Playwright cases. Browser checks
cover all nine sections at 1920/320, no document overflow/page errors, decoded PNG
photo preview/save, and keyboard reminder controls. Backend has 331 fast tests,
12 focused PostgreSQL cases plus a separate down/up migration rehearsal; Core
35 tests. Shared DEV program-map changes from `10e7c9d` are preserved.

Source/implementation inspection corrected card dimensions, tokens and teacher
composition. Literal 1:1 fidelity remains partial: existing logo/Mohi/teacher
assets differ; source-only recovery-email/delete/logout-all/extension/billing
details do not all have supported contracts. Twenty-five-minute lessons and free
mix are not offered because current lesson contracts do not accept them. Six
additional locales currently use English for newly introduced text; HE/EN are
translated. These are open gaps, not an approved fidelity exception.

Dated sanitized release evidence is in `evidence/20261022/release.json`.
Live profile screenshots contain owner data and remain local in `output/`;
committed screenshots contain only demo fixture data. The preview fixture is
`test/fixtures/settings-preview.*`; it never enters the normal application entry.

## Historical release — 2026-10-14

Owner requested the attached Hebrew settings design and explicitly chose the
currently supported settings scope. `/settings` now opens account/profile with
sidebar categories. Hash links preserve existing learning, teacher, notification
and interface entry points. At <=760px the sidebar becomes a horizontal category
strip. The canonical shared application header remains unchanged.

`SettingsPage` owns the rollout boundary; `DevSettingsPage` owns navigation and
composition; `SettingsProfile` owns profile editing; `settingsDesign` owns hash
normalization, the DEV gate and IANA timezone choices. `LegacySettingsPage` retains
the production view and supplies existing controlled editors by category.

Profile timezone persists through the existing authenticated product profile API.
The existing display-name behavior remains tab-local and is labeled accordingly.
Email comes from authenticated Core identity. Uploading an avatar, changing email
and reading/linking provider accounts are unsupported by current contracts: the
UI explains availability and never invents linked/unlinked status. Initials are
derived from the actual profile. Privacy, help, billing/minutes and transfer use
existing routes. Mohi help opens the existing help area, not a fictional chatbot.

Teacher and notification resources are loaded only in their respective category;
their saves do not also write the profile or the other resource. Failed initial
reads disable save and expose retry. Profile failures block profile mutations;
failed writes retain the draft. Modal focus/escape use the existing shared Modal.

Gate: `gotit-dev.rbaseapp.com`, or explicit `VITE_SETTINGS_DESIGN=true` on loopback
only. No production redesign, API/schema/Core/Backend/Chrome changes, migration,
new dependency or runtime provider calls. The prior DEV release/rollback source
is `edfdb63c3d64a6684cf09891fd980815940e2b0d`; branch base is `origin/dev@2fa495a`.

Assets: existing GotIt on-dark logo from the main Web repository, existing
program-chooser Mohi; Google G from
https://developers.google.com/identity/images/g-logo.png and Apple brand icon
from https://cdn.simpleicons.org/apple/164438 (Simple Icons). Assets are bundled;
there is no runtime dependency on these hosts. Standard UI icons use the existing
Lucide library. The existing logo/Mohi artwork is retained instead of regenerating
brand artwork; their exact illustration details differ from the attached mock.

Validation: full `npm run check` passed 358 Vitest cases/59 files, typecheck,
ESLint, build and 21 gateway/security cases. Eight focused cases cover rollout,
hash compatibility, unknown provider state, mutation isolation, failed read/write
retry, profile failure, timezone preservation and all eight locale catalogs.
Local browser: desktop Hebrew at 1667x1472, Hebrew/English at 320x780 (client/scroll
305/305), actual local-demo timezone save, category navigation, modal escape and
zero error/warning console entries. `design-qa.md` records fidelity decisions.
The local harness under `output/settings-preview.*` is excluded from release.

The full historical Playwright sweep, physical devices and live provider/identity
mutations were not run. The existing large main-bundle warning remains. Live DEV
release acceptance is recorded separately after deployment.

DEV release: exact Web `71dba25204f3dbed69ab00296590b566731c831f` is Live on
`srv-dar6dng473hc73a0ns1g` as `dep-db7o6fu7bikc73biu66g` (1m03s). `/ready` is 200.
Authenticated profile, learning, notifications and teacher preferences load;
both remote preference editors enable save after successful reads. Email
availability dialog, nine navigation categories, all four page images and no
document overflow/errors were checked. No live preference/provider/identity
mutation was performed. Auto-deploy remains disabled; configured service branch
and all production services are unchanged. `evidence/release.json` owns details.
