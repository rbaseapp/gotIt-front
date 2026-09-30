import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CreditCard, LoaderCircle, ReceiptText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useFeedback } from "../components/Feedback";
import { billing, type BillingPlan } from "../lib/billing";
import { checkoutSuccessUrl, getPaddleRuntime, transactionIdFromCheckoutUrl } from "../lib/paddle";
import { useResource } from "../lib/useResource";

type Interval = "month" | "quarter" | "year";
const groups = ["tutor-60", "tutor-195", "pro"] as const;

export function BillingPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const { toast } = useFeedback();
  const plans = useResource(useCallback(() => billing.plans(), []));
  const status = useResource(useCallback(() => billing.status(), []));
  const minutes = useResource(useCallback(() => billing.minutes(), []));
  const reloadStatus = status.reload;
  const reloadMinutes = minutes.reload;
  const [interval, setInterval] = useState<Interval>("month");
  const [localizedPrices, setLocalizedPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const checkoutCompleted = new URLSearchParams(window.location.search).get("checkout") === "success";

  useEffect(() => {
    if (!checkoutCompleted) return;
    toast(t("billing.paymentComplete"), { tone: "success", duration: 6500 });
    void reloadStatus();
    void reloadMinutes();
  }, [checkoutCompleted, reloadMinutes, reloadStatus, t, toast]);

  const offers = useMemo(() => plans.data?.plans ?? [], [plans.data]);
  const free = offers.find((plan) => plan.kind === "free");
  const oneTime = offers.find((plan) => plan.kind === "one_time");
  const selected = groups.map((group) => {
    const members = offers.filter((plan) => plan.kind === "paid" && plan.key.startsWith(group + "-"));
    return members.find((plan) => plan.billingInterval === interval) ?? members.find((plan) => plan.billingInterval === "month") ?? members[0];
  }).filter((plan): plan is BillingPlan => Boolean(plan));

  useEffect(() => {
    const previewable = offers.filter((plan) => plan.providerPriceId);
    if (!previewable.length) return;
    let canceled = false;
    void getPaddleRuntime().then(async ({ paddle, countryCode }) => {
      const results = await Promise.allSettled(previewable.map((plan) => paddle.PricePreview({
        items: [{ priceId: plan.providerPriceId!, quantity: 1 }],
        ...(countryCode ? { address: { countryCode } } : {}),
      })));
      if (canceled) return;
      setLocalizedPrices(Object.fromEntries(results.flatMap((result, index) => {
        const price = result.status === "fulfilled" ? result.value.data.details.lineItems[0]?.formattedTotals.total : undefined;
        return price ? [[previewable[index]!.key, price]] : [];
      })));
    }).catch(() => undefined);
    return () => { canceled = true; };
  }, [offers]);

  const openPortal = async () => {
    setBusy("portal");
    setError("");
    try {
      const result = await billing.portal();
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("billing.paymentOpenFailed"));
      setBusy("");
    }
  };

  const openCheckout = async (plan: BillingPlan) => {
    setBusy(plan.key);
    setError("");
    try {
      const [{ paddle }, checkout] = await Promise.all([getPaddleRuntime(), billing.checkout(plan.key)]);
      paddle.Checkout.open({
        transactionId: transactionIdFromCheckoutUrl(checkout.url),
        customer: profile.email ? { email: profile.email } : undefined,
        settings: { displayMode: "overlay", variant: "one-page", successUrl: checkoutSuccessUrl() },
      });
      setBusy("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("billing.paymentOpenFailed"));
      setBusy("");
    }
  };

  const price = (plan: BillingPlan) => localizedPrices[plan.key] ??
    (plan.amountMinor !== null && plan.currencyCode
      ? new Intl.NumberFormat(i18n.language, { style: "currency", currency: plan.currencyCode }).format(plan.amountMinor / 100)
      : t("billing.priceAtCheckout"));

  return (
    <div className="billing-page page-enter">
      <section className="page-heading-row billing-heading">
        <div>
          <p className="eyebrow">{t("billing.eyebrow")}</p>
          <h1>{t("billing.title")}</h1>
          <p>{t("billing.description")}</p>
        </div>
        <CreditCard size={36} />
      </section>
      {(status.loading || plans.loading) && <p className="billing-loading" role="status"><LoaderCircle className="spin" size={20} /> {t("billing.loading")}</p>}
      {(status.error || plans.error || error) && <p className="form-error" role="alert">{status.error || plans.error || error}</p>}

      {status.data && (
        <section className="live-panel billing-current">
          <div>
            <p className="eyebrow">{t("billing.currentPlan")}</p>
            <h2>{status.data.plan.name}</h2>
            <p>{status.data.tier === "trial"
              ? t("billing.trialStatus", { count: status.data.trial?.daysRemaining ?? 0 })
              : status.data.tier === "paid" ? t("billing.paidStatus") : t("billing.freeStatus")}</p>
            {minutes.data && <p><strong>{t("billing.minutesRemaining", { count: Math.floor(minutes.data.secondsRemaining / 60) })}</strong></p>}
          </div>
          {status.data.subscription && <button className="button secondary" disabled={Boolean(busy)} onClick={() => void openPortal()}>
            {busy === "portal" ? t("billing.opening") : t("billing.manage")}
          </button>}
        </section>
      )}

      <p className="billing-minute-policy">{t("privateLesson.minutesChargePolicy")}</p>

      <div className="billing-interval-toggle billing-periods" aria-label={t("billing.intervalLabel")}>
        {(["month", "quarter", "year"] as const).map((value) => <button
          key={value} type="button" className={interval === value ? "active" : ""}
          aria-pressed={interval === value} onClick={() => setInterval(value)}>
          {t(`billing.${value === "month" ? "monthly" : value === "quarter" ? "quarterly" : "yearly"}`)}
        </button>)}
      </div>

      <div className="billing-grid">
        {free && <PlanCard plan={free} price={t("billing.free")} description={t("billing.freeDescription")}
          current={status.data?.plan.key === free.key} />}
        {selected.map((plan) => <PlanCard key={plan.key} plan={plan} price={price(plan)}
          description={plan.key.startsWith("pro-") ? t("billing.proDescription") : t("billing.tutorDescription")}
          current={status.data?.plan.key === plan.key} featured={plan.key.startsWith("tutor-60")}
          action={status.data?.tier === "paid"
            ? { label: t("billing.manage"), busy: busy === "portal", disabled: Boolean(busy), run: () => void openPortal() }
            : { label: t("billing.choosePlan"), busy: busy === plan.key, disabled: Boolean(busy), run: () => void openCheckout(plan) }} />)}
        {oneTime && <PlanCard plan={oneTime} price={price(oneTime)} description={t("billing.minutesPackDescription")}
          current={false} action={{ label: t("billing.buyMinutes"), busy: busy === oneTime.key,
            disabled: Boolean(busy), run: () => void openCheckout(oneTime) }} />}
      </div>

      <section className="billing-assurance" aria-label={t("billing.assuranceLabel")}>
        <div><ShieldCheck size={22} /><span><strong>{t("billing.secureTitle")}</strong>{t("billing.secureBody")}</span></div>
        <div><ReceiptText size={22} /><span><strong>{t("billing.selfServiceTitle")}</strong>{t("billing.selfServiceBody")}</span></div>
      </section>
      <p className="billing-legal-note">{t("billing.checkoutNote")} <a href="/terms">{t("shell.terms")}</a> &middot; <a href="/refunds">{t("shell.refunds")}</a></p>
    </div>
  );
}

