import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Play,
  Trophy,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { CourseContinueCard } from "../components/CourseContinueCard";
import { LastLessonCard } from "../components/LastLessonCard";
import { RemoteState } from "../components/RemoteState";
import {
  WordPreviewModal,
  type WordPreview,
} from "../components/WordPreviewModal";
import {
  dashboardSchema,
  itemSchema,
  needsStrengthening,
  page,
  product,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { useTranslation } from "react-i18next";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { LearningLanguageSelect } from "../components/LearningLanguageSelect";

export function LiveDashboardPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const [recentPage, setRecentPage] = useState(1);
  const [selectedWord, setSelectedWord] = useState<WordPreview | null>(null);
  const language = useLearningLanguage();
  const resource = useResource(
    useCallback(
      async () => ({
        ...(await product(
          dashboardSchema,
          `dashboard?recentPage=${recentPage}&recentLimit=6${language.code ? `&sourceLanguageCode=${encodeURIComponent(language.code)}` : ""}`,
        )),
        languageCode: language.code,
      }),
      [recentPage, language.code],
    ),
  );
  const weakest = useResource(
    useCallback(
      async () => ({
        ...(await product(
          page(itemSchema),
          `learning-items?userStatus=active&practiced=true&sort=weakest&limit=3${language.code ? `&sourceLanguageCode=${encodeURIComponent(language.code)}` : ""}`,
        )),
        languageCode: language.code,
      }),
      [language.code],
    ),
  );
  const d =
    resource.data?.languageCode === language.code ? resource.data : undefined;
  const weakItems =
    weakest.data?.languageCode === language.code
      ? weakest.data.items.filter(needsStrengthening)
      : undefined;

  if (language.loading || language.error)
    return (
      <RemoteState
        loading={language.loading}
        error={language.error}
        retry={() => void language.reload()}
      />
    );

  return (
    <div className="dashboard-page live-page page-enter">
      <section className="page-heading-row dashboard-heading">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t("dashboard.greeting", { name: profile.name })}</h1>
          <p>{t("dashboard.choosePath")}</p>
        </div>
      </section>
      <LearningLanguageSelect
        code={language.code}
        languages={language.languages}
        onChange={(code) => {
          language.setCode(code);
          setRecentPage(1);
        }}
      />

      <section
        className="dashboard-paths"
        aria-label={t("dashboard.choosePath")}
      >
        <article className="dashboard-path dashboard-path-words">
          <span className="dashboard-path-icon">
            <Brain size={28} />
          </span>
          <div>
            <p className="dashboard-path-kicker">{t("dashboard.wordsPath")}</p>
            <h2>{t("dashboard.wordsPathTitle")}</h2>
            <p>{t("dashboard.wordsPathDescription")}</p>
            {d && d.counts.due > 0 && (
              <small>{t("dashboard.dueCount", { count: d.counts.due })}</small>
            )}
          </div>
          <Link
            className="button primary"
            to={
              d?.counts.total === 0
                ? "/vocabulary"
                : `/learn/session/smart?language=${encodeURIComponent(language.code)}`
            }
          >
            <Play size={18} />
            {d?.counts.total === 0
              ? t("dashboard.addWordsAction")
              : t("dashboard.startWordsAction")}
          </Link>
        </article>
        <article className="dashboard-path dashboard-path-lesson">
          <span className="dashboard-path-icon">
            <MessageCircle size={28} />
          </span>
          <div>
            <p className="dashboard-path-kicker">{t("dashboard.lessonPath")}</p>
            <h2>{t("dashboard.lessonPathTitle")}</h2>
            <p>{t("dashboard.lessonPathDescription")}</p>
          </div>
          <Link className="button secondary" to="/private-lesson">
            {t("dashboard.openLessonAction")}
            <ChevronLeft size={18} />
          </Link>
        </article>
      </section>

      <CourseContinueCard />
      <LastLessonCard />
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {d && (
        <>
          <section
            className="dashboard-today"
            aria-label={t("dashboard.todaySummary")}
          >
            <div className="dashboard-today-stat">
              <Brain size={21} />
              <span>
                <strong>{d.counts.due}</strong>
                <small>{t("dashboard.dueNow")}</small>
              </span>
            </div>
            <div className="dashboard-today-stat">
              <Trophy size={21} />
              <span>
                <strong>{d.counts.mastered}</strong>
                <small>{t("dashboard.masteredWords")}</small>
              </span>
            </div>
            <div className="dashboard-today-goal">
              <div>
                <strong>
                  {t("dashboard.dailyGoal")}
                  {d.dailyGoal.type === "minutes"
                    ? ` · ${t("dashboard.accountTotals", { defaultValue: i18n.language.startsWith("he") ? "כל השפות" : "All languages" })}`
                    : ""}
                </strong>
                <span>
                  {t("dashboard.goalProgress", {
                    current: d.dailyGoal.current,
                    value: d.dailyGoal.value,
                    unit: t(
                      `settings.${d.dailyGoal.type === "items" ? "uniqueWords" : d.dailyGoal.type}`,
                    ),
                  })}
                </span>
              </div>
              <progress
                max={d.dailyGoal.value || 1}
                value={Math.min(d.dailyGoal.current, d.dailyGoal.value)}
                aria-label={t("dashboard.dailyGoalAria")}
              />
            </div>
          </section>

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

          <details className="dashboard-more">
            <summary>{t("dashboard.moreProgress")}</summary>
            <div className="dashboard-more-content">
              <div className="live-two-columns">
                <section className="live-panel">
                  <h2>{t("dashboard.librarySnapshot")}</h2>
                  <div className="live-count-list">
                    {["new", "learning", "reviewing", "mastered"].map(
                      (status) => (
                        <span key={status}>
                          {t(`labels.${status}`)}{" "}
                          <b>{d.counts[status as "new"]}</b>
                        </span>
                      ),
                    )}
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
                      const value = d.skills.find(
                        (entry) => entry.skill === skill,
                      );
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
                          {attempt.primaryTranslation ||
                            t("vocabulary.noMeaning")}
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
                    <p className="live-empty">
                      {t("dashboard.noRecentPractice")}
                    </p>
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
                      disabled={
                        recentPage >= d.recentActivityPagination.pageCount
                      }
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
        </>
      )}
    </div>
  );
}
