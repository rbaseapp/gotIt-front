import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Minus,
  BookOpen,
  Star,
  Sparkles,
  ArrowRight,
  ChevronDown,
  LoaderCircle,
  LockKeyhole,
  CircleMinus,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { Link } from "react-router-dom";
import "../subscription-pricing.css";
import mochiUrl from "../assets/mywords/moohi.png";
import {
  formatPrice,
  periodMonths,
  planFamily,
  priceSavings,
  type BillingInterval,
  type DisplayPrice,
} from "../lib/billingDisplay";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useFeedback } from "../components/Feedback";
import { billing, type BillingPlan } from "../lib/billing";
import {
  checkoutSuccessUrl,
  getPaddleRuntime,
  transactionIdFromCheckoutUrl,
} from "../lib/paddle";
import { useResource } from "../lib/useResource";

const groups = ["pro", "tutor-195", "tutor-60"] as const;

export function BillingPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const { toast } = useFeedback();
  const plans = useResource(useCallback(() => billing.plans(), []));
  const status = useResource(useCallback(() => billing.status(), []));
  const minutes = useResource(useCallback(() => billing.minutes(), []));
  const reloadStatus = status.reload;
  const reloadMinutes = minutes.reload;
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [localizedPrices, setLocalizedPrices] = useState<
    Record<string, DisplayPrice>
  >({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const checkoutCompleted =
    new URLSearchParams(window.location.search).get("checkout") === "success";

  useEffect(() => {
    if (!checkoutCompleted) return;
    toast(t("billing.paymentComplete"), { tone: "success", duration: 6500 });
    void reloadStatus();
    void reloadMinutes();
  }, [checkoutCompleted, reloadMinutes, reloadStatus, t, toast]);

  const offers = useMemo(() => plans.data?.plans ?? [], [plans.data]);
  const packs = offers.filter((plan) => plan.kind === "one_time");
  const [packKey, setPackKey] = useState("");
  const oneTime = packs.find((plan) => plan.key === packKey) ?? packs[0];
  const families = [
    ...new Set(offers.filter((plan) => plan.kind === "paid").map(planFamily)),
  ].sort((a, b) => {
    const rank = (key: string) => {
      const index = groups.indexOf(key as (typeof groups)[number]);
      return index < 0 ? groups.length : index;
    };
    return rank(a) - rank(b);
  });
  const selected = families.map((family) => ({
    family,
    plan: offers.find(
      (plan) =>
        plan.kind === "paid" &&
        planFamily(plan) === family &&
        plan.billingInterval === interval,
    ),
    representative: offers.find(
      (plan) => plan.kind === "paid" && planFamily(plan) === family,
    )!,
    monthly: offers.find(
      (plan) =>
        plan.kind === "paid" &&
        planFamily(plan) === family &&
        plan.billingInterval === "month",
    ),
  }));
  const prices: Record<string, DisplayPrice> = Object.fromEntries(
    offers.map((plan) => [
      plan.key,
      localizedPrices[plan.key] ?? {
        amountMinor: plan.amountMinor,
        currencyCode: plan.currencyCode,
        formatted:
          plan.amountMinor !== null && plan.currencyCode
            ? formatPrice(plan.amountMinor, plan.currencyCode, i18n.language)
            : t("billing.priceAtCheckout"),
        source: "catalog",
      },
    ]),
  );
  const price = (plan: BillingPlan) => prices[plan.key]!.formatted;
  const featureKeys = [
    ...new Set(
      selected.flatMap(({ representative }) => representative.entitlements),
    ),
  ];
  const actionsDisabled =
    Boolean(busy) ||
    plans.loading ||
    Boolean(plans.error) ||
    status.loading ||
    Boolean(status.error) ||
    !status.data ||
    !online;

  useEffect(() => {
    const previewable = offers.filter((plan) => plan.providerPriceId);
    if (!previewable.length) return;
    let canceled = false;
    void getPaddleRuntime()
      .then(async ({ paddle, countryCode }) => {
        const results = await Promise.allSettled(
          previewable.map((plan) =>
            paddle.PricePreview({
              items: [{ priceId: plan.providerPriceId!, quantity: 1 }],
              ...(countryCode ? { address: { countryCode } } : {}),
            }),
          ),
        );
        if (canceled) return;
        setLocalizedPrices(
          Object.fromEntries(
            results.flatMap((result, index) => {
              if (result.status !== "fulfilled") return [];
              const data = result.value.data;
              const line = data.details.lineItems[0];
              if (!line?.formattedTotals.total) return [];
              const amount = Number(line.totals?.total);
              if (
                !data.currencyCode ||
                line.totals?.total == null ||
                !Number.isFinite(amount) ||
                amount < 0
              )
                return [];
              return [
                [
                  previewable[index]!.key,
                  {
                    formatted: line.formattedTotals.total,
                    amountMinor: amount,
                    currencyCode: data.currencyCode,
                    source: "paddle",
                  } satisfies DisplayPrice,
                ],
              ];
            }),
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      canceled = true;
    };
  }, [offers]);

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
          : t("billing.paymentOpenFailed"),
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
          : t("billing.paymentOpenFailed"),
      );
      setBusy("");
    }
  };

  const featureLabel = (key: string) =>
    t(`billing.entitlements.${key}`, { defaultValue: key });
  const bankLabel = (plan: BillingPlan) =>
    plan.minuteAllowance
      ? t("billing.includedMinutes", { count: plan.minuteAllowance })
      : t("pricing.noIncludedMinutes");
  const termKey = (value: BillingInterval) =>
    value === "month"
      ? "monthly"
      : value === "quarter"
        ? "quarterly"
        : "yearly";
  const retry = () => {
    void plans.reload();
    void status.reload();
    void minutes.reload();
  };

  return (
    <div className="subscription-pricing page-enter">
      <div className="pricing-back-row">
        <Link className="pricing-back" to="/settings#subscription">
          <ArrowRight size={18} />
          {t("pricing.back")}
        </Link>
        {status.data && (
          <div className="billing-current pricing-current">
            <span>
              {t("billing.currentPlan")}:{" "}
              <strong>{status.data.plan.name}</strong>
            </span>
            {status.data.subscription && (
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => void openPortal()}
              >
                {busy === "portal" ? t("billing.opening") : t("billing.manage")}
              </button>
            )}
          </div>
        )}
      </div>
      <header className="pricing-hero">
        <div>
          <h1>{t("pricing.title")}</h1>
          <p>{t("pricing.description")}</p>
        </div>
        <img src={mochiUrl} alt="" width="120" height="120" />
      </header>
      {!online && (
        <p className="pricing-notice" role="status">
          {t("pricing.offline")}
        </p>
      )}
      {(status.loading || plans.loading) && (
        <p className="pricing-notice" role="status">
          <LoaderCircle className="spin" size={20} />
          {t("billing.loading")}
        </p>
      )}
      {(status.error || plans.error || error) && (
        <div className="form-error" role="alert">
          {status.error || plans.error || error}
          <button type="button" onClick={retry}>
            {t("pricing.retry")}
          </button>
        </div>
      )}
      {status.data?.trial && (
        <p className="pricing-notice">
          {t("billing.trialStatus", { count: status.data.trial.daysRemaining })}
        </p>
      )}
      {!plans.loading && !plans.error && !selected.length && (
        <p className="pricing-notice" role="status">
          {t("pricing.noPlans")}
        </p>
      )}
      <div
        className="pricing-periods"
        role="group"
        aria-label={t("billing.intervalLabel")}
      >
        {(["month", "quarter", "year"] as const).map((value) => {
          const savings = offers
            .filter(
              (plan) => plan.kind === "paid" && plan.billingInterval === value,
            )
            .map(
              (plan) =>
                priceSavings(
                  plan,
                  offers.find(
                    (other) =>
                      planFamily(other) === planFamily(plan) &&
                      other.billingInterval === "month",
                  ),
                  prices,
                )?.percent ?? 0,
            );
          const percent = Math.max(0, ...savings);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={interval === value}
              className={interval === value ? "active" : ""}
              onClick={() => setInterval(value)}
            >
              <span>{t(`billing.${termKey(value)}`)}</span>
              {percent > 0 && (
                <small>{t("pricing.saveUpTo", { percent })}</small>
              )}
            </button>
          );
        })}
      </div>
      <div
        className="pricing-tiers billing-grid"
        style={
          {
            "--tier-count": Math.max(selected.length, 1),
          } as React.CSSProperties
        }
      >
        {selected.map(({ family, plan, representative, monthly }) => {
          const featured = family === "tutor-60";
          const current = status.data?.plan.key === plan?.key;
          const quote = plan ? prices[plan.key]! : null;
          const saving = plan ? priceSavings(plan, monthly, prices) : null;
          const normalized =
            plan?.billingInterval &&
            quote?.amountMinor !== null &&
            quote?.currencyCode
              ? formatPrice(
                  quote!.amountMinor! / periodMonths[plan.billingInterval],
                  quote!.currencyCode!,
                  i18n.language,
                )
              : quote?.formatted;
          const Icon = featured ? Star : family === "pro" ? BookOpen : Sparkles;
          return (
            <section
              key={family}
              className={`pricing-tier${featured ? " featured" : ""}`}
              aria-label={representative.name}
            >
              {featured && (
                <span className="pricing-ribbon">
                  <Star size={13} fill="currentColor" />
                  {t("billing.recommended")}
                </span>
              )}
              {current && (
                <span className="pricing-current-tag">
                  {t("billing.currentPlan")}
                </span>
              )}
              <div className="pricing-tier-name">
                <span
                  className={`pricing-tier-icon ${family === "pro" ? "basic" : featured ? "gold" : "blue"}`}
                >
                  <Icon size={21} />
                </span>
                <h2>{representative.name}</h2>
              </div>
              <p className="pricing-tagline">
                {t(
                  family === "pro"
                    ? "pricing.proDescription"
                    : "pricing.tutorDescription",
                )}
              </p>
              <div className="pricing-price">
                {saving && monthly && (
                  <s>
                    <bdi>{price(monthly)}</bdi>
                  </s>
                )}
                <strong>
                  <bdi>{plan ? normalized : t("pricing.unavailable")}</bdi>
                </strong>
                {plan && <span>{t("billing.perMonth")}</span>}
              </div>
              <div className="pricing-bill">
                {plan ? (
                  <>
                    {t("pricing.billed", {
                      price: price(plan),
                      period: t(`billing.${termKey(plan.billingInterval!)}`),
                    })}
                    {saving && (
                      <span>
                        {" "}
                        ·{" "}
                        {t("pricing.savings", {
                          price: formatPrice(
                            saving.amountMinor,
                            saving.currency,
                            i18n.language,
                          ),
                        })}
                      </span>
                    )}
                  </>
                ) : (
                  t("pricing.intervalUnavailable")
                )}
              </div>
              <button
                type="button"
                className={`pricing-plan-action${featured ? " primary" : ""}`}
                disabled={
                  actionsDisabled || !plan || !plan.providerPriceId || current
                }
                onClick={() =>
                  plan &&
                  void (status.data?.subscription
                    ? openPortal()
                    : openCheckout(plan))
                }
              >
                {busy === plan?.key || busy === "portal"
                  ? t("billing.openingPayment")
                  : current
                    ? t("billing.currentPlan")
                    : status.data?.subscription
                      ? t("billing.manage")
                      : t("billing.choosePlan")}
              </button>
              <ul className="pricing-features">
                <li
                  className={representative.minuteAllowance ? "" : "excluded"}
                >
                  <span className="pricing-check">
                    {representative.minuteAllowance ? (
                      <Check size={13} />
                    ) : (
                      <Minus size={13} />
                    )}
                  </span>
                  {bankLabel(plan ?? representative)}
                </li>
                {representative.entitlements.map((feature) => (
                  <li key={feature}>
                    <span className="pricing-check">
                      <Check size={13} />
                    </span>
                    {featureLabel(feature)}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="pricing-trust" aria-label={t("billing.assuranceLabel")}>
        <Link to="/refund-policy">
          <ShieldCheck size={18} />
          {t("pricing.refundPolicy")}
        </Link>
        <span>
          <CircleMinus size={18} />
          {t("pricing.cancelAnytime")}
        </span>
        <span>
          <LockKeyhole size={18} />
          {t("billing.secureTitle")}
        </span>
      </div>
      {selected.length > 0 && (
        <details className="pricing-comparison" open>
          <summary>
            {t("pricing.comparison")}
            <ChevronDown size={18} />
          </summary>
          <div className="pricing-table-scroll">
            <table aria-label={t("pricing.comparison")}>
              <thead>
                <tr>
                  <th scope="col">{t("pricing.included")}</th>
                  {selected.map(({ family, representative }) => (
                    <th
                      key={family}
                      scope="col"
                      className={family === "tutor-60" ? "highlight" : ""}
                    >
                      {representative.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["minutes", ...featureKeys].map((feature) => (
                  <tr key={feature}>
                    <th scope="row">
                      {feature === "minutes"
                        ? t("pricing.tutorMinutes")
                        : featureLabel(feature)}
                    </th>
                    {selected.map(({ family, plan }) => (
                      <td
                        key={family}
                        className={family === "tutor-60" ? "highlight" : ""}
                      >
                        {!plan ? (
                          t("pricing.unavailable")
                        ) : feature === "minutes" ? (
                          bankLabel(plan)
                        ) : plan.entitlements.includes(feature) ? (
                          <Check
                            size={18}
                            aria-label={t("pricing.available")}
                          />
                        ) : (
                          <Minus
                            size={18}
                            aria-label={t("pricing.notIncluded")}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <section
        className="pricing-minutes"
        aria-labelledby="pricing-minutes-title"
      >
        <header>
          <span className="pricing-tutor-icon">
            <Headphones size={26} />
          </span>
          <div className="pricing-minutes-heading">
            <h2 id="pricing-minutes-title">{t("pricing.minutesTitle")}</h2>
            <p>{t("pricing.minutesDescription")}</p>
          </div>
          <div className="pricing-balance">
            {minutes.loading ? (
              <LoaderCircle className="spin" size={20} />
            ) : minutes.data ? (
              <>
                <strong>
                  {Math.floor(minutes.data.secondsRemaining / 60)}
                </strong>
                <small>{t("pricing.balance")}</small>
              </>
            ) : (
              <small>{t("pricing.balanceUnavailable")}</small>
            )}
          </div>
        </header>
        {minutes.error && (
          <p role="alert">
            {minutes.error}
            <button
              type="button"
              className="pricing-minute-retry"
              onClick={() => void minutes.reload()}
            >
              {t("pricing.retry")}
            </button>
          </p>
        )}
        <div
          className="pricing-packs"
          role="group"
          aria-label={t("billing.minutesPack")}
        >
          {packs.map((pack) => (
            <button
              type="button"
              className={`pricing-pack${oneTime?.key === pack.key ? " selected" : ""}`}
              key={pack.key}
              aria-pressed={oneTime?.key === pack.key}
              onClick={() => setPackKey(pack.key)}
            >
              <strong>
                {pack.minuteAllowance} <small>{t("pricing.minutesUnit")}</small>
              </strong>
              <span>{pack.name}</span>
              <b>
                <bdi>{price(pack)}</bdi>
              </b>
              <small>{t("billing.oneTime")}</small>
            </button>
          ))}
        </div>
        <footer>
          <p>
            {t("billing.minutesPackDescription")}{" "}
            {t("privateLesson.minutesChargePolicy")}
          </p>
          {oneTime ? (
            <button
              type="button"
              className="pricing-buy"
              disabled={actionsDisabled || !oneTime.providerPriceId}
              onClick={() => void openCheckout(oneTime)}
            >
              {busy === oneTime.key ? (
                t("billing.openingPayment")
              ) : (
                <>
                  {t("pricing.buyPack", {
                    count: oneTime.minuteAllowance ?? 0,
                  })}{" "}
                  · <bdi>{price(oneTime)}</bdi>
                </>
              )}
            </button>
          ) : (
            !plans.loading && <p>{t("pricing.noPacks")}</p>
          )}
        </footer>
      </section>
      <div className="pricing-faq">
        {["progress", "billing", "expiry", "refund"].map((key) => (
          <details key={key}>
            <summary>{t(`pricing.faq.${key}.question`)}</summary>
            <p>
              {t(`pricing.faq.${key}.answer`)}{" "}
              {key === "refund" && (
                <Link to="/refund-policy">{t("pricing.refundPolicy")}</Link>
              )}
            </p>
          </details>
        ))}
      </div>
      <p className="pricing-legal">
        {t("billing.checkoutNote")}{" "}
        <Link to="/terms-of-service">{t("shell.terms")}</Link> ·{" "}
        <Link to="/refund-policy">{t("shell.refunds")}</Link>
      </p>
    </div>
  );
}
