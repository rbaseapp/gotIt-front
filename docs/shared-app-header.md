# Shared application header

`AppShell` renders one `Topbar` for its routes. The dashboard, practice and My Words
pages render the same controlled `LearningStatusBar`. Full-screen game sessions
retain their dedicated session controls.

## Ownership

- `src/components/Topbar.tsx`: header structure, shared desktop/mobile brand,
  navigation and actions. `variant` selects `standard`, `dashboard`, `practice` or
  `mywords`; `AppShell` retains the existing hostname/live/demo gates.
- `src/components/TopbarAccountMenu.tsx`: account popover, outside dismissal,
  Escape, focus restoration and logout callback.
- `src/lib/useTopbarAssessment.ts`: existing lesson-assessment loading/event
  lifecycle. No additional request or cache is introduced.
- `src/lib/appNavigation.ts`: one route catalogue for sidebar/mobile/header and
  explicit named-route ordering and labels for each header variant.
- `src/components/LearningStatusBar.tsx` and `.css`: one goal, streak and language
  selector implementation. CSS variables preserve visual variants, responsive
  container sizes, RTL/LTR and reduced motion without page-specific strip rules.

## Reuse

New shell screens inherit `Topbar` automatically. To add a header variant, update
the variant type, navigation configuration and shell selection rather than
copying the header. Entitlement checking for adding words remains in `AppShell`.

Use `LearningStatusBar` directly, passing the page's existing server data and
language callback:

```tsx
<LearningStatusBar
  variant="practice"
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

The component makes no requests, stores no language selection and performs no
navigation. Its caller owns scope, persistence, query parameters, pagination and
selection reset. Missing goal/streak data stays absent; zero remains visible.
The progress indicator is accessible and bounded while its text retains actual
server values. Language options are localized and deduplicated. No page wrapper
classes are needed for its layout.

## Verification

The local refactor is based on Web `8163860` in
`gotIt-front-mywords-dev`. Typecheck, ESLint, production build, 311 unit tests
(fork workers) and 20 gateway tests passed. Header regressions cover navigation
order/active route, safe return, account focus/dismissal/logout, controlled
language changes, missing/zero data and LTR localization.

Local browser fixtures compare the previous and shared header on `/dashboard`,
`/learn` and `/vocabulary` at 1440px Hebrew, 320px Hebrew and 390px English.
No document horizontal overflow; header and strip heights are preserved.
Screenshots and the comparison runner are under `output/playwright/shared-header-*`.
Fixtures verify header layout, not real backend/provider availability. No release
or deployment is included.
