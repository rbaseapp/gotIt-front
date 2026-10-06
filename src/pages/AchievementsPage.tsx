import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Modal } from "../components/Modal";
import { useTranslation } from "react-i18next";
import { RemoteState } from "../components/RemoteState";
import { useResource } from "../lib/useResource";
import { product, dashboardSchema } from "../lib/product";
import { learningReturn } from "../lib/learningNavigation";
import { useLearningLanguage } from "../lib/useLearningLanguage";

export function AchievementsPage() {
  const [weekly, setWeekly] = useState(false);
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const language = useLearningLanguage();
  const resource = useResource(
    useCallback(
      async () => ({
        ...(await product(
          dashboardSchema,
          `dashboard${language.code ? `?sourceLanguageCode=${encodeURIComponent(language.code)}` : ""}`,
        )),
        languageCode: language.code,
      }),
      [language.code],
    ),
  );
  const d =
    resource.data?.languageCode === language.code ? resource.data : undefined;
  const back = learningReturn(params.get("return"), "/dashboard");
  return (
    <div
      className="canonical-page achievements-page page-enter"
      data-figma-desktop="43:21520"
    >
      <header className="page-heading-row">
        <div>
          <h1>{t("ux.achievements")}</h1>
          <p>{t("ux.achievementsHelp")}</p>
        </div>
      </header>
      <RemoteState
        loading={resource.loading || language.loading}
        error={resource.error || language.error}
        retry={() => {
          void resource.reload();
          void language.reload();
        }}
      />
      {d && (
        <>
          <section className="ux-card mint achievement-overview">
            <h2>{t("ux.stepsAddUp")}</h2>
            <p>
              {t("accountUi.stepsSummary", {
                xp: d.gamification.totalXp.toLocaleString(
                  i18n.resolvedLanguage,
                ),
                days: d.weeklyActivity.days.filter(
                  (day) => day.attempts > 0 || day.practiceSeconds > 0,
                ).length,
              })}
            </p>
          </section>
          <section className="ux-card lavender">
            <h2>{t("ux.gameLevel", { level: d.gamification.level })}</h2>
            <p>
              {t("ux.nextLevel", {
                xp: Math.max(
                  0,
                  d.gamification.nextLevelXp - d.gamification.totalXp,
                ),
              })}
            </p>
          </section>
          <section className="ux-card">
            <h2>{t("ux.learningSeparate")}</h2>
            <p>{t("ux.retentionHelp")}</p>
            <Link className="button secondary" to="/vocabulary">
              {t("accountUi.learningDetails")}
            </Link>
          </section>
          <button
            type="button"
            className="button secondary"
            onClick={() => setWeekly(true)}
          >
            <CalendarDays size={20} />
            {t("ux.weeklyProgress")}
          </button>
          <Link className="button ghost" to="/settings#learning">
            {t("ux.changeGoal")}
          </Link>
          <Modal
            open={weekly}
            onClose={() => setWeekly(false)}
            title={t("ux.weeklyProgress")}
          >
            <div className="modal-body">
              <h2>
                <CalendarDays size={20} />
                {t("ux.weeklyProgress")}
              </h2>
              <div className="live-activity">
                {d.weeklyActivity.days.length ? (
                  d.weeklyActivity.days.map((day) => (
                    <div key={day.date}>
                      <time dateTime={day.date}>
                        {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                          i18n.resolvedLanguage,
                          { weekday: "short", day: "numeric" },
                        )}
                      </time>
                      <progress
                        value={day.attempts}
                        max={Math.max(
                          1,
                          ...d.weeklyActivity.days.map(
                            (entry) => entry.attempts,
                          ),
                        )}
                      />
                      <small>
                        {t("dashboard.dayActivity", {
                          count: day.attempts,
                          xp: day.xpEarned,
                        })}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>{t("dashboard.noActivity")}</p>
                )}
              </div>
            </div>
          </Modal>
        </>
      )}
      <Link className="button primary" to={back}>
        {t("common.back")}
      </Link>
    </div>
  );
}
