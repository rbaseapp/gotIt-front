import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
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
  [
    "/dashboard",
    [
      "/dashboard",
      "/courses",
      "/private-lesson?practice=free",
      "/learn",
      "/vocabulary",
    ],
  ],
  [
    "/learn",
    [
      "/dashboard",
      "/courses",
      "/learn",
      "/vocabulary",
      "/private-lesson?practice=free",
    ],
  ],
  [
    "/vocabulary",
    [
      "/dashboard",
      "/vocabulary",
      "/learn",
      "/private-lesson?practice=free",
      "/courses",
    ],
  ],
])("preserves navigation order and active route for %s", (entry, routes) => {
  vi.stubEnv("VITE_DASHBOARD_DESIGN", "true");
  vi.stubEnv("VITE_PRACTICE_DESIGN", "true");
  vi.stubEnv("VITE_MYWORDS_DESIGN", "true");
  show(entry as string);
  const nav = document.querySelector(".nd-top-navigation")!;
  expect(
    within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href")),
  ).toEqual(routes);
  expect(nav.querySelector(".active")).toHaveAttribute("href", entry);
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
