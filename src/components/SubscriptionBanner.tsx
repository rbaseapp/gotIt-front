import { Check, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "react-i18next";

export function SubscriptionBanner() {
  const { t } = useTranslation();
  const { status, loading } = useSubscription();
  const benefits = t("subscription.benefits", { returnObjects: true }) as string[];
  if (loading || !status) return null;

  if (status.tier === "paid")
    return (
      <section className="subscription-banner pro" aria-label={t("subscription.statusLabel")}>
        <span className="subscription-icon">
          <Crown size={20} />
        </span>
        <div>
          <strong>{t("subscription.proUser")}</strong>
          <small>{t("subscription.proOpen")}</small>
        </div>
        <Link className="subscription-manage-link" to="/billing">
          {t("subscription.manage")}
        </Link>
      </section>
    );

  const trial = status.tier === "trial";
  const days = status.trial?.daysRemaining ?? 0;
  const lastDay = trial && days <= 1;
  return (
    <section
      className={`subscription-banner upgrade ${trial ? "trial" : "expired"}`}
    >
      <div className="subscription-banner-copy">
        <span className="subscription-icon">
          <Sparkles size={22} />
        </span>
        <div>
          <p className="eyebrow">
            {trial
              ? lastDay
                ? t("subscription.lastTrialDay")
                : t("subscription.trialDays", { count: days })
              : t("subscription.trialEnded")}
          </p>
          <strong>
            {trial
              ? t("subscription.trialOpen")
              : t("subscription.keepLearning")}
          </strong>
          <small>
            {trial
              ? t("subscription.trialPrompt")
              : t("subscription.expiredPrompt")}
          </small>
        </div>
      </div>
      <ul className="subscription-benefits" aria-label={t("subscription.benefitsLabel")}>
        {benefits.map((benefit) => (
          <li key={benefit}>
            <Check size={15} />
            {benefit}
          </li>
        ))}
      </ul>
      <Link className="button primary subscription-upgrade" to="/billing">
        {t("subscription.upgrade")}
      </Link>
    </section>
  );
}
