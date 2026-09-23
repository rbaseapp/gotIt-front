import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CreditCard,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { billing, type BillingPlan } from "../lib/billing";
import {
  checkoutSuccessUrl,
  getPaddleRuntime,
  transactionIdFromCheckoutUrl,
} from "../lib/paddle";
import { useResource } from "../lib/useResource";
import { useFeedback } from "../components/Feedback";

const entitlementLabels: Record<string, string> = {
  "vocabulary.read": "צפייה במילים ובנתונים שכבר נשמרו",
  "vocabulary.write": "שמירת מילים חדשות ועריכת הספרייה",
  "practice.play": "כל המשחקים והתרגולים",
  dashboard: "מעקב אחר ההתקדמות",
  "reading.ai": "תרגול קריאה אישי עם AI",
  "speech.audio": "תרגול האזנה מתקדם",
  "speech.pronunciation": "הערכת הגייה ומשוב",
};

type BillingInterval = "month" | "year";
type DisplayPlan = Pick<
  BillingPlan,
  "key" | "name" | "kind" | "billingInterval" | "entitlements"
>;

const freeFallback: DisplayPlan = {
  key: "free",
  name: "GotIt Free",
  kind: "free",
  billingInterval: null,
  entitlements: ["vocabulary.read", "dashboard"],
};

const proMonthlyFallback: DisplayPlan = {
  key: "pro-monthly",
  name: "GotIt Pro",
  kind: "paid",
  billingInterval: "month",
  entitlements: [
    "vocabulary.read",
    "vocabulary.write",
    "practice.play",
    "dashboard",
    "reading.ai",
    "speech.audio",
    "speech.pronunciation",
  ],
};

