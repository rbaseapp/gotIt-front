import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Flame, Trophy, Zap, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RemoteState } from "../components/RemoteState";
import { useResource } from "../lib/useResource";
import { product, dashboardSchema } from "../lib/product";
import { learningReturn } from "../lib/learningNavigation";
import { useLearningLanguage } from "../lib/useLearningLanguage";

export function AchievementsPage() {
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
    <div className="ux-page achievements-page page-enter">
      <Link className="button ghost" to={back}>
        {t("common.back")}
      </Link>
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
            <span className="ux-icon">
              <Trophy size={30} />
            </span>
            <h2>{t("ux.stepsAddUp")}</h2>
            <div className="ux-metrics">
              <div>
                <Zap size={22} />
                <strong>
                  {d.gamification.totalXp.toLocaleString(i18n.resolvedLanguage)}
                </strong>
                <span>XP</span>
              </div>
              <div>
                <Flame size={22} />
                <strong>{d.gamification.currentStreakDays}</strong>
                <span>{t("dashboard.streak")}</span>
              </div>
            </div>
            <small>{t("ux.allLanguages")}</small>
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
            <h2>{t("dashboard.dailyGoal")}</h2>
            <p>
              {t("dashboard.goalProgress", {
                current: d.dailyGoal.current,
                value: d.dailyGoal.value,
                unit: t(
                  `settings.${d.dailyGoal.type === "items" ? "uniqueWords" : d.dailyGoal.type}`,
                ),
              })}
            </p>
            <progress
              value={Math.min(d.dailyGoal.current, d.dailyGoal.value)}
              max={d.dailyGoal.value || 1}
            />
            <Link className="button ghost" to="/settings">
              {t("ux.changeGoal")}
            </Link>
          </section>
          <details className="ux-card">
            <summary>
              <CalendarDays size={20} />
              {t("ux.weeklyProgress")}
            </summary>
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
                        ...d.weeklyActivity.days.map((entry) => entry.attempts),
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
          </details>
          <section className="ux-card">
            <h2>{t("ux.learningSeparate")}</h2>
            <p>{t("ux.retentionHelp")}</p>
            <Link className="button secondary" to="/vocabulary">
              {t("ux.words")}
            </Link>
          </section>
        </>
      )}
      <Link className="button primary" to={back}>
        {t("common.back")}
      </Link>
    </div>
  );
}
