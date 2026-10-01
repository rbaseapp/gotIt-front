import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPage } from "../src/pages/BillingPage";
import { FeedbackProvider } from "../src/components/Feedback";
import i18n from "../src/i18n";

const mocks = vi.hoisted(() => ({
  plans: vi.fn(),
  status: vi.fn(),
  checkout: vi.fn(),
  checkoutOpen: vi.fn(),
  pricePreview: vi.fn(),
}));

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ profile: { email: "ori@example.com" } }),
}));
vi.mock("../src/lib/billing", () => ({
  billing: {
    status: mocks.status,
    plans: mocks.plans,
    minutes: vi.fn(async () => ({ secondsTotal: 3600, secondsUsed: 600, secondsRemaining: 3000, expiresAt: null })),
    checkout: mocks.checkout,
    portal: vi.fn(),
  },
}));
vi.mock("../src/lib/paddle", () => ({
  getPaddleRuntime: vi.fn(async () => ({
    paddle: { PricePreview: mocks.pricePreview, Checkout: { open: mocks.checkoutOpen } },
    countryCode: "IL",
  })),
  transactionIdFromCheckoutUrl: vi.fn(() => "txn_00000000000000000000000000"),
  checkoutSuccessUrl: vi.fn(() => "https://gotit.rbaseapp.com/billing"),
}));

const offer = (key: string, kind: "paid" | "one_time", interval: "month" | "quarter" | "year" | null,
  amountMinor: number, minutes: number, priceId: string) => ({
    id: crypto.randomUUID(), key, name: key.startsWith("tutor-195") ? "GotIt AI Tutor 3×/Week"
      : key.startsWith("tutor-60") ? "GotIt AI Tutor 60" : key === "minutes-60" ? "GotIt AI Minutes 60" : "GotIt Pro",
    kind, provider: "paddle", providerPriceId: priceId, amountMinor, currencyCode: "USD",
    billingInterval: interval, minuteAllowance: minutes || null, trialDays: 0,
    entitlements: kind === "paid" ? ["practice.play"] : [],
  });

const catalog = [
  { id: crypto.randomUUID(), key: "free", name: "GotIt Free", kind: "free", provider: null,
    providerPriceId: null, amountMinor: null, currencyCode: null, billingInterval: null,
    minuteAllowance: null, trialDays: 0, entitlements: [] },
  offer("pro-monthly", "paid", "month", 799, 0, "pri_01m358ydvk7q20ksq13mkj0j8b"),
  offer("pro-yearly", "paid", "year", 7000, 0, "pri_01m3592yg3h7pkj32vmw3drgec"),
  offer("tutor-60-monthly", "paid", "month", 1499, 60, "pri_01m3sv1xa1mn6ahjg8xqjxknx7"),
  offer("tutor-60-quarterly", "paid", "quarter", 4299, 180, "pri_01m3sv3m09yh0waewpafnrqxqe"),
  offer("tutor-60-yearly", "paid", "year", 15999, 720, "pri_01m3sv696bd1z7g3p9vsxzhzxm"),
  offer("tutor-195-monthly", "paid", "month", 4999, 195, "pri_01m3sv8zh709ww0m3sg2ddgqy8"),
  offer("tutor-195-quarterly", "paid", "quarter", 13999, 585, "pri_01m3svfxksqy6zqgh81n1myabp"),
  offer("tutor-195-yearly", "paid", "year", 52999, 2340, "pri_01m3svj5qtceyytrj3sp5dres6"),
  offer("minutes-60", "one_time", null, 1699, 60, "pri_01m3svm2v8tabv9kx3rd7wr2a0"),
];

function renderPage() {
  render(<MemoryRouter><FeedbackProvider><BillingPage /></FeedbackProvider></MemoryRouter>);
}

describe("BillingPage tutor offers", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    mocks.plans.mockResolvedValue({ plans: catalog });
    mocks.status.mockResolvedValue({
      tier: "free", access: true, plan: { key: "free", name: "GotIt Free", kind: "free" },
      entitlements: [], subscription: null, trial: null,
    });
    mocks.checkout.mockResolvedValue({
      url: "https://gotit.rbaseapp.com/billing/checkout?_ptxn=txn_00000000000000000000000000",
    });
    mocks.pricePreview.mockImplementation(async ({ items }: { items: Array<{ priceId: string }> }) => ({
      data: { details: { lineItems: [{ price: { id: items[0]!.priceId },
        formattedTotals: { total: "$" + ((catalog.find((plan) => plan.providerPriceId === items[0]!.priceId)?.amountMinor ?? 0) / 100).toFixed(2) } }] } },
    }));
  });

  it("shows all three subscription tiers and the independently purchasable 60-minute pack", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole("heading", { name: "GotIt AI Tutor 60" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GotIt AI Tutor 3×/Week" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GotIt Pro" })).toBeInTheDocument();
    expect(screen.getByText("195 AI tutor minutes included")).toBeInTheDocument();
    expect(screen.getByText("50 AI tutor minutes available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms-of-service");
    expect(screen.getByRole("link", { name: "Refunds" })).toHaveAttribute("href", "/refund-policy");
    await user.click(screen.getByRole("button", { name: "Buy 60 minutes" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledWith("minutes-60"));
    expect(mocks.checkoutOpen).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: "txn_00000000000000000000000000",
      customer: { email: "ori@example.com" },
    }));
  });

  it("shows Free only as the current plan, never as a selectable offer", async () => {
    renderPage();
    const currentPlan = await screen.findByText("GotIt Free");
    expect(currentPlan.closest(".billing-current")).toBeInTheDocument();
    expect(document.querySelector(".billing-grid")).not.toHaveTextContent("GotIt Free");
    expect(document.querySelectorAll(".billing-plan")).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "Choose plan" })).toHaveLength(3);
  });

  it("does not offer Free when a paid plan is current", async () => {
    mocks.status.mockResolvedValueOnce({
      tier: "paid", access: true, plan: { key: "pro-monthly", name: "GotIt Pro", kind: "paid" },
      entitlements: [], subscription: { id: "sub_123" }, trial: null,
    });
    renderPage();
    expect(await screen.findAllByRole("heading", { name: "GotIt Pro" })).toHaveLength(2);
    expect(screen.queryByText("GotIt Free")).not.toBeInTheDocument();
  });

  it("switches the tutor bank between quarterly and yearly billing", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "GotIt AI Tutor 60" });
    await user.click(screen.getByRole("button", { name: "Every 3 months" }));
    expect(screen.getByText("585 AI tutor minutes included")).toBeInTheDocument();
    const advanced = screen.getByRole("heading", { name: "GotIt AI Tutor 3×/Week" }).closest("section")!;
    await user.click(within(advanced).getByRole("button", { name: "Choose plan" }));
    await waitFor(() => expect(mocks.checkout).toHaveBeenCalledWith("tutor-195-quarterly"));
    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(screen.getByText("2340 AI tutor minutes included")).toBeInTheDocument();
  });
});
