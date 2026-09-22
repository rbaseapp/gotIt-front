import { describe, expect, it } from "vitest";
import { transactionIdFromCheckoutUrl } from "../src/lib/paddle";

describe("Paddle checkout links", () => {
  it("extracts the server-created transaction from an approved payment link", () => {
    expect(
      transactionIdFromCheckoutUrl(
        "https://app.example.com/billing/checkout?_ptxn=txn_00000000000000000000000000",
      ),
    ).toBe("txn_00000000000000000000000000");
  });

  it("rejects links without a valid Paddle transaction", () => {
    expect(() =>
      transactionIdFromCheckoutUrl("https://app.example.com/billing/checkout"),
    ).toThrow(/מזהה עסקה/u);
  });
});
