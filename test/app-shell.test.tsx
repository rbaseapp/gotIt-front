import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { LearningStatusSource } from "../src/components/LearningStatusSource";
import { AppShell } from "../src/components/AppShell";
import { seedProfile } from "../src/data/seed";
import i18n from "../src/i18n";

const mocks = vi.hoisted(() => ({
  mode: "live",
  role: "admin",
  tier: "paid",
  list: vi.fn(),
}));

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: seedProfile,
    stats: { streak: 0, xp: 0 },
    items: [],
    mode: mocks.mode,
    user: { role: mocks.role },
    profileError: "",
    retryProfile: vi.fn(),
  }),
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({
    status: { tier: mocks.tier },
    hasEntitlement: () => true,
  }),
}));
vi.mock("../src/lib/privateLesson", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/privateLesson")>()),
  listPrivateLessons: mocks.list,
}));
vi.mock("../src/components/SubscriptionBanner", () => ({
  SubscriptionBanner: () => null,
}));
vi.mock("../src/components/LiveCaptureModal", () => ({
  LiveCaptureModal: () => null,
}));
vi.mock("../src/components/AddWordModal", () => ({
  AddWordModal: () => null,
}));

vi.mock("../src/components/DefaultLearningStatusBar", () => ({
  DefaultLearningStatusBar: () => (
    <LearningStatusSource
      goal={{ type: "items", current: 3, value: 20 }}
      streakDays={2}
      language={{
        value: "en",
        options: ["en", "ar"],
        translationCode: "he",
        onChange: vi.fn(),
      }}
    />
  ),
}));

function show(entry = "/dashboard", onLogout = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppShell onLogout={onLogout}>
        <h1>Dashboard content</h1>
      </AppShell>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.mode = "live";
  mocks.role = "admin";
  mocks.tier = "paid";
  mocks.list.mockReset();
  mocks.list.mockResolvedValue([
    {
      status: "completed",
      targetLanguageCode: "en",
      report: { assessment: { overallLevel: "B1" } },
    },
  ]);
});

it("keeps the lesson level in the top bar without a sidebar duplicate or live banner", async () => {
  show();
  const topbar = document.querySelector(".topbar")!;
  const sidebar = document.querySelector(".sidebar")!;
  await waitFor(() =>
    expect(within(topbar).getByRole("link", { name: /B1/ })).toHaveAttribute(
      "href",
      "/private-lesson?view=level",
    ),
  );
  expect(within(sidebar).queryByText("B1")).not.toBeInTheDocument();
  expect(document.querySelector(".sidebar-skill-assessment")).toBeNull();
  expect(document.querySelector(".mode-banner")).toBeNull();
  expect(
    screen.getByRole("heading", { name: "Dashboard content" }),
  ).toBeInTheDocument();
});

it("keeps the Free read-only notice and the demo notice", () => {
  mocks.role = "user";
  mocks.tier = "free";
  const view = show();
  expect(document.querySelector(".mode-banner.live")).toHaveTextContent(
    "מצב צפייה בלבד",
  );
  view.unmount();
  mocks.mode = "demo";
  show();
  expect(document.querySelector(".mode-banner.demo")).not.toBeNull();
});

it.each([
  "/dashboard",
  "/learn",
  "/vocabulary",
  "/courses",
  "/private-lesson",
  "/account",
])("uses the same header navigation and labels on %s", (entry) => {
  vi.stubEnv("VITE_DASHBOARD_DESIGN", "true");
  vi.stubEnv("VITE_PRACTICE_DESIGN", "true");
  vi.stubEnv("VITE_MYWORDS_DESIGN", "true");
  show(entry);
  const nav = document.querySelector(".app-top-navigation")!;
  expect(
    within(nav)
      .getAllByRole("link")
      .map((link) => ({
        href: link.getAttribute("href"),
        text: link.textContent,
      })),
  ).toEqual([
    { href: "/dashboard", text: i18n.t("ux.today") },
    { href: "/courses", text: i18n.t("ux.programs") },
    { href: "/private-lesson?practice=free", text: i18n.t("ux.freeChat") },
    { href: "/learn", text: i18n.t("ux.practice") },
    { href: "/vocabulary", text: i18n.t("ux.words") },
  ]);
  if (entry !== "/account")
    expect(nav.querySelector(".active")).toHaveAttribute(
      "href",
      entry === "/private-lesson" ? "/private-lesson?practice=free" : entry,
    );
  expect(document.querySelectorAll(".app-topbar")).toHaveLength(1);
  expect(document.querySelector(".topbar")).toBeNull();
});

