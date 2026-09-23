import { CloudOff, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useTranslation } from "react-i18next";

export function CapabilityNotice({
  title,
  milestone,
}: {
  title: string;
  milestone: string;
}) {
  const { startDemo } = useApp();
  const { t } = useTranslation();
  return (
    <section className="capability-notice">
      <span className="capability-icon">
        <CloudOff size={34} />
      </span>
      <p className="eyebrow">{t("capability.eyebrow")}</p>
      <h1>{title}</h1>
      <p>
        {t("capability.unavailable", { milestone })}
      </p>
      <p>
        {t("capability.demoDescription")}
      </p>
      <button className="button primary" onClick={startDemo}>
        <Sparkles size={18} />
        {t("capability.openDemo")}
      </button>
    </section>
  );
}
