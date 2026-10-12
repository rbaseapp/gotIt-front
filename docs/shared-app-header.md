# Shared application header

The DEV live application uses the **Today** header design on every `AppShell`
route. Navigation order, labels, logo, account control, colors, sizing and spacing
are fixed. Only the active link, live metrics and language state change. There is
no page variant prop or page-owned header CSS. Production/demo retain their
existing rollout boundary; full-screen learning sessions retain session controls.

## Ownership

- `Topbar.tsx` and `Topbar.css` own the fixed DEV topbar. `appNavigation.ts` provides
  one route catalogue and one header order. The shell owns entitlement checks and
  capture modal state; Add word remains available in the common account menu.
- `TopbarAccountMenu.tsx` owns keyboard focus, Escape/outside dismissal and logout.
- `LearningStatusBar.tsx` and `.css` own one controlled goal/streak/language UI.
- `AppShell` owns one `PersistentLearningStatusBar` immediately below the topbar,
  before page content and notices. `LearningStatusProvider` is keyed by auth mode,
  application and user. Its in-memory snapshot survives route controller handoffs.
- `LearningStatusSource` publishes page-owned data and actions through a stable
  context; it never mounts a separate visible bar inside the shell. Pending/failed
  same-language requests retain the last server goal/streak. Successful values,
  including zero, update the existing DOM nodes. A language change clears previous
  metrics until scoped data arrives; no data is retained across authenticated owners.
  A controller gap disables the select without removing the display or invoking
  an unmounted page callback. No persistent metric cache or extra request is added.
- Dashboard, practice and My Words supply their existing live data and callbacks.
  Other shell routes use `DefaultLearningStatusBar` to read existing dashboard
  projections. No duplicate fallback is mounted on the three page-owned routes.
- `useLearningLanguage` broadcasts selection changes to mounted consumers. Existing
  persistence, language-list loading/error rules and scoped page callbacks remain.

## Reuse

New shell screens inherit the fixed topbar and default status bar automatically.
A page that needs a scoped status controller can publish the same controlled data
and opt out of the default controller in `AppShell`. Do not add route-specific
header markup, CSS or visual variants.

```tsx
<LearningStatusSource
  goal={dashboard.data?.dailyGoal}
  streakDays={dashboard.data?.gamification.currentStreakDays}
  language={{
    value: language.code,
    options: language.languages.map((entry) => entry.code),
    translationCode: profile.defaultTranslationLanguage || "he",
    disabled: language.loading || scoped,
    onChange: changeLanguage,
  }}
/>
```

Outside the shell provider, the source renders the controlled UI in place, making it reusable in
standalone previews and tests. It performs no API/storage/navigation actions;
callers own these. Missing goal/streak values stay absent, zero remains visible,
progress is bounded and language labels follow UI locale and RTL/LTR direction.

The earlier portal design (`a3a3065`) still remounted each page's visible bar and
briefly omitted its unloaded metrics. Lifecycle regression tests now navigate
between distinct route controllers, assert DOM identity and inspect mutation
records for removals during loading, controller gaps and metric refresh. They also
cover zero values, language isolation and owner reset. A local browser fixture
delays dashboard reads by two seconds to inspect the header while the next page
is still loading; final DEV acceptance is recorded in the canonical specification.

## Verification

The owner corrected the initial `bf55d86` refactor: sharing source while retaining
page-specific visual variants did not satisfy the fixed-header requirement.
The replacement removes these variants and page overrides. Local typecheck,
ESLint, production build, 317 unit tests (53 files, fork workers) and 20 gateway
checks passed for the lifecycle correction. The 22 focused header/language checks
passed again after the selected-language option safeguard.

Local browser fixtures compare dashboard, practice, My Words and programs at
1440px Hebrew, 320px Hebrew and 390px English. All 12 cases have exactly one bar,
no document horizontal overflow and identical topbar/status/language/account
rectangles and computed styles for each viewport/locale. Artifacts:
`output/playwright/uniform-header-*`. These fixtures do not establish live
backend/provider availability. Deployment evidence belongs to the maintained
specification, `docs/05_WEB_FRONTEND.md`, rather than this source checkpoint.
