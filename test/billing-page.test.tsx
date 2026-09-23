import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPage } from "../src/pages/BillingPage";
import { FeedbackProvider } from "../src/components/Feedback";

const mocks = vi.hoisted(() => ({
  plans: vi.fn(),
  checkout: vi.fn(),
  checkoutOpen: vi.fn(),
  pricePreview: vi.fn(),
}));

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ profile: { email: "ori@example.com" } }),
}));

vi.mock("../src/lib/billing", () => ({
  billing: {
    status: vi.fn(async () => ({
      tier: "free",
      access: false,
      plan: { key: "free", name: "Free", kind: "free" },
      entitlements: [],
      subscription: null,
    })),
    plans: mocks.plans,
    checkout: mocks.checkout,
    portal: vi.fn(),
  },
}));

vi.mock("../src/lib/paddle", () => ({
  getPaddleRuntime: vi.fn(async () => ({
    paddle: {
      PricePreview: mocks.pricePreview,
      Checkout: { open: mocks.checkoutOpen },
    },
    countryCode: "IL",
    priceIds: {
      month: "pri_01m358ydvk7q20ksq13mkj0j8b",
      year: "pri_01m3592yg3h7pkj32vmw3drgec",
    },
  })),
  transactionIdFromCheckoutUrl: vi.fn(() => "txn_00000000000000000000000000"),
  checkoutSuccessUrl: vi.fn(() => "https://gotit.rbaseapp.com/billing"),
}));

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plans.mockResolvedValue({ plans: [] });
    mocks.checkout.mockResolvedValue({
      url: "https://gotit.rbaseapp.com/billing/checkout?_ptxn=txn_00000000000000000000000000",
    });
    mocks.pricePreview.mockResolvedValue({
      data: {
        details: {
          lineItems: [
            {
              price: { id: "pri_01m358ydvk7q20ksq13mkj0j8b" },
              formattedTotals: { total: "₪24.09" },
            },
          ],
        },
      },
    });
  });

  it("keeps a real Pro offer available when the server catalog is initially empty", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FeedbackProvider>
          <BillingPage />
        </FeedbackProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "GotIt Pro" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("₪24.09")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "שדרוג ל־Pro" }));

    await waitFor(() => {
      expect(mocks.checkout).toHaveBeenCalledWith("pro-monthly");
      expect(mocks.checkoutOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: "txn_00000000000000000000000000",
          customer: { email: "ori@example.com" },
        }),
      );
    });
  });

  it("lets the user select the yearly Pro plan and checks out with its plan key", async () => {
    mocks.plans.mockResolvedValue({
      plans: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          key: "free",
          name: "GotIt Free",
          kind: "free",
          provider: null,
          amountMinor: null,
          currencyCode: null,
          billingInterval: null,
          trialDays: 0,
          entitlements: ["vocabulary.read", "dashboard"],
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          key: "pro-monthly",
          name: "GotIt Pro",
          kind: "paid",
          provider: "paddle",
          amountMinor: 799,
          currencyCode: "USD",
          billingInterval: "month",
          trialDays: 14,
          entitlements: ["vocabulary.read", "dashboard"],
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          key: "pro-yearly",
          name: "GotIt Pro",
          kind: "paid",
          provider: "paddle",
          amountMinor: 7000,
          currencyCode: "USD",
          billingInterval: "year",
          trialDays: 14,
          entitlements: ["vocabulary.read", "dashboard"],
        },
      ],
    });
    mocks.pricePreview.mockResolvedValue({
      data: {
        details: {
          lineItems: [
            {
              price: { id: "pri_01m358ydvk7q20ksq13mkj0j8b" },
              formattedTotals: { total: "$7.99" },
            },
            {
              price: { id: "pri_01m3592yg3h7pkj32vmw3drgec" },
              formattedTotals: { total: "$70.00" },
            },
          ],
        },
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <FeedbackProvider>
          <BillingPage />
        </FeedbackProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "שנתי" }));
    expect(await screen.findByText("$70.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Pro/ }));

    await waitFor(() => {
      expect(mocks.checkout).toHaveBeenCalledWith("pro-yearly");
      expect(mocks.checkoutOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: "txn_00000000000000000000000000",
        }),
      );
    });
  });
});
