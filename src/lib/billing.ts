import { z } from "zod";
import { api, ApiError } from "./api";

const plan = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  kind: z.enum(["free", "paid"]),
  provider: z.literal("paddle").nullable(),
  amountMinor: z.number().int().nonnegative().nullable(),
  currencyCode: z.string().length(3).nullable(),
  billingInterval: z.enum(["month", "year"]).nullable(),
});
export const billingPlansSchema = z.object({ plans: z.array(plan) });
export const billingStatusSchema = z.object({
  tier: z.enum(["free", "paid"]),
  access: z.boolean(),
  plan: z.object({ key: z.string(), name: z.string(), kind: z.enum(["free", "paid"]) }),
  entitlements: z.array(z.string()),
  subscription: z.object({
    status: z.enum(["trialing", "active", "past_due", "paused", "canceled"]),
    cancelAtPeriodEnd: z.boolean(),
    currentPeriodEndsAt: z.string().datetime({ offset: true }).nullable(),
  }).nullable(),
});
const urlSchema = z.object({ url: z.string().url() });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, "INVALID_RESPONSE", "שירות המנויים החזיר תשובה לא תקינה.");
  return result.data;
}

export const billing = {
  async status() { return parse(billingStatusSchema, await api.core("billing/status")); },
  async plans() { return parse(billingPlansSchema, await api.core("billing/plans")); },
  async checkout(planKey: string) {
    return parse(urlSchema, await api.core("billing/checkout", "POST", { planKey }, crypto.randomUUID()));
  },
  async portal() { return parse(urlSchema, await api.core("billing/portal", "POST")); },
};
