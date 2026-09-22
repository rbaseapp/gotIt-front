import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CreditCard, LoaderCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { billing, type BillingPlan } from "../lib/billing";
import {
  checkoutSuccessUrl,
  getPaddleRuntime,
  transactionIdFromCheckoutUrl,
} from "../lib/paddle";
import { useResource } from "../lib/useResource";

const entitlementLabels: Record<string, string> = {
  vocabulary: "אוצר מילים אישי",
  "practice.basic": "תרגול בסיסי",
  dashboard: "מעקב התקדמות",
  "reading.ai": "קריאה אישית עם AI",
  "speech.audio": "תרגול האזנה",
  "speech.pronunciation": "הערכת הגייה",
};

type BillingInterval = "month" | "year";

export function BillingPage() {
  const { profile } = useApp();
  const status = useResource(useCallback(() => billing.status(), []));
  const plans = useResource(useCallback(() => billing.plans(), []));
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [localizedPrices, setLocalizedPrices] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const checkoutCompleted =
    new URLSearchParams(window.location.search).get("checkout") === "success";

  const paidPlans = useMemo(
    () => plans.data?.plans.filter((plan) => plan.kind === "paid") ?? [],
    [plans.data],
  );
  const freePlan = plans.data?.plans.find((plan) => plan.kind === "free");
  const selectedPaidPlan =
    paidPlans.find((plan) => plan.billingInterval === interval) ?? paidPlans[0];
  const availableIntervals = new Set(
    paidPlans.map((plan) => plan.billingInterval).filter(Boolean),
  );

  useEffect(() => {
    if (!paidPlans.length) return;
    if (!paidPlans.some((plan) => plan.billingInterval === interval))
      setInterval(paidPlans[0]!.billingInterval || "month");
  }, [paidPlans, interval]);

  useEffect(() => {
    if (!paidPlans.length) return;
    let cancelled = false;
    setPricing(true);
    setPricingError("");
    void getPaddleRuntime()
      .then(async ({ paddle, countryCode, priceIds }) => {
        const previewable = paidPlans.flatMap((plan) => {
          const priceId = plan.billingInterval
            ? priceIds[plan.billingInterval]
            : undefined;
          return priceId ? [{ plan, priceId }] : [];
        });
        if (!previewable.length)
          throw new Error("לא נמצא מחיר Paddle עבור תוכנית ה־Pro.");
        const result = await paddle.PricePreview({
          items: previewable.map(({ priceId }) => ({
            priceId,
            quantity: 1,
          })),
          ...(countryCode ? { address: { countryCode } } : {}),
        });
        if (cancelled) return;
        const byPriceId = new Map(
          result.data.details.lineItems.map((item) => [
            item.price.id,
            item.formattedTotals.total,
          ]),
        );
        setLocalizedPrices(
          Object.fromEntries(
            previewable.flatMap(({ plan, priceId }) => {
              const total = byPriceId.get(priceId);
              return total ? [[plan.key, total]] : [];
            }),
          ),
        );
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setPricingError(
            reason instanceof Error
              ? reason.message
              : "לא ניתן לטעון את המחיר המקומי כרגע.",
          );
      })
      .finally(() => {
        if (!cancelled) setPricing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paidPlans]);

  const openPortal = async () => {
    setBusy("portal");
    setError("");
    try {
      const result = await billing.portal();
      window.location.assign(result.url);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "לא ניתן לפתוח את שירות התשלום כרגע.",
      );
      setBusy("");
    }
  };

  const openCheckout = async (plan: BillingPlan) => {
    setBusy(plan.key);
    setError("");
    try {
      const [{ paddle }, checkout] = await Promise.all([
        getPaddleRuntime(),
        billing.checkout(plan.key),
      ]);
      paddle.Checkout.open({
        transactionId: transactionIdFromCheckoutUrl(checkout.url),
        customer: profile.email ? { email: profile.email } : undefined,
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: checkoutSuccessUrl(),
        },
      });
      setBusy("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "לא ניתן לפתוח את שירות התשלום כרגע.",
      );
      setBusy("");
    }
  };

  return (
    <div className="billing-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">המנוי שלך</p>
          <h1>GotIt Free או Pro</h1>
          <p>
            התשלום מאובטח ומנוהל ב־Paddle. פרטי הכרטיס אינם נשמרים ב־GotIt.
          </p>
        </div>
        <CreditCard size={36} />
      </section>

      {checkoutCompleted && (
        <p className="success-message" role="status">
          התשלום הושלם. הרשאות ה־Pro מתעדכנות כעת בחשבון.
        </p>
      )}
      {(status.loading || plans.loading) && (
        <p role="status">
          <LoaderCircle className="spin" size={20} /> טוענים את פרטי המנוי…
        </p>
      )}
      {(status.error || plans.error || error || pricingError) && (
        <p className="form-error" role="alert">
          {status.error || plans.error || error || pricingError}
        </p>
      )}

      {status.data && (
        <section className="live-panel billing-current">
          <div>
            <p className="eyebrow">התוכנית הנוכחית</p>
            <h2>{status.data.plan.name}</h2>
            <p>
              {status.data.tier === "paid"
                ? "כל יכולות ה־Pro פתוחות בחשבון."
                : "יכולות הלימוד הבסיסיות זמינות ללא תשלום."}
            </p>
          </div>
          {status.data.subscription && (
            <button
              className="button secondary"
              disabled={Boolean(busy)}
              onClick={() => void openPortal()}
            >
              {busy === "portal" ? "פותחים…" : "ניהול תשלום וביטול"}
            </button>
          )}
        </section>
      )}

      <div className="billing-grid">
        {freePlan && (
          <PlanCard
            plan={freePlan}
            price="חינם"
            current={status.data?.plan.key === freePlan.key}
          />
        )}

        {selectedPaidPlan && (
          <PlanCard
            plan={selectedPaidPlan}
            price={
              localizedPrices[selectedPaidPlan.key]
            }
            loadingPrice={pricing}
            current={status.data?.plan.key === selectedPaidPlan.key}
            intervals={availableIntervals}
            selectedInterval={interval}
            onIntervalChange={setInterval}
            action={
              status.data?.tier !== "paid"
                ? {
                    busy: busy === selectedPaidPlan.key,
                    disabled:
                      Boolean(busy) ||
                      pricing ||
                      !localizedPrices[selectedPaidPlan.key],
                    run: () => void openCheckout(selectedPaidPlan),
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  price,
  loadingPrice = false,
  current,
  intervals,
  selectedInterval,
  onIntervalChange,
  action,
}: {
  plan: BillingPlan;
  price?: string;
  loadingPrice?: boolean;
  current: boolean;
  intervals?: Set<BillingInterval | null>;
  selectedInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  action?: { busy: boolean; disabled: boolean; run: () => void };
}) {
  return (
    <section className={`live-panel billing-plan ${plan.kind}`}>
      <h2>{plan.kind === "paid" ? "GotIt Pro" : plan.name}</h2>
      {intervals?.has("month") && intervals.has("year") && onIntervalChange && (
        <div className="billing-interval-toggle" aria-label="תקופת חיוב">
          {(["month", "year"] as const).map((value) => (
            <button
              className={selectedInterval === value ? "active" : ""}
              type="button"
              aria-pressed={selectedInterval === value}
              onClick={() => onIntervalChange(value)}
              key={value}
            >
              {value === "month" ? "חודשי" : "שנתי"}
            </button>
          ))}
        </div>
      )}
      <strong className="billing-price">
        {loadingPrice && !price ? (
          <LoaderCircle className="spin" size={24} aria-label="טוענים מחיר" />
        ) : (
          price || "לא זמין"
        )}
      </strong>
      {plan.billingInterval && (
        <small>{plan.billingInterval === "year" ? "לשנה" : "לחודש"}</small>
      )}
      <ul>
        {plan.entitlements.map((feature) => (
          <li key={feature}>
            <Check size={16} /> {entitlementLabels[feature] || feature}
          </li>
        ))}
      </ul>
      {action && (
        <button
          className="button primary"
          disabled={action.disabled}
          onClick={action.run}
        >
          {action.busy ? "פותחים תשלום…" : "שדרוג ל־Pro"}
        </button>
      )}
      {current && <span className="status-chip active">התוכנית הנוכחית</span>}
    </section>
  );
}
