import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moochi from "../../assets/ux/dashboard-moohi.png";
import { useApp } from "../../context/AppContext";
import { useSubscription } from "../../context/SubscriptionContext";
import { firstRunSkipped } from "../../lib/onboarding/firstRun";
import { curriculumApi } from "../../lib/structuredEnglish";
import { useResource } from "../../lib/useResource";
import "../../onboarding.css";

const DAY = 86_400_000;

/**
 * Shown on "My day" to a learner who just went through onboarding and has not
 * finished a lesson yet: one clear task instead of an empty page.
 */
export function TodayMission() {
  const { t } = useTranslation();
  const { status } = useSubscription();
  const { user } = useApp();
  const curriculum = useResource(useCallback(() => curriculumApi.get(), []));
  const data = curriculum.data;
  const placed = data?.onboarding;
  // Someone who chose "not now" on their first visit gets a gentle way back to the check.
  if (
    data &&
    !placed &&
    user &&
    firstRunSkipped(user.id) &&
    Object.keys(data.completed ?? {}).length === 0
  )
    return (
      <section
        className="ob ob-today"
        aria-label={t("start.today.checkTitle")}
        style={{ minHeight: 0 }}
      >
        <img src={moochi} alt="" draggable={false} />
        <div>
          <h2>{t("start.today.checkTitle")}</h2>
          <p>{t("start.today.checkBody")}</p>
        </div>
        <Link className="ob-btn" to="/start">
          {t("start.today.checkGo")}
        </Link>
      </section>
    );
  if (
    !data ||
    !placed ||
    Object.keys(data.completed ?? {}).length > 0 ||
    Date.now() - Date.parse(placed.placedAt) > 14 * DAY
  )
    return null;
  const unit = data.units.find((u) => u.id === data.currentUnit);
  const index = data.units.findIndex((u) => u.id === data.currentUnit) + 1;
  const days = status?.tier === "trial" ? status.trial?.daysRemaining : null;
  return (
    <section
      className="ob ob-today"
      aria-label={t("start.today.title")}
      style={{ minHeight: 0 }}
    >
      <img src={moochi} alt="" draggable={false} />
      <div>
        <h2>{t("start.today.title")}</h2>
        <p>
          {t("start.today.body", {
            unit: index || placed.startUnit,
            minutes: Math.max(5, placed.minutesPerDay),
          })}
          {unit ? ` · ${unit.title}` : ""}
        </p>
        <p>{t("start.today.gap")}</p>
        {days ? <p>{t("start.today.trial", { days })}</p> : null}
      </div>
      <Link className="ob-btn" to="/english-learning">
        {t("start.today.go")}
      </Link>
    </section>
  );
}
