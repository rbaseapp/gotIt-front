import { useCallback, useState } from "react";
import { Check, CreditCard, LoaderCircle } from "lucide-react";
import { billing } from "../lib/billing";
import { useResource } from "../lib/useResource";

const entitlementLabels: Record<string, string> = {
  vocabulary: "אוצר מילים אישי",
  "practice.basic": "תרגול בסיסי",
  dashboard: "מעקב התקדמות",
  "reading.ai": "קריאה אישית עם AI",
  "speech.audio": "תרגול האזנה",
  "speech.pronunciation": "הערכת הגייה",
};

export function BillingPage() {
  const status = useResource(useCallback(() => billing.status(), []));
  const plans = useResource(useCallback(() => billing.plans(), []));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const redirect = async (action: "portal" | "checkout", planKey?: string) => {
    setBusy(planKey || action);
    setError("");
    try {
      const result = action === "portal" ? await billing.portal() : await billing.checkout(planKey!);
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "לא ניתן לפתוח את שירות התשלום כרגע.");
      setBusy("");
    }
  };

  return (
    <div className="billing-page page-enter">
      <section className="page-heading-row">
        <div><p className="eyebrow">המנוי שלך</p><h1>GotIt Free או Pro</h1>
          <p>התשלום מאובטח ומנוהל ב־Paddle. פרטי הכרטיס אינם נשמרים ב־GotIt.</p></div>
        <CreditCard size={36} />
      </section>
      {(status.loading || plans.loading) && <p role="status"><LoaderCircle className="spin" size={20} /> טוענים את פרטי המנוי…</p>}
      {(status.error || plans.error || error) && <p className="form-error" role="alert">{status.error || plans.error || error}</p>}
      {status.data && (
        <section className="live-panel billing-current">
          <div><p className="eyebrow">התוכנית הנוכחית</p><h2>{status.data.plan.name}</h2>
            <p>{status.data.tier === "paid" ? "כל יכולות ה־Pro פתוחות בחשבון." : "יכולות הלימוד הבסיסיות זמינות ללא תשלום."}</p></div>
          {status.data.subscription && <button className="button secondary" disabled={!!busy} onClick={() => void redirect("portal")}>
            {busy === "portal" ? "פותחים…" : "ניהול תשלום וביטול"}</button>}
        </section>
      )}
      <div className="billing-grid">
        {plans.data?.plans.map((plan) => (
          <section className={`live-panel billing-plan ${plan.kind}`} key={plan.id}>
            <h2>{plan.name}</h2>
            <strong className="billing-price">{plan.amountMinor === null ? "חינם" : new Intl.NumberFormat("he-IL", { style: "currency", currency: plan.currencyCode! }).format(plan.amountMinor / 100)}</strong>
            {plan.billingInterval && <small>{plan.billingInterval === "year" ? "לשנה" : "לחודש"}</small>}
            <ul>{plan.entitlements.map((feature) => <li key={feature}><Check size={16} /> {entitlementLabels[feature] || feature}</li>)}</ul>
            {plan.kind === "paid" && status.data?.tier !== "paid" && <button className="button primary" disabled={!!busy} onClick={() => void redirect("checkout", plan.key)}>
              {busy === plan.key ? "מעבירים לתשלום…" : "שדרוג ל־Pro"}</button>}
            {status.data?.plan.key === plan.key && <span className="status-chip active">התוכנית הנוכחית</span>}
          </section>
        ))}
      </div>
    </div>
  );
}
