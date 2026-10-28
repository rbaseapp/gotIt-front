import type { BillingPlan } from "./billing";

export type BillingInterval = "month" | "quarter" | "year";
export type DisplayPrice = {
  amountMinor: number | null;
  currencyCode: string | null;
  formatted: string;
  source: "paddle" | "catalog";
};
export const periodMonths = { month: 1, quarter: 3, year: 12 } as const;

export function planFamily(plan: BillingPlan): string {
  return plan.key.replace(/-(monthly|quarterly|yearly)$/, "");
}

export function formatPrice(
  amountMinor: number,
  currency: string,
  locale: string,
) {
  // Paddle amounts are in the currency's minor units (not always cents).
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** digits);
}

export function priceSavings(
  plan: BillingPlan,
  monthly: BillingPlan | undefined,
  prices: Record<string, DisplayPrice>,
) {
  if (!monthly || !plan.billingInterval || plan.billingInterval === "month")
    return null;
  const price = prices[plan.key];
  const baseline = prices[monthly.key];
  if (
    !price ||
    !baseline ||
    price.amountMinor === null ||
    baseline.amountMinor === null ||
    !price.currencyCode ||
    price.currencyCode !== baseline.currencyCode ||
    price.source !== baseline.source
  )
    return null;
  const full = baseline.amountMinor * periodMonths[plan.billingInterval];
  const saved = full - price.amountMinor;
  return full > 0 && saved > 0
    ? {
        amountMinor: saved,
        percent: Math.floor((saved / full) * 100),
        currency: price.currencyCode,
      }
    : null;
}
