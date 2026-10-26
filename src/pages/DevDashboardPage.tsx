import { LearningStatusSource } from "../components/LearningStatusSource";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenText,
  Check,
  ChevronLeft,
  MessageCircle,
  Play,
  Sparkles,
  Gift,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { DashboardDetails } from "../components/DashboardDetails";
import { DashboardArticle } from "../components/DashboardArticle";
import { DashboardQuickReview } from "../components/DashboardQuickReview";
import { RemoteState } from "../components/RemoteState";
import { useResource } from "../lib/useResource";
import { useCachedResource } from "../lib/useCachedResource";
import { resourceKey } from "../lib/resourceCache";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { courseApi, lessonLink } from "../lib/courses";
import {
  completedEnglishUnit,
  resolvedEnglishUnit,
  englishPathLevels,
} from "../lib/englishPath";
import { curriculumApi } from "../lib/structuredEnglish";
import {
  chooseHomeLanguage,
  homeLanguage,
  selectedProgram,
} from "../lib/learningNavigation";
import { captureIsInactive } from "../lib/dashboardDesign";
import {
  dashboardSchema,
  itemSchema,
  page,
  product,
  sessionSchema,
  wordPacksSchema,
} from "../lib/product";
import moohi from "../assets/ux/dashboard-moohi.png";
import { TodayMission } from "../components/onboarding/TodayMission";
import { DashboardMoohi } from "../components/DashboardMoohi";
import "../dashboard-design.css";

function Segments({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const percent =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const segments = Math.min(20, Math.max(1, total));
  return (
    <div
      className="nd-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="nd-segments">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={
              ((i + 1) / segments) * 100 <= percent
                ? "done"
                : (i / segments) * 100 < percent
                  ? "current"
                  : ""
            }
          />
        ))}
      </div>
      <b>{percent}%</b>
    </div>
  );
}

