import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionBanner } from "../src/components/SubscriptionBanner";
import { SubscriptionProvider } from "../src/context/SubscriptionContext";

const mocks = vi.hoisted(() => ({ status: vi.fn() }));

vi.mock("../src/lib/billing", () => ({
  billing: { status: mocks.status },
}));

function renderBanner() {
  return render(
    <MemoryRouter>
      <SubscriptionProvider enabled>
        <SubscriptionBanner />
      </SubscriptionProvider>
    </MemoryRouter>,
  );
}

describe("SubscriptionBanner", () => {
  beforeEach(() => mocks.status.mockReset());

  it("shows remaining trial days, PRO benefits and an upgrade action", async () => {
    mocks.status.mockResolvedValue({
      tier: "trial",
      access: true,
      plan: { key: "pro-monthly", name: "GotIt Pro", kind: "paid" },
      entitlements: ["vocabulary.write", "practice.play", "reading.ai"],
      subscription: null,
      trial: {
        status: "active",
        startedAt: "2030-01-01T00:00:00.000Z",
        endsAt: "2030-01-15T00:00:00.000Z",
        daysRemaining: 6,
      },
    });
    renderBanner();

    expect(await screen.findByText("נותרו 6 ימים לניסיון")).toBeInTheDocument();
    expect(screen.getByText("כל המשחקים והתרגולים")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "שדרוג ל־PRO" })).toHaveAttribute(
      "href",
      "/billing",
    );
  });

  it("shows a compact PRO identity for a paid account", async () => {
    mocks.status.mockResolvedValue({
      tier: "paid",
      access: true,
      plan: { key: "pro-monthly", name: "GotIt Pro", kind: "paid" },
      entitlements: ["vocabulary.write", "practice.play", "reading.ai"],
      subscription: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEndsAt: "2030-02-01T00:00:00.000Z",
      },
      trial: null,
    });
    renderBanner();

    expect(await screen.findByText("משתמש PRO")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ניהול המנוי" })).toHaveAttribute(
      "href",
      "/billing",
    );
  });

  it("keeps expired users' data visible while presenting the upgrade", async () => {
    mocks.status.mockResolvedValue({
      tier: "free",
      access: true,
      plan: { key: "free", name: "GotIt Free", kind: "free" },
      entitlements: ["vocabulary.read", "dashboard"],
      subscription: null,
      trial: {
        status: "expired",
        startedAt: "2030-01-01T00:00:00.000Z",
        endsAt: "2030-01-15T00:00:00.000Z",
        daysRemaining: 0,
      },
    });
    renderBanner();

    expect(
      await screen.findByText("תקופת הניסיון הסתיימה"),
    ).toBeInTheDocument();
    expect(screen.getByText(/המילים והנתונים שלך שמורים/u)).toBeInTheDocument();
  });
});
