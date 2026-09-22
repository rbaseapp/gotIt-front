import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BillingCheckoutPage } from "../src/pages/BillingCheckoutPage";

describe("BillingCheckoutPage", () => {
  it("does not leave a bare default payment link loading forever", async () => {
    window.history.replaceState({}, "", "/billing/checkout");

    render(
      <MemoryRouter>
        <BillingCheckoutPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "לא נמצא תשלום לפתיחה" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "חזרה לעמוד המנוי" }),
    ).toHaveAttribute("href", "/billing");
  });

  it("rejects a malformed transaction link without initializing Paddle", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    window.history.replaceState({}, "", "/billing/checkout?_ptxn=invalid");

    render(
      <MemoryRouter>
        <BillingCheckoutPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "התשלום אינו זמין" }),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
