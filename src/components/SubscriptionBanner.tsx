import { Check, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "../context/SubscriptionContext";

const benefits = [
  "שמירת מילים חדשות",
  "כל המשחקים והתרגולים",
  "דיבור, האזנה והגייה",
  "עד 4 כתבות AI בחודש",
];

export function SubscriptionBanner() {
  const { status, loading } = useSubscription();
  if (loading || !status) return null;

  if (status.tier === "paid")
    return (
      <section className="subscription-banner pro" aria-label="מצב מנוי">
        <span className="subscription-icon">
          <Crown size={20} />
        </span>
        <div>
          <strong>משתמש PRO</strong>
          <small>כל יכולות GotIt פתוחות בחשבון שלך</small>
        </div>
        <Link className="subscription-manage-link" to="/billing">
          ניהול המנוי
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
                ? "זהו היום האחרון לניסיון"
                : `נותרו ${days} ימים לניסיון`
              : "תקופת הניסיון הסתיימה"}
          </p>
          <strong>
            {trial
              ? "כל יכולות ה־PRO פתוחות עבורך עכשיו"
              : "ממשיכים ללמוד עם GotIt PRO"}
          </strong>
          <small>
            {trial
              ? "שדרגו עכשיו כדי לשמור על רצף הלמידה גם אחרי הניסיון."
              : "המילים והנתונים שלך שמורים. שדרגו כדי להמשיך ללמוד ולשמור מילים."}
          </small>
        </div>
      </div>
      <ul className="subscription-benefits" aria-label="הטבות PRO">
        {benefits.map((benefit) => (
          <li key={benefit}>
            <Check size={15} />
            {benefit}
          </li>
        ))}
      </ul>
      <Link className="button primary subscription-upgrade" to="/billing">
        שדרוג ל־PRO
      </Link>
    </section>
  );
}
