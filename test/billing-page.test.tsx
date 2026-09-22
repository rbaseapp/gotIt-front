import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPage } from "../src/pages/BillingPage";

const mocks = vi.hoisted(() => ({
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
    plans: vi.fn(async () => ({ plans: [] })),
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
    priceIds: { month: "pri_01m358ydvk7q20ksq13mkj0j8b" },
  })),
  transactionIdFromCheckoutUrl: vi.fn(() => "txn_00000000000000000000000000"),
  checkoutSuccessUrl: vi.fn(() => "https://gotit.rbaseapp.com/billing"),
}));

describe("BillingPage", () => {
  beforeEach(() => {
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
        <BillingPage />
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
});
