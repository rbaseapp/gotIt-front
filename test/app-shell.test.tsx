import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "../src/components/AppShell";
import { seedProfile } from "../src/data/seed";

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

function show() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppShell onLogout={vi.fn()}>
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
  expect(screen.getByRole("heading", { name: "Dashboard content" })).toBeInTheDocument();
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
