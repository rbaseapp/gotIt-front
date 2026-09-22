import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { z } from "zod";

const environmentSchema = z.enum(["sandbox", "production"]);
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/u);

type PaddleEnvironment = z.infer<typeof environmentSchema>;

export interface PaddleRuntime {
  paddle: Paddle;
  countryCode?: string;
  priceIds: Partial<Record<"month" | "year", string>>;
}

let paddleRuntime: Promise<PaddleRuntime> | undefined;

async function publicConfiguration() {
  const response = await fetch("/runtime-config", {
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
  const runtime = response?.ok
    ? ((await response.json().catch(() => undefined)) as
        | {
            paddleClientToken?: unknown;
            paddleEnvironment?: unknown;
            countryCode?: unknown;
            paddlePriceIds?: { month?: unknown; year?: unknown };
          }
        | undefined)
    : undefined;

  const token =
    (typeof runtime?.paddleClientToken === "string" &&
      runtime.paddleClientToken.trim()) ||
    import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  const environmentValue =
    runtime?.paddleEnvironment ?? import.meta.env.VITE_PADDLE_ENVIRONMENT;
  const environment = environmentSchema.safeParse(environmentValue);

  if (!token)
    throw new Error("Paddle אינו מוגדר בסביבה הזו: חסר client-side token.");
  if (!environment.success)
    throw new Error("Paddle אינו מוגדר בסביבה הזו: חסרה סביבת sandbox או production.");
  if (environment.data === "production" && !token.startsWith("live_"))
    throw new Error("אסימון Paddle production חייב להתחיל ב־live_.");
  if (environment.data === "sandbox" && !token.startsWith("test_"))
    throw new Error("אסימון Paddle sandbox חייב להתחיל ב־test_.");

  const parsedCountry = countryCodeSchema.safeParse(runtime?.countryCode);
  const monthlyPriceId =
    (typeof runtime?.paddlePriceIds?.month === "string" &&
      runtime.paddlePriceIds.month.trim()) ||
    import.meta.env.VITE_PADDLE_PRO_MONTHLY_PRICE_ID?.trim();
  const yearlyPriceId =
    (typeof runtime?.paddlePriceIds?.year === "string" &&
      runtime.paddlePriceIds.year.trim()) ||
    import.meta.env.VITE_PADDLE_PRO_YEARLY_PRICE_ID?.trim();
  const priceIdSchema = z.string().regex(/^pri_[a-z0-9]{26}$/u);
  if (!priceIdSchema.safeParse(monthlyPriceId).success)
    throw new Error("חסר מזהה מחיר חודשי תקין של Paddle Pro.");
  if (yearlyPriceId && !priceIdSchema.safeParse(yearlyPriceId).success)
    throw new Error("מזהה המחיר השנתי של Paddle Pro אינו תקין.");
  return {
    token,
    environment: environment.data as PaddleEnvironment,
    ...(parsedCountry.success ? { countryCode: parsedCountry.data } : {}),
    priceIds: {
      month: monthlyPriceId,
      ...(yearlyPriceId ? { year: yearlyPriceId } : {}),
    },
  };
}

export function getPaddleRuntime(): Promise<PaddleRuntime> {
  paddleRuntime ??= (async () => {
    const configuration = await publicConfiguration();
    const paddle = await initializePaddle({
      token: configuration.token,
      environment: configuration.environment,
      checkout: {
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: checkoutSuccessUrl(),
        },
      },
    });
    if (!paddle) throw new Error("לא ניתן לאתחל את Paddle Checkout.");
    return {
      paddle,
      priceIds: configuration.priceIds,
      ...(configuration.countryCode
        ? { countryCode: configuration.countryCode }
        : {}),
    };
  })();
  return paddleRuntime;
}

export function transactionIdFromCheckoutUrl(value: string) {
  const transactionId = new URL(value).searchParams.get("_ptxn");
  if (!transactionId || !/^txn_[a-z0-9]{26}$/u.test(transactionId))
    throw new Error("Paddle החזיר קישור תשלום ללא מזהה עסקה תקין.");
  return transactionId;
}

export function checkoutSuccessUrl() {
  return new URL("/billing?checkout=success", window.location.origin).toString();
}