export function DevDashboardPage() {
  const { t } = useTranslation();
  const { profile, user } = useApp();
  const language = useLearningLanguage();
  const [chosen, setChosen] = useState(() => homeLanguage(user));
  const code = chosen || language.code;
  const selected = selectedProgram(user, code);
  const structured = useResource(
    useCallback(async () => {
      if (
        code !== "en" ||
        !["english-zero-c1", "english-path"].includes(selected ?? "")
      )
        return null;
      const catalog = await curriculumApi.catalog();
      return catalog.programs.length ? curriculumApi.get() : null;
    }, [code, selected]),
  );
  const [recentPage, setRecentPage] = useState(1);
  const courses = useCachedResource(
    useCallback(() => courseApi.list(), []),
    resourceKey(user, "courses"),
  );
  const dashboard = useResource(
    useCallback(
      async () => ({
        ...(await product(
          dashboardSchema,
          `dashboard?${new URLSearchParams({ recentPage: String(recentPage), recentLimit: "6", ...(code ? { sourceLanguageCode: code } : {}) })}`,
        )),
        language: code,
      }),
      [code, recentPage],
    ),
  );
  const words = useResource(
    useCallback(
      async () => ({
        ...(code
          ? await product(
              page(itemSchema),
              `learning-items?${new URLSearchParams({ sourceLanguageCode: code, userStatus: "active", sort: "recent", limit: "8" })}`,
            )
          : { items: [], nextCursor: null }),
        language: code,
      }),
      [code],
    ),
  );
  const latest = useResource(
    useCallback(
      async () => ({
        ...(code
          ? await product(
              page(itemSchema),
              `learning-items?${new URLSearchParams({ sourceLanguageCode: code, userStatus: "all", sort: "recent", limit: "1" })}`,
            )
          : { items: [], nextCursor: null }),
        language: code,
      }),
      [code],
    ),
  );
  const sessions = useResource(
    useCallback(
      async () => ({
        ...(code
          ? await product(
              page(sessionSchema),
              `practice/sessions?${new URLSearchParams({ sourceLanguageCode: code, limit: "10" })}`,
            )
          : { items: [], nextCursor: null }),
        language: code,
      }),
      [code],
    ),
  );
  const packs = useResource(
    useCallback(
      () =>
        selected === "english-path" && code === "en"
          ? product(
              wordPacksSchema,
              `word-packs?${new URLSearchParams({ sourceLanguageCode: code, translationLanguageCode: profile.defaultTranslationLanguage || "he" })}`,
            )
          : Promise.resolve({ packs: [] }),
      [selected, code, profile.defaultTranslationLanguage],
    ),
  );
  const d = dashboard.data?.language === code ? dashboard.data : undefined;
  const personalWords =
    words.data?.language === code
      ? words.data.items.filter(
          (word) =>
            word.sourceLanguageCode === code && word.userStatus === "active",
        )
      : [];
  const inactive =
    latest.data?.language === code &&
    !latest.loading &&
    !latest.error &&
    captureIsInactive(latest.data.items[0]?.createdAt);
  const course = courses.data?.courses.find(
    (item) =>
      item.id === selected &&
      item.activeVersion !== null &&
      item.preferences.targetLanguageCode === code,
  );
  const plan = course?.versions.find(
    (version) => version.version === course.activeVersion,
  )?.plan;
  const path = englishPathLevels(packs.data?.packs ?? []).flatMap(
    (level) => level.packs,
  );
  const nextPack =
    path.find((pack) => !resolvedEnglishUnit(pack)) ?? path.at(-1);
  const isStructured = Boolean(structured.data);
  const structuredUnit = structured.data?.units.find(
    (unit) => unit.id === structured.data?.currentUnit,
  );
  const isPath = selected === "english-path" && code === "en" && !isStructured;
  const isProgram = !!course || isPath || isStructured;
  // A learner placed by the level check starts partway: the units before their
  // start count as behind them, so progress and "lesson N" agree with the level.
  const placedIndex = isStructured
    ? Math.max(
        0,
        structured.data!.units.findIndex(
          (unit) => unit.id === structured.data!.currentUnit,
        ),
      )
    : 0;
  const completed = isStructured
    ? Math.max(
        placedIndex,
        structured.data!.units.filter(
          (unit) =>
            unit.waived || structured.data!.completed[`gate:${unit.id}`],
        ).length,
      )
    : course
      ? course.progress.covered
      : path.filter(completedEnglishUnit).length;
  const total = isStructured
    ? structured.data!.units.length
    : (plan?.units.reduce((sum, unit) => sum + unit.lessons.length, 0) ??
      path.length);
  const programDone = isStructured
    ? structured.data!.graduation.complete ||
      structured.data!.navigationComplete === true
    : course
      ? !course.nextLesson
      : isPath && total > 0 && path.every(resolvedEnglishUnit);
  const nextNumber =
    course?.nextLesson && plan
      ? plan.units
          .slice(
            0,
            Math.max(
              0,
              plan.units.findIndex(
                (unit) => unit.key === course.nextLesson!.unitKey,
              ),
            ),
          )
          .reduce((sum, unit) => sum + unit.lessons.length, 0) +
        course.nextLesson.lessonIndex +
        1
      : Math.min(completed + 1, total);
  const planLink = isStructured
    ? "/english-learning"
    : course
      ? `/courses/${course.id}`
      : "/english-learning";
  const lesson = course?.nextLesson
    ? lessonLink(course)
    : isPath && nextPack && !programDone
      ? `/english-learning?${new URLSearchParams({ unit: nextPack.id })}`
      : planLink;
  const smart = `/learn/smart?${new URLSearchParams({ language: code, return: "/dashboard" })}`;
  const resume =
    sessions.data?.language === code
      ? sessions.data.items.find(
          (session) => session.status === "active" && !session.scope,
        )
      : undefined;
  const resumeType =
    resume?.sessionType === "smart_review"
      ? "smart"
      : resume?.sessionType === "listening_spelling"
        ? "listening"
        : resume?.sessionType;
  const wordDestination = resume
    ? `/learn/session/${resumeType}?${new URLSearchParams({ resume: resume.id, language: code, return: "/dashboard" })}`
    : d?.counts.total
      ? smart
      : "/vocabulary";
  const languages = new Set(
    [
      code,
      ...language.languages.map((item) => item.code),
      ...profile.languages.map((item) => item.languageCode),
      ...(courses.data?.courses.map(
        (item) => item.preferences.targetLanguageCode,
      ) ?? []),
    ].filter(Boolean),
  );
  const unit = d
    ? t(
        `settings.${d.dailyGoal.type === "items" ? "uniqueWords" : d.dailyGoal.type}`,
      )
    : "";
  const otherPrograms =
    courses.data?.courses.filter(
      (item) => item.id !== selected && item.activeVersion !== null,
    ) ?? [];
  const heading = isProgram
    ? (structured.data?.program.title ?? plan?.title ?? t("englishPath.title"))
    : t(
        !d?.counts.total
          ? "newDashboard.firstWords"
          : inactive
            ? "newDashboard.welcomeBack"
            : "newDashboard.wordsWaiting",
      );
  const refresh = () => {
    void dashboard.reload();
    void sessions.reload();
  };
  const blocked =
    language.loading ||
    !!language.error ||
    (dashboard.loading && !d) ||
    !!dashboard.error ||
    (!!selected && (courses.loading || !!courses.error)) ||
    (isPath && (packs.loading || !!packs.error));
  return (
    <div
      className={`nd-dashboard${isProgram ? " nd-with-program" : " nd-words-only"}`}
    >
      <LearningStatusSource
        goal={d?.dailyGoal}
        streakDays={d?.gamification.currentStreakDays}
        language={{
          value: code,
          options: [...languages],
          translationCode: profile.defaultTranslationLanguage || "he",
          disabled: language.loading,
          onChange: (code) => {
            setChosen(code);
            language.setCode(code);
            chooseHomeLanguage(code, user);
            setRecentPage(1);
          },
        }}
      />
      <div className="nd-wrap nd-content">
        <RemoteState
          loading={
            language.loading ||
            (dashboard.loading && !d) ||
            (!!selected && courses.loading) ||
            (isPath && packs.loading)
          }
          error={
            language.error ||
            dashboard.error ||
            (selected ? courses.error : "") ||
            (isPath ? packs.error : "")
          }
          retry={() => {
            void language.reload();
            void dashboard.reload();
            void courses.reload();
            void packs.reload();
          }}
        />
        {!blocked && d && (
          <>
            <p className="nd-greeting">
              {t("ux.greeting", { name: profile.name })}
            </p>
            <section className="nd-hero" aria-labelledby="nd-hero-title">
              <div className="nd-main-card nd-card">
                <div className="nd-hero-meta">
                  <span className="nd-tag">
                    <i />
                    {t(
                      isProgram
                        ? "newDashboard.activeProgram"
                        : "newDashboard.yourDay",
                    )}
                  </span>
                  <small>
                    {isProgram
                      ? total > 0
                        ? t("newDashboard.lessonNumber", {
                            current: nextNumber,
                            total,
                          })
                        : t("newDashboard.programReady")
                      : t("newDashboard.goal", {
                          current: d.dailyGoal.current,
                          value: d.dailyGoal.value,
                          unit,
                        })}
                  </small>
                </div>
                <TodayMission embedded />
                <h1 id="nd-hero-title" dir="auto">
                  {heading}
                </h1>
                <Segments
                  current={isProgram ? completed : d.dailyGoal.current}
                  total={isProgram ? total : d.dailyGoal.value}
                  label={t(
                    isProgram
                      ? "newDashboard.programProgress"
                      : "demoDashboard.yourDailyGoal",
                  )}
                />
                {isProgram ? (
                  <div className="nd-next-lesson">
                    <small>
                      {t(
                        programDone
                          ? structured.data?.pathChoices?.units.length ||
                            structured.data?.pathChoices?.activities.length ||
                            course?.skippedLessons?.length
                            ? "pathChoices.routeEnd"
                            : "newDashboard.programComplete"
                          : "newDashboard.nextLesson",
                      )}
                    </small>
                    <h2 dir="auto">
                      {structuredUnit?.title ??
                        course?.nextLesson?.title ??
                        nextPack?.title ??
                        t("ux.openMap")}
                    </h2>
                    <p dir="auto">
                      {structuredUnit?.goal ??
                        course?.nextLesson?.objective ??
                        nextPack?.description ??
                        plan?.outcome}
                    </p>
                  </div>
                ) : (
                  <>
                    <ol className="nd-day-list">
                      <li className={d.counts.due ? "highlight" : ""}>
                        <span className="nd-number">1</span>
                        <div>
                          <b>{t("newDashboard.dueWords")}</b>
                          <small>
                            {t("newDashboard.wordCount", {
                              count: d.counts.due,
                            })}
                          </small>
                        </div>
                        <Check
                          size={19}
                          className={d.counts.due ? "nd-hidden" : ""}
                        />
                      </li>
                      <li>
                        <span className="nd-number">2</span>
                        <div>
                          <b>{t("newDashboard.newWords")}</b>
                          <small>
                            {t("newDashboard.wordCount", {
                              count: d.counts.new,
                            })}
                          </small>
                        </div>
                        <Link to="/vocabulary" className="nd-text-link">
                          {t("newDashboard.addWords")}
                        </Link>
                      </li>
                    </ol>
                    {!d.counts.total && <p>{t("ux.noWordsHelp")}</p>}
                    <div className="nd-xp-note">
                      <Zap size={21} />
                      <div>
                        <b>
                          {t("newDashboard.todayXp", {
                            xp: d.gamification.todayXp,
                          })}
                        </b>
                        <small>{t("newDashboard.xpHelp")}</small>
                      </div>
                    </div>
                  </>
                )}
                <Link
                  className="nd-button nd-main-action"
                  to={isProgram ? lesson : wordDestination}
                >
                  <Play size={18} fill="currentColor" />
                  {t(
                    isProgram
                      ? programDone
                        ? "ux.openMap"
                        : "newDashboard.continueLesson"
                      : resume
                        ? "ux.resumeActivity"
                        : !d.counts.total
                          ? "newDashboard.addFirstWord"
                          : "newDashboard.startReview",
                  )}
                </Link>
                {isProgram ? (
                  <Link className="nd-text-link nd-centered" to={planLink}>
                    {t("newDashboard.programDetails")}
                  </Link>
                ) : (
                  <details className="nd-day-explanation">
                    <summary>{t("newDashboard.howDayWorks")}</summary>
                    <p>{t("newDashboard.dayExplanation")}</p>
                    <Link
                      to={`/learn?${new URLSearchParams({ language: code, return: "/dashboard" })}`}
                    >
                      {t("ux.chooseGame")}
                    </Link>
                  </details>
                )}
              </div>
              <div className="nd-mascot">
                <p className="nd-speech">
                  {t(
                    isProgram
                      ? "newDashboard.programEncouragement"
                      : inactive
                        ? "newDashboard.captureEncouragement"
                        : "newDashboard.wordEncouragement",
                  )}
                </p>
                <DashboardMoohi src={moohi} label={t("newDashboard.moohi")} />
                {inactive && (
                  <Link className="nd-text-link" to="/vocabulary">
                    {t("newDashboard.addWords")}
                  </Link>
                )}
              </div>
            </section>
            {isProgram && otherPrograms.length > 0 && (
              <Link className="nd-other-programs" to="/courses">
                <div>
                  <b>
                    {t("newDashboard.otherPrograms", {
                      count: otherPrograms.length,
                    })}
                  </b>
                  <small dir="auto">
                    {otherPrograms
                      .map(
                        (item) =>
                          item.versions.find(
                            (version) => version.version === item.activeVersion,
                          )?.plan.title,
                      )
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(" · ")}
                  </small>
                </div>
                <ChevronLeft size={22} />
              </Link>
            )}
            <div className="nd-lower-grid">
              {isProgram ? (
                <section
                  className="nd-card nd-tasks"
                  aria-labelledby="nd-tasks-title"
                >
                  <header className="nd-card-heading">
                    <div>
                      <h2 id="nd-tasks-title">
                        {t("newDashboard.todayTasks")}
                      </h2>
                      <p>{t("newDashboard.tasksHelp")}</p>
                    </div>
                    <Link
                      className="nd-xp-summary"
                      to="/achievements?return=%2Fdashboard"
                    >
                      <span className="nd-gift">
                        <Gift size={24} />
                      </span>
                      <span className="nd-xp-value">
                        <b>{d.gamification.todayXp}</b>
                        <small>XP</small>
                      </span>
                    </Link>
                  </header>
                  <ul className="nd-task-list">
                    {[
                      {
                        title: t("newDashboard.continueLesson"),
                        detail:
                          structuredUnit?.title ??
                          course?.nextLesson?.title ??
                          nextPack?.title ??
                          t("ux.openMap"),
                        to: lesson,
                        Icon: Play,
                        reward: d.gamification.dailyTaskRewards?.lesson,
                      },
                      {
                        title: t("newDashboard.talkToTeacher"),
                        detail: t("newDashboard.teacherHelp"),
                        to: `/private-lesson?${new URLSearchParams({ practice: "free", language: code, return: "/dashboard" })}`,
                        Icon: MessageCircle,
                        reward: d.gamification.dailyTaskRewards?.conversation,
                      },
                      {
                        title: t("newDashboard.readArticle"),
                        detail: t("newDashboard.articleHelp"),
                        to: `/reading?${new URLSearchParams({ language: code })}`,
                        Icon: BookOpenText,
                        reward: d.gamification.dailyTaskRewards?.reading,
                      },
                    ].map(({ title, detail, to, Icon, reward }) => (
                      <li key={title}>
                        <Icon size={20} />
                        <div>
                          <b>{title}</b>
                          <small dir="auto">{detail}</small>
                        </div>
                        <span
                          className={`nd-task-xp${reward?.completed ? " completed" : ""}`}
                          dir="ltr"
                          title={t(
                            reward?.completed
                              ? "newDashboard.taskRewardClaimed"
                              : "newDashboard.xpHelp",
                          )}
                        >
                          {reward?.completed ? (
                            <Check size={14} aria-hidden="true" />
                          ) : (
                            <Zap size={14} aria-hidden="true" />
                          )}
                          {reward
                            ? `${reward.completed ? "" : "+"}${reward.xp} XP`
                            : "XP"}
                        </span>
                        <Link to={to}>{t("newDashboard.begin")}</Link>
                      </li>
                    ))}
                  </ul>
                  <p className="nd-fine-print">{t("newDashboard.xpHelp")}</p>
                </section>
              ) : (
                <DashboardArticle
                  key={`article-${code}-${personalWords.map((word) => word.id).join(",")}`}
                  language={code}
                  words={personalWords}
                  inactive={!!inactive}
                  interests={profile.interests}
                  loading={words.loading}
                  error={words.error}
                  reload={() => void words.reload()}
                />
              )}
              <DashboardQuickReview
                key={`review-${code}`}
                language={code}
                available={d.counts.total > 0}
                preview={
                  personalWords.find((word) => word.learningStatus !== "new")
                    ?.sourceText
                }
                onScored={refresh}
              />
            </div>
            {!isProgram && (
              <Link
                className="nd-other-programs nd-program-invitation"
                to="/courses"
              >
                <span className="nd-square soft">
                  <Sparkles size={22} />
                </span>
                <div>
                  <b>{t("newDashboard.programInvitation")}</b>
                  <small>{t("newDashboard.programInvitationHelp")}</small>
                </div>
                <ChevronLeft size={22} />
              </Link>
            )}
            <footer className="nd-footer">
              <Link to="/vocabulary">{t("ux.words")}</Link>
              <Link
                to={`/learn?${new URLSearchParams({ language: code, return: "/dashboard" })}`}
              >
                {t("ux.chooseGame")}
              </Link>
              <Link to="/achievements?return=%2Fdashboard">
                {t("ux.achievements")}
              </Link>
              <Link to="/history">{t("ux.history")}</Link>
              <DashboardDetails
                d={d}
                languageCode={code}
                recentPage={recentPage}
                setRecentPage={setRecentPage}
              />
            </footer>
          </>
        )}
        {(!selected || !blocked) && (
          <RemoteState
            loading={false}
            error={courses.error || sessions.error || latest.error}
            retry={() => {
              void courses.reload();
              void sessions.reload();
              void latest.reload();
            }}
          />
        )}
      </div>
    </div>
  );
}
