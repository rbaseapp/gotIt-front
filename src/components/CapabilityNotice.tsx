import { CloudOff, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";

export function CapabilityNotice({
  title,
  milestone,
}: {
  title: string;
  milestone: string;
}) {
  const { startDemo } = useApp();
  return (
    <section className="capability-notice">
      <span className="capability-icon">
        <CloudOff size={34} />
      </span>
      <p className="eyebrow">החשבון מחובר · הנתונים שלך אינם נתוני דמו</p>
      <h1>{title}</h1>
      <p>
        ממשק השרת עבור {milestone} עדיין לא ממומש. לא נציג נתונים מדומים או
        נשמור שינויים מקומיים כאילו נשלחו לשרת.
      </p>
      <p>
        אפשר להתנסות בזרימה המלאה בסביבת הדגמה נפרדת. מעבר לדמו יוציא אותך מהסשן
        המקומי.
      </p>
      <button className="button primary" onClick={startDemo}>
        <Sparkles size={18} />
        מעבר לדמו נפרד
      </button>
    </section>
  );
}