export function BillingPage() {
  const { profile } = useApp();
  const { toast } = useFeedback();
  const status = useResource(useCallback(() => billing.status(), []));
  const plans = useResource(useCallback(() => billing.plans(), []));
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [localizedPrices, setLocalizedPrices] = useState<
    Record<string, string>
  >({});
  const [pricing, setPricing] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const checkoutCompleted =
    new URLSearchParams(window.location.search).get("checkout") === "success";

  useEffect(() => {
    if (checkoutCompleted)
      toast("התשלום הושלם. הרשאות ה־Pro מתעדכנות כעת בחשבון.", {
        tone: "success",
        duration: 6500,
      });
  }, [checkoutCompleted, toast]);

  const paidPlans = useMemo<DisplayPlan[]>(() => {
    const configured =
      plans.data?.plans.filter((plan) => plan.kind === "paid") ?? [];
    return configured.length ? configured : [proMonthlyFallback];
  }, [plans.data]);
  const freePlan =
    plans.data?.plans.find((plan) => plan.kind === "free") ?? freeFallback;
  const selectedPaidPlan =
    paidPlans.find((plan) => plan.billingInterval === interval) ?? paidPlans[0];
  const availableIntervals = new Set(
    paidPlans.map((plan) => plan.billingInterval).filter(Boolean),
  );

  useEffect(() => {
    if (!paidPlans.some((plan) => plan.billingInterval === interval))
      setInterval(paidPlans[0]!.billingInterval || "month");
  }, [paidPlans, interval]);

  useEffect(() => {
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
          throw new Error("לא נמצא מחיר Paddle עבור תוכנית Pro.");
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

  const openCheckout = async (plan: DisplayPlan) => {
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
      <section className="page-heading-row billing-heading">
        <div>
          <p className="eyebrow">המנוי שלך</p>
          <h1>בחרו את הדרך שמתאימה לכם ללמוד</h1>
          <p>
            נסו את כל יכולות GotIt בחינם ל־14 יום, ולאחר מכן המשיכו עם Pro.
            התשלום מאובטח ומנוהל על ידי Paddle.
          </p>
        </div>
        <CreditCard size={36} />
      </section>

      {(status.loading || plans.loading) && (
        <p className="billing-loading" role="status">
          <LoaderCircle className="spin" size={20} /> טוענים את פרטי המנוי…
        </p>
      )}
      {(status.error || plans.error || error) && (
        <p className="form-error" role="alert">
          {status.error || plans.error || error}
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
                : status.data.tier === "trial"
                  ? `תקופת הניסיון פעילה. נותרו ${status.data.trial?.daysRemaining ?? 0} ימים.`
                  : "אפשר לצפות במילים ובנתונים שכבר שמרת. המשך הלמידה זמין ב־Pro."}
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
        <PlanCard
          plan={freePlan}
          price="חינם"
          description="גישה לקריאה בלבד למילים, לדשבורד ולנתונים שכבר שמרת."
          current={status.data?.plan.key === freePlan.key}
        />

        {selectedPaidPlan && (
          <PlanCard
            plan={selectedPaidPlan}
            price={localizedPrices[selectedPaidPlan.key]}
            description="שמירת מילים, כל המשחקים, דיבור והגייה ועד 4 כתבות AI בחודש."
            loadingPrice={pricing}
            priceError={pricingError}
            featured
            current={
              status.data?.tier === "paid" &&
              status.data.plan.key === selectedPaidPlan.key
            }
            intervals={availableIntervals}
            selectedInterval={interval}
            onIntervalChange={setInterval}
            action={
              status.data?.tier !== "paid"
                ? {
                    busy: busy === selectedPaidPlan.key,
                    disabled: Boolean(busy),
                    run: () => void openCheckout(selectedPaidPlan),
                  }
                : undefined
            }
          />
        )}
      </div>

      <section className="billing-assurance" aria-label="מידע על התשלום">
        <div>
          <ShieldCheck size={22} />
          <span>
            <strong>תשלום מאובטח</strong>
            פרטי הכרטיס נשמרים ומנוהלים על ידי Paddle בלבד.
          </span>
        </div>
        <div>
          <ReceiptText size={22} />
          <span>
            <strong>חשבונית וניהול עצמי</strong>
            צפייה בחיובים, עדכון אמצעי תשלום וביטול דרך פורטל Paddle.
          </span>
        </div>
        <div>
          <Sparkles size={22} />
          <span>
            <strong>גישה אוטומטית</strong>
            יכולות Pro נפתחות בחשבון לאחר אישור התשלום.
          </span>
        </div>
      </section>

      <p className="billing-legal-note">
        בלחיצה על שדרוג ל־Pro תועברו לקופה המאובטחת של Paddle. ניתן לנהל או לבטל
        את המנוי מעמוד זה. <a href="/terms">תנאי שימוש</a> ·{" "}
        <a href="/refunds">מדיניות החזרים</a>
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  price,
  description,
  loadingPrice = false,
  priceError,
  featured = false,
  current,
  intervals,
  selectedInterval,
  onIntervalChange,
  action,
}: {
  plan: DisplayPlan;
  price?: string;
  description: string;
  loadingPrice?: boolean;
  priceError?: string;
  featured?: boolean;
  current: boolean;
  intervals?: Set<BillingInterval | null>;
  selectedInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  action?: { busy: boolean; disabled: boolean; run: () => void };
}) {
  return (
    <section
      className={`live-panel billing-plan ${plan.kind}${featured ? " featured" : ""}`}
    >
      <div className="billing-plan-heading">
        <div>
          <p className="eyebrow">
            {plan.kind === "paid" ? "ללמוד בלי מגבלות" : "להתחיל בחינם"}
          </p>
          <h2>{plan.kind === "paid" ? "GotIt Pro" : plan.name}</h2>
        </div>
        {featured && <span className="billing-recommended">מומלץ</span>}
      </div>
      <p className="billing-plan-description">{description}</p>
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
      <div className="billing-price-row">
        <strong className="billing-price">
          {loadingPrice && !price ? (
            <LoaderCircle className="spin" size={24} aria-label="טוענים מחיר" />
          ) : (
            price || (priceError ? "המחיר יוצג בקופה" : "טוענים מחיר…")
          )}
        </strong>
        {plan.billingInterval && (
          <small>{plan.billingInterval === "year" ? "לשנה" : "לחודש"}</small>
        )}
      </div>
      <ul>
        {plan.entitlements.map((feature) => (
          <li key={feature}>
            <Check size={16} /> {entitlementLabels[feature] || feature}
          </li>
        ))}
      </ul>
      {action && (
        <button
          className="button primary billing-upgrade-button"
          disabled={action.disabled}
          onClick={action.run}
        >
          {action.busy ? "פותחים תשלום…" : "שדרוג ל־Pro"}
        </button>
      )}
      {plan.kind === "paid" && (
        <small className="billing-checkout-note">
          המחיר הסופי והמס המקומי יוצגו על ידי Paddle לפני אישור התשלום.
        </small>
      )}
      {current && <span className="status-chip active">התוכנית הנוכחית</span>}
    </section>
  );
}
