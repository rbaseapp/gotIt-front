import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Flame,
  LibraryBig,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { RemoteState } from "../components/RemoteState";
import {
  dashboardSchema,
  itemSchema,
  needsStrengthening,
  page,
  product,
  wordPacksSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { useTranslation } from "react-i18next";
export function LiveDashboardPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const [recentPage, setRecentPage] = useState(1);
  const resource = useResource(
    useCallback(
      () =>
        product(
          dashboardSchema,
          `dashboard?recentPage=${recentPage}&recentLimit=6`,
        ),
      [recentPage],
    ),
  );
  const weakest = useResource(
    useCallback(
      () =>
        product(
          page(itemSchema),
          "learning-items?userStatus=active&practiced=true&sort=weakest&limit=3",
        ),
      [],
    ),
  );
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const d = resource.data;
  const weakItems = weakest.data?.items.filter(needsStrengthening);
  const installedPacks = packs.data?.packs.filter((pack) => pack.installed);
  return (
    <div className="dashboard-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>
            {t("dashboard.greeting", { name: profile.name })}{" "}
            <span aria-hidden="true">☀</span>
          </h1>
          <p>{t("dashboard.tagline")}</p>
        </div>
        <Link className="button primary" to="/learn/session/smart">
          <Play size={18} />
          {t("dashboard.startReview")}
        </Link>
      </section>
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {d && (
        <>
          <div className="live-stats-grid">
            <div>
              <span>
                <Zap size={18} />
                {t("dashboard.serverXp")}
              </span>
              <b>{d.gamification.totalXp.toLocaleString()}</b>
              <small>
                {t("dashboard.level", {
                  level: d.gamification.level,
                  next: d.gamification.nextLevelXp,
                })}
              </small>
              <small>
                {d.gamification.dailyXpCapReached
                  ? t("dashboard.capReached", {
                      cap: d.gamification.dailyXpCap,
                      percent: d.gamification.postDailyCapPercent,
                      timezone: d.weeklyActivity.timezone,
                    })
                  : t("dashboard.todayXp", {
                      current: d.gamification.todayXp,
                      cap: d.gamification.dailyXpCap,
                    })}
              </small>
            </div>
            <div>
              <span>
                <Flame size={18} />
                {t("dashboard.streak")}
              </span>
              <b>{d.gamification.currentStreakDays}</b>
              <small>
                {t("dashboard.streakRecord", {
                  count: d.gamification.longestStreakDays,
                })}
              </small>
            </div>
            <div>
              <span>
                <Trophy size={18} />
                {t("dashboard.masteredWords")}
              </span>
              <b>{d.counts.mastered}</b>
              <small>{t("dashboard.masteredHelp")}</small>
            </div>
            <div>
              <span>
                <Brain size={18} />
                {t("dashboard.dueNow")}
              </span>
              <b>{d.counts.due}</b>
              <small>{t("dashboard.dueHelp")}</small>
            </div>
            <div>
              <span>
                <Sparkles size={18} />
                {t("dashboard.awaitingTitle")}
              </span>
              <b>{d.counts.awaitingRecall}</b>
              <small>{t("dashboard.awaitingHelp")}</small>
            </div>
          </div>
          <section className="smart-session-card">
            <div className="smart-visual">
              <Brain size={48} />
            </div>
            <div className="smart-copy">
              <span className="pill light">
                <Sparkles size={15} />
                {t("dashboard.serverChooses")}
              </span>
              <h2>{t("dashboard.smallStep")}</h2>
              <p>
                {d.counts.total === 0
                  ? t("dashboard.addFirstWord")
                  : t("dashboard.libraryReview", { count: d.counts.total })}
              </p>
            </div>
            <Link
              className="button smart-start"
              to={d.counts.total ? "/learn/session/smart" : "/vocabulary"}
            >
              {d.counts.total
                ? t("dashboard.smartPractice")
                : t("dashboard.toVocabulary")}
            </Link>
          </section>
          <section className="live-panel dashboard-packs-panel">
            <div className="pack-dashboard-heading">
              <div>
                <span className="pill light">
                  <LibraryBig size={15} /> {t("dashboard.packLearning")}
                </span>
                <h2>{t("dashboard.installedPacks")}</h2>
              </div>
              <Link className="text-link" to="/word-packs">
                {t("dashboard.allPacks")}
              </Link>
            </div>
            <RemoteState
              loading={packs.loading}
              error={packs.error}
              retry={() => void packs.reload()}
            />
            {installedPacks && installedPacks.length > 0 && (
              <div className="dashboard-pack-grid">
                {installedPacks.map((pack) => {
                  const percent = pack.progress.linked
                    ? Math.round(
                        (pack.progress.mastered / pack.progress.linked) * 100,
                      )
                    : 0;
                  return (
                    <article className="dashboard-pack-card" key={pack.id}>
                      <div>
                        <small>{pack.track.title}</small>
                        <h3>{pack.title}</h3>
                      </div>
                      <strong>{percent}%</strong>
                      <progress
                        max={100}
                        value={percent}
                        aria-label={t("dashboard.packProgress", {
                          title: pack.title,
                        })}
                      />
                      <p>
                        {t("dashboard.packCompleted", {
                          mastered: pack.progress.mastered,
                          linked: pack.progress.linked,
                        })}
                      </p>
                      <Link
                        className="button secondary"
                        to={`/learn/session/smart?pack=${pack.id}`}
                      >
                        <Play size={16} /> {t("dashboard.continueLearning")}
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
            {installedPacks && !installedPacks.length && (
              <div className="live-empty">
                <p>{t("dashboard.noPacks")}</p>
                <Link className="button secondary" to="/word-packs">
                  {t("dashboard.chooseFirstPack")}
                </Link>
              </div>
            )}
          </section>
          <div className="live-two-columns">
            <section className="live-panel">
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
                max={d.dailyGoal.value || 1}
                value={Math.min(d.dailyGoal.current, d.dailyGoal.value)}
                aria-label={t("dashboard.dailyGoalAria")}
              />
              <p>
                {d.dailyGoal.completed
                  ? t("dashboard.goalCompleted")
                  : t("dashboard.goalEncouragement")}
              </p>
              <small>
                {t("dashboard.goalDate", { date: d.dailyGoal.date })}
              </small>
            </section>
            <section className="live-panel">
              <h2>{t("dashboard.librarySnapshot")}</h2>
              <div className="live-count-list">
                {["new", "learning", "reviewing", "mastered"].map((s) => (
                  <span key={s}>
                    {t(`labels.${s}`)} <b>{d.counts[s as "new"]}</b>
                  </span>
                ))}
                <span>
                  {t("dashboard.difficult")} <b>{d.counts.difficult}</b>
                </span>
                <span>
                  {t("dashboard.highPriority")} <b>{d.counts.highPriority}</b>
                </span>
                <span>
                  {t("dashboard.awaitingRecall")}{" "}
                  <b>{d.counts.awaitingRecall}</b>
                </span>
              </div>
              <small>{t("dashboard.libraryCountHelp")}</small>
            </section>
          </div>
          <section className="live-panel">
            <h2>{t("dashboard.fiveSkills")}</h2>
            <div className="live-skill-grid">
              {[
                "recognition",
                "recall",
                "listening",
                "spelling",
                "pronunciation",
              ].map((s) => {
                const value = d.skills.find((v) => v.skill === s);
                return (
                  <div key={s}>
                    <b>{t(`labels.${s}`)}</b>
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
                          ...d.weeklyActivity.days.map((v) => v.attempts),
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
              <small>{d.weeklyActivity.timezone}</small>
            </section>
            <section className="live-panel">
              <h2>{t("dashboard.strengthen")}</h2>
              <RemoteState
                loading={weakest.loading}
                error={weakest.error}
                retry={() => void weakest.reload()}
              />
              {weakItems?.map((i) => (
                <Link
                  className="live-weak-word"
                  key={i.id}
                  to={`/vocabulary?item=${i.id}`}
                >
                  <b dir="auto">{i.sourceText}</b>
                  <span dir="auto">{i.primaryTranslation}</span>
                  <small>{Math.round(i.overallMasteryScore)}%</small>
                </Link>
              ))}
              {weakItems && !weakItems.length && (
                <p>{t("dashboard.noWeakWords")}</p>
              )}
            </section>
          </div>
          <section className="live-panel recent-practice-panel">
            <div className="recent-practice-heading">
              <div>
                <h2>{t("dashboard.recentPractice")}</h2>
                <p>{t("dashboard.recentPracticeHelp")}</p>
              </div>
              <span className="pill">
                {t("dashboard.practiceCount", {
                  count: d.recentActivityPagination.totalCount,
                })}
              </span>
            </div>
            <div className="live-count-list">
              {d.modes.map((m) => (
                <span key={m.exerciseType}>
                  {t(`labels.${m.exerciseType}`, {
                    defaultValue: m.exerciseType,
                  })}
                  :{" "}
                  {t("dashboard.modeSummary", {
                    count: m.attempts,
                    score:
                      m.averageScore === null
                        ? "—"
                        : Math.round(m.averageScore),
                  })}
                </span>
              ))}
            </div>
            <div className="recent-practice-list">
              {d.recentActivity.map((a) => (
                <article className="recent-practice-row" key={a.id}>
                  <Link
                    className="recent-practice-word"
                    to={`/vocabulary?item=${a.learningItemId}`}
                  >
                    <b dir="auto">{a.sourceText}</b>
                    <span dir="auto">
                      {a.primaryTranslation || t("vocabulary.noMeaning")}
                    </span>
                  </Link>
                  <div className="recent-practice-type">
                    <span className="pill">
                      {t(`labels.${a.exerciseType}`, {
                        defaultValue: a.exerciseType,
                      })}
                    </span>
                    <span className={`practice-result ${a.result}`}>
                      {t(`labels.${a.result}`, { defaultValue: a.result })}
                    </span>
                  </div>
                  <div className="recent-practice-score">
                    <b>
                      {a.score === null
                        ? t("game.noScore")
                        : t("dashboard.score", { score: Math.round(a.score) })}
                    </b>
                    <time dateTime={a.createdAt}>
                      {new Date(a.createdAt).toLocaleString(
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
                  onClick={() => setRecentPage((page) => Math.max(1, page - 1))}
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
                  onClick={() => setRecentPage((page) => page + 1)}
                >
                  <ChevronLeft size={18} />
                </button>
              </nav>
            )}
          </section>
        </>
      )}
    </div>
  );
}