it("keeps account-menu focus, Escape, outside dismissal and logout after extraction", async () => {
  const logout = vi.fn();
  show("/dashboard", logout);
  const topbar = document.querySelector(".topbar")!;
  const button = within(topbar).getByRole("button", {
    name: i18n.t("shell.accountMenu"),
  });
  fireEvent.click(button);
  await waitFor(() =>
    expect(document.querySelector(".user-popover a")).toHaveFocus(),
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(button).toHaveFocus();
  fireEvent.click(button);
  fireEvent.pointerDown(document.body);
  expect(document.querySelector(".user-popover")).toBeNull();
  fireEvent.click(button);
  fireEvent.click(
    within(topbar).getByRole("button", { name: i18n.t("shell.logout") }),
  );
  expect(logout).toHaveBeenCalledOnce();
});

it("retains the safe return destination in focus screens", () => {
  show("/private-lesson?return=%2Fvocabulary%3Flibrary.page%3D2");
  expect(document.querySelector(".focus-back")).toHaveAttribute(
    "href",
    "/vocabulary?library.page=2",
  );
});

it("keeps the bar and metrics mounted while route controllers unmount and reload", () => {
  vi.stubEnv("VITE_DASHBOARD_DESIGN", "true");
  vi.stubEnv("VITE_PRACTICE_DESIGN", "true");
  vi.stubEnv("VITE_MYWORDS_DESIGN", "true");
  const onChange = vi.fn();
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppShell onLogout={vi.fn()}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <div className="page-specific-styles">
                <LearningStatusSource
                  goal={{ type: "items", current: 3, value: 20 }}
                  streakDays={2}
                  language={{
                    value: "en",
                    options: ["en", "ar"],
                    translationCode: "he",
                    onChange,
                  }}
                />
              </div>
            }
          />
          <Route
            path="/learn"
            element={
              <LearningStatusSource
                language={{
                  value: "en",
                  options: ["en", "ar"],
                  translationCode: "he",
                  onChange,
                }}
              />
            }
          />
          <Route path="/courses" element={<h1>Programs</h1>} />
        </Routes>
      </AppShell>
    </MemoryRouter>,
  );
  const header = document.querySelector(".app-topbar");
  const status = document.querySelector(".learning-status-bar");
  const goal = screen.getByRole("progressbar");
  const streak = document.querySelector(".learning-status-streak");
  // The status shares the header's row instead of a bar of its own.
  expect(status?.parentElement).toBe(
    document.querySelector(".app-header-status"),
  );
  expect(header?.contains(status ?? null)).toBe(true);
  expect(document.querySelector(".app-learning-status")).toBeNull();
  expect(
    document.querySelector(".page-content .learning-status-bar"),
  ).toBeNull();
  const nav = within(document.querySelector(".app-top-navigation")!);
  fireEvent.click(nav.getByRole("link", { name: i18n.t("ux.practice") }));
  expect(document.querySelector(".app-topbar")).toBe(header);
  expect(document.querySelector(".learning-status-bar")).toBe(status);
  expect(screen.getByRole("progressbar")).toBe(goal);
  expect(goal).toHaveAttribute("value", "3");
  expect(document.querySelector(".learning-status-streak")).toBe(streak);
  expect(streak).toHaveTextContent("2");
  expect(document.querySelectorAll(".learning-status-bar")).toHaveLength(1);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "ar" } });
  expect(onChange).toHaveBeenCalledWith("ar");
  fireEvent.click(nav.getByRole("link", { name: i18n.t("ux.programs") }));
  expect(document.querySelector(".learning-status-bar")).toBe(status);
  expect(screen.getByRole("progressbar")).toBe(goal);
});
