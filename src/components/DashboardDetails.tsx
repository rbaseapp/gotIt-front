import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WordPreviewModal, type WordPreview } from "./WordPreviewModal";
import { RemoteState } from "./RemoteState";
import { useResource } from "../lib/useResource";
import {
  dashboardSchema,
  itemSchema,
  page,
  product,
  needsStrengthening,
} from "../lib/product";
import type { z } from "zod";

export function DashboardDetails({
  d,
  languageCode,
  recentPage,
  setRecentPage,
}: {
  d: z.infer<typeof dashboardSchema>;
  languageCode: string;
  recentPage: number;
  setRecentPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { t, i18n } = useTranslation();
  const [selectedWord, setSelectedWord] = useState<WordPreview | null>(null);
  const weakest = useResource(
    useCallback(
      async () => ({
        ...(await product(
          page(itemSchema),
          `learning-items?userStatus=active&practiced=true&sort=weakest&limit=3${languageCode ? `&sourceLanguageCode=${encodeURIComponent(languageCode)}` : ""}`,
        )),
        languageCode,
      }),
      [languageCode],
    ),
  );
  const weakItems =
    weakest.data?.languageCode === languageCode
      ? weakest.data.items.filter(needsStrengthening)
      : [];
  return (
    <>
      <details className="dashboard-more">
        <summary>{t("dashboard.moreProgress")}</summary>
        <div className="dashboard-more-content">
          {" "}
          {weakItems && weakItems.length > 0 && (
            <section className="live-panel dashboard-weak-panel">
              <h2>{t("dashboard.strengthen")}</h2>
              {weakItems.map((item) => (
                <button
                  type="button"
                  className="live-weak-word"
                  key={item.id}
                  onClick={() =>
                    setSelectedWord({
                      sourceText: item.sourceText,
                      translationText: item.primaryTranslation,
                    })
                  }
                >
                  <b dir="auto">{item.sourceText}</b>
                  <span dir="auto">{item.primaryTranslation}</span>
                </button>
              ))}
            </section>
          )}
          <div className="live-two-columns">
            <section className="live-panel">
              <h2>{t("dashboard.librarySnapshot")}</h2>
              <div className="live-count-list">
                {["new", "learning", "reviewing", "mastered"].map((status) => (
                  <span key={status}>
                    {t(`labels.${status}`)} <b>{d.counts[status as "new"]}</b>
                  </span>
                ))}
              </div>
              <small>{t("dashboard.libraryCountHelp")}</small>
            </section>
            <section className="live-panel">
              <h2>{t("dashboard.fiveSkills")}</h2>
              <div className="live-skill-grid">
                {[
                  "recognition",
                  "recall",
                  "listening",
                  "spelling",
                  "pronunciation",
                ].map((skill) => {
                  const value = d.skills.find((entry) => entry.skill === skill);
                  return (
                    <div key={skill}>
                      <b>{t(`labels.${skill}`)}</b>
                      {value ? (
                        <>
                          <progress value={value.masteryScore} max={100} />
                          <span>
                            {Math.round(value.masteryScore)}% ·{" "}
                            {t("dashboard.skillAttempts", {
                              count: value.evidenceAttempts,
                            })}
                          </span>
                        </>
                      ) : (
                        <span>{t("dashboard.noSkillData")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <div className="live-two-columns">
            <section className="live-panel">
              <h2>{t("dashboard.yourWeek")}</h2>
              <p>
                {t("dashboard.weekSummary", {
                  minutes: Math.floor(
                    d.weeklyActivity.days.reduce(
                      (sum, day) => sum + day.practiceSeconds,
                      0,
                    ) / 60,
                  ),
                  mastered: d.weeklyActivity.days.reduce(
                    (sum, day) => sum + day.itemsMastered,
                    0,
                  ),
                })}
              </p>
              <div className="live-activity">
                {d.weeklyActivity.days.length ? (
                  d.weeklyActivity.days.map((day) => (
                    <div key={day.date}>
                      <time>{day.date}</time>
                      <progress
                        max={Math.max(
                          ...d.weeklyActivity.days.map(
                            (entry) => entry.attempts,
                          ),
                          1,
                        )}
                        value={day.attempts}
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
            </section>
            <section className="live-panel">
              <h2>
                {t("dashboard.pointsAndStreak")} ·{" "}
                {t("dashboard.accountTotals", {
                  defaultValue: i18n.language.startsWith("he")
                    ? "כל השפות"
                    : "All languages",
                })}
              </h2>
              <div className="live-count-list">
                <span>
                  <span>
                    <Zap size={17} /> {t("dashboard.serverXp")}
                  </span>
                  <b>{d.gamification.totalXp.toLocaleString()}</b>
                </span>
                <span>
                  {t("dashboard.streak")}{" "}
                  <b>{d.gamification.currentStreakDays}</b>
                </span>
              </div>
            </section>
          </div>
          <section className="live-panel recent-practice-panel">
            <div className="recent-practice-heading">
              <div>
                <h2>{t("dashboard.recentPractice")}</h2>
                <p>{t("dashboard.recentPracticeHelp")}</p>
              </div>
            </div>
            <div className="recent-practice-list">
              {d.recentActivity.map((attempt) => (
                <article className="recent-practice-row" key={attempt.id}>
                  <button
                    type="button"
                    className="recent-practice-word"
                    onClick={() =>
                      setSelectedWord({
                        sourceText: attempt.sourceText,
                        translationText: attempt.primaryTranslation,
                      })
                    }
                  >
                    <b dir="auto">{attempt.sourceText}</b>
                    <span dir="auto">
                      {attempt.primaryTranslation || t("vocabulary.noMeaning")}
                    </span>
                  </button>
                  <div className="recent-practice-type">
                    <span className="pill">
                      {t(`labels.${attempt.exerciseType}`, {
                        defaultValue: attempt.exerciseType,
                      })}
                    </span>
                    <span className={`practice-result ${attempt.result}`}>
                      {t(`labels.${attempt.result}`, {
                        defaultValue: attempt.result,
                      })}
                    </span>
                  </div>
                  <div className="recent-practice-score">
                    <b>
                      {attempt.score === null
                        ? t("game.noScore")
                        : t("dashboard.score", {
                            score: Math.round(attempt.score),
                          })}
                    </b>
                    <time dateTime={attempt.createdAt}>
                      {new Date(attempt.createdAt).toLocaleString(
                        i18n.resolvedLanguage,
                      )}
                    </time>
                  </div>
                </article>
              ))}
              {!d.recentActivity.length && (
                <p className="live-empty">{t("dashboard.noRecentPractice")}</p>
              )}
            </div>
            {d.recentActivityPagination.pageCount > 1 && (
              <nav
                className="live-pagination compact"
                aria-label={t("dashboard.recentPaginationAria")}
              >
                <button
                  className="button ghost pagination-arrow"
                  disabled={recentPage <= 1}
                  aria-label={t("dashboard.previousPage")}
                  onClick={() =>
                    setRecentPage((current) => Math.max(1, current - 1))
                  }
                >
                  <ChevronRight size={18} />
                </button>
                <span>
                  {t("dashboard.pageSummary", {
                    page: d.recentActivityPagination.page,
                    pages: d.recentActivityPagination.pageCount,
                  })}
                </span>
                <button
                  className="button secondary pagination-arrow"
                  disabled={recentPage >= d.recentActivityPagination.pageCount}
                  aria-label={t("dashboard.nextPage")}
                  onClick={() => setRecentPage((current) => current + 1)}
                >
                  <ChevronLeft size={18} />
                </button>
              </nav>
            )}
          </section>
        </div>
      </details>
      <WordPreviewModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
      <RemoteState
        loading={false}
        error={weakest.error}
        retry={() => void weakest.reload()}
      />
    </>
  );
}
