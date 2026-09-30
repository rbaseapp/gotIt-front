import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { z } from "zod";
import i18n from "../i18n";

const environmentSchema = z.enum(["sandbox", "production"]);
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/u);

type PaddleEnvironment = z.infer<typeof environmentSchema>;

export interface PaddleRuntime {
  paddle: Paddle;
  countryCode?: string;
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

  if (!token) throw new Error(i18n.t("paddleErrors.missingToken"));
  if (!environment.success)
    throw new Error(i18n.t("paddleErrors.missingEnvironment"));
  if (environment.data === "production" && !token.startsWith("live_"))
    throw new Error(i18n.t("paddleErrors.invalidProductionToken"));
  if (environment.data === "sandbox" && !token.startsWith("test_"))
    throw new Error(i18n.t("paddleErrors.invalidSandboxToken"));

  const parsedCountry = countryCodeSchema.safeParse(runtime?.countryCode);
  return {
    token,
    environment: environment.data as PaddleEnvironment,
    ...(parsedCountry.success ? { countryCode: parsedCountry.data } : {}),
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
    if (!paddle) throw new Error(i18n.t("paddleErrors.initialization"));
    return {
      paddle,
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
    throw new Error(i18n.t("paddleErrors.invalidTransaction"));
  return transactionId;
}

export function checkoutSuccessUrl() {
  return new URL(
    "/billing?checkout=success",
    window.location.origin,
  ).toString();
}
