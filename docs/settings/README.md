# Settings reference design — DEV, 2026-10-14

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
