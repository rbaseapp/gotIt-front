# Responsive audit

Date: 2026-09-28

## Scope and completion standard

This audit is mobile-first and treats document-level horizontal overflow,
off-screen primary controls, unintended card overlap, and clipped fixed-layout
controls as release-blocking defects. Internal horizontal scrolling remains
allowed only where it is an explicit interaction pattern, such as the
vocabulary table.

The checked viewport matrix is:

- Phones: 320x568, 360x800, 375x667, 390x844, 393x852, 412x915, 430x932.
- Phone landscape: 568x320.
- Tablets: 768x1024, 820x1180, 1024x768.
- Desktops: 1280x720, 1440x900, 1920x1080.

These widths deliberately cover older 320px phones, common 360px Android
devices, 375px iPhones, the 390-393px class used by recent iPhones and Pixels,
large 412-430px phones, portrait tablets, and tablet/desktop landscape layouts.

## Automated coverage

`npm run test:responsive` runs Playwright against the local Vite application
with Hebrew UI and demo data. It currently verifies:

- `/dashboard`
- `/learn`
- `/vocabulary`
- `/settings`
- `/reading`
- `/transfer`
- `/help`
- `/terms-of-service`
- `/privacy-policy`
- `/refund-policy`
- `/billing/checkout`
- `/learn/session/smart`
- `/learn/session/flashcards`
- `/learn/session/recall`
- `/learn/session/listening`
- `/learn/session/matching`
- `/learn/session/pronunciation`

For every route and viewport, the suite rejects document-level horizontal
overflow. It also opens the mobile navigation and verifies the drawer remains
inside the viewport, has no unintended internal horizontal overflow, and keeps
both menu controls at least 44x44px. On every phone and portrait-tablet size it
opens the add-word modal and verifies the dialog and all visible form controls
remain inside the viewport. A long-content private-lesson fixture checks that:

- the timer and header controls stay inside the viewport;
- the report shell has no horizontal overflow;
- the grammar and vocabulary report cards never overlap.

Current evidence: **276 Playwright checks passed**.

## Defects found and fixed

### Private lesson header and timer

The long lesson title kept its intrinsic width in the RTL flex header. It
pushed the controls and timer beyond the left edge of phone and tablet
viewports. The title container can now shrink while the control group remains
fixed and visible. The status line is constrained to the available title
width.

### Grammar and vocabulary report content

Skill cards and report descendants retained min-content widths for long mixed
Hebrew/English content. This widened the report shell and could visually place
vocabulary content over adjacent grammar content. Report grid items now have
explicit shrink boundaries and long content can wrap. The assessment becomes
a single column at 560px and below.

### Settings at 320px

Grid children and the settings cards retained their min-content width, making
the document about 38px wider than the viewport. The grid, content, cards,
headings, fields, and field children now use explicit shrink boundaries.

### Mobile navigation target

The primary mobile menu button was 38x38px. It is now 44x44px at all mobile
and tablet breakpoints where the sidebar menu is used. Production verification
with the authenticated 320px sidebar also showed that the close control could
shrink to 40px beside the full live logo; both controls now have a fixed 44px
flex basis and cannot shrink.

## Verification commands

```powershell
npm run test:responsive
npm run check
```

`npm run check` covers TypeScript, ESLint, Vitest, the production build, and
the frontend gateway tests.

## Remaining live-device verification

The automated suite covers layout and overflow deterministically. The
following items require a real authenticated/live state or physical-device
behavior and remain separate sign-off items until checked:

- the real-time microphone permission and on-screen keyboard transitions;
- iPhone safe-area insets and Safari dynamic browser chrome;
- Android Chrome keyboard resizing during live lesson input;
- payment-provider UI rendered inside Paddle's hosted overlay;
- authenticated-only server states that cannot be produced with demo data.

These items must be recorded as verified or blocked before the broader audit
goal is marked complete.