function PlanCard({ plan, price, description, featured = false, current, action }: {
  plan: BillingPlan;
  price: string;
  description: string;
  featured?: boolean;
  current: boolean;
  action?: { label: string; busy: boolean; disabled: boolean; run: () => void };
}) {
  const { t } = useTranslation();
  const term = plan.billingInterval === "month" ? t("billing.perMonth")
    : plan.billingInterval === "quarter" ? t("billing.perQuarter")
    : plan.billingInterval === "year" ? t("billing.perYear") : t("billing.oneTime");
  return <section className={`live-panel billing-plan ${plan.kind}${featured ? " featured" : ""}`}>
    <div className="billing-plan-heading"><div>
      <p className="eyebrow">{plan.kind === "one_time" ? t("billing.minutesPack") : plan.kind === "free" ? t("billing.startFree") : t("billing.subscription")}</p>
      <h2>{plan.name}</h2>
    </div>{featured && <span className="billing-recommended">{t("billing.recommended")}</span>}</div>
    <p className="billing-plan-description">{description}</p>
    <div className="billing-price-row"><strong className="billing-price">{price}</strong><small>{term}</small></div>
    <ul>
      {plan.minuteAllowance && <li><Check size={16} />{t("billing.includedMinutes", { count: plan.minuteAllowance })}</li>}
      {plan.kind === "one_time" && <li><Check size={16} />{t("billing.packValidity")}</li>}
      {plan.entitlements.map((feature) => <li key={feature}><Check size={16} />
        {t(`billing.entitlements.${feature}`, { defaultValue: feature })}</li>)}
    </ul>
    {action && <button className="button primary billing-upgrade-button" disabled={action.disabled} onClick={action.run}>
      {action.busy ? t("billing.openingPayment") : action.label}
    </button>}
    {plan.kind !== "free" && <small className="billing-checkout-note">{t("billing.checkoutNote")}</small>}
    {current && <span className="status-chip active">{t("billing.currentPlan")}</span>}
  </section>;
}
