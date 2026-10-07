import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Bookmark, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { RemoteState } from "../components/RemoteState";
import { LearningLanguageSelect } from "../components/LearningLanguageSelect";
import { ExploreActions } from "../components/ExploreActions";
import { DashboardDetails } from "../components/DashboardDetails";
import { useResource } from "../lib/useResource";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import {
  product,
  dashboardSchema,
  page,
  sessionSchema,
  wordPacksSchema,
} from "../lib/product";
import { courseApi, lessonLink } from "../lib/courses";
import {
  selectedProgram,
  homeLanguage,
  chooseHomeLanguage,
  smartSessionLink,
} from "../lib/learningNavigation";
import { completedEnglishUnit, englishPathLevels } from "../lib/englishPath";
import hero from "../assets/ux/learning-hero.png";
import wordCards from "../assets/ux/word-cards.png";
import personalProgram from "../assets/ux/personal-program.png";

export function LiveDashboardPage() {
  const { t } = useTranslation();
  const { profile, user } = useApp();
  const language = useLearningLanguage();
  const [chosenLanguage, setChosenLanguage] = useState(() =>
    homeLanguage(user),
  );
  const code = chosenLanguage || language.code;
  const [recentPage, setRecentPage] = useState(1);
  const resource = useResource(
    useCallback(
      async () => ({
        ...(await product(
          dashboardSchema,
          `dashboard?recentPage=${recentPage}&recentLimit=6${code ? `&sourceLanguageCode=${encodeURIComponent(code)}` : ""}`,
        )),
        languageCode: code,
      }),
      [recentPage, code],
    ),
  );
  const programs = useResource(useCallback(() => courseApi.list(), []));
  const latestSelected = selectedProgram(user);
  const latestCourse = programs.data?.courses.find(
    (item) => item.id === latestSelected && item.activeVersion !== null,
  );
  const latestUnitKey =
    latestCourse?.nextLesson?.unitKey ??
    latestCourse?.versions
      .find((version) => version.version === latestCourse.activeVersion)
      ?.plan.units.at(-1)?.key;
  const programWords = useResource(
    useCallback(async () => {
      const course = programs.data?.courses.find(
        (item) => item.id === latestSelected && item.activeVersion !== null,
      );
      const unitKey =
        course?.nextLesson?.unitKey ??
        course?.versions
          .find((version) => version.version === course.activeVersion)
          ?.plan.units.at(-1)?.key;
      return course && unitKey
        ? courseApi.unitWords(course.id, unitKey)
        : undefined;
    }, [programs.data, latestSelected]),
  );
  const programPacks = useResource(
    useCallback(
      () =>
        latestSelected === "english-path"
          ? product(wordPacksSchema, "word-packs")
          : Promise.resolve({ packs: [] }),
      [latestSelected],
    ),
  );
  const preparedPath = englishPathLevels(
    programPacks.data?.packs ?? [],
  ).flatMap((level) => level.packs);
  const latestPack =
    preparedPath.find((pack) => !completedEnglishUnit(pack)) ??
    preparedPath.at(-1);
  const programIds = [
    ...new Set(
      programWords.data?.words.flatMap((word) =>
        word.choices.map((choice) => choice.id),
      ) ?? [],
    ),
  ].slice(0, 100);
  const programPractice =
    latestSelected === "english-path" && latestPack
      ? latestPack.installed
        ? smartSessionLink(
            new URLSearchParams({
              pack: latestPack.id,
              language: latestPack.track.sourceLanguageCode,
              return: "/dashboard",
            }),
          )
        : `/english-learning?${new URLSearchParams({ unit: latestPack.id, tab: "words", practice: "smart" })}`
      : latestCourse &&
          programIds.length &&
          programWords.data?.unitKey === latestUnitKey &&
          programWords.data?.targetLanguageCode ===
            latestCourse.preferences.targetLanguageCode &&
          !programWords.loading &&
          !programWords.error
        ? smartSessionLink(
            new URLSearchParams({
              items: programIds.join(","),
              language: latestCourse.preferences.targetLanguageCode,
              return: "/dashboard",
            }),
          )
        : undefined;
  const sessions = useResource(
    useCallback(
      async () => ({
        ...(await product(
          page(sessionSchema),
          `practice/sessions?limit=10${code ? `&sourceLanguageCode=${encodeURIComponent(code)}` : ""}`,
        )),
        languageCode: code,
      }),
      [code],
    ),
  );
  const d = resource.data?.languageCode === code ? resource.data : undefined;
  const selected = selectedProgram(user, code);
  const homeLanguages = new Map(
    language.languages.map((entry) => [entry.code, entry]),
  );
  for (const item of programs.data?.courses ?? []) {
    const target = item.preferences.targetLanguageCode;
    if (!homeLanguages.has(target))
      homeLanguages.set(target, { code: target, count: 0 });
  }
  const course = programs.data?.courses.find(
    (item) =>
      item.id === selected &&
      item.activeVersion !== null &&
      item.preferences.targetLanguageCode === code,
  );
  const resumable =
    sessions.data?.languageCode === code
      ? sessions.data.items.find(
          (item) => item.status === "active" && !item.scope,
        )
      : undefined;
  const resumableType =
    resumable?.sessionType === "smart_review"
      ? "smart"
      : resumable?.sessionType === "listening_spelling"
        ? "listening"
        : resumable?.sessionType;
  const smart = `/learn/smart?language=${encodeURIComponent(code)}`;
  const returnSuffix = "&return=%2Fdashboard";
  const isProgram =
    Boolean(course?.nextLesson) ||
    (selected === "english-path" && code === "en");
  const destination = isProgram
    ? course?.nextLesson
      ? lessonLink(course)
      : "/english-learning"
    : resumable
      ? `/learn/session/${resumableType}?resume=${resumable.id}&language=${encodeURIComponent(code)}${returnSuffix}`
      : course?.nextLesson
        ? lessonLink(course)
        : selected === "english-path" && code === "en"
          ? "/english-learning"
          : d?.counts.total === 0
            ? "/vocabulary"
            : smart + returnSuffix;
  if (language.loading || language.error)
    return (
      <RemoteState
        loading={language.loading}
        error={language.error}
        retry={() => void language.reload()}
      />
    );
  return (
    <div
      className={`ux-page ux-home page-enter${isProgram ? " with-program" : " words-home"}`}
    >
      <header className="ux-home-heading">
        <div>
          <h1>
            {t("ux.greeting", {
              name: profile.name,
            })}
          </h1>
          {d && (
            <p className="ux-home-daily-label">
              {t("ux.todayProgress", {
                current: d.dailyGoal.current,
                value: d.dailyGoal.value,
                unit: t(
                  `settings.${d.dailyGoal.type === "items" ? "uniqueWords" : d.dailyGoal.type}`,
                ),
                days: d.gamification.currentStreakDays,
              })}
            </p>
          )}
        </div>
        <LearningLanguageSelect
          code={code}
          languages={[...homeLanguages.values()]}
          onChange={(code) => {
            language.setCode(code);
            setChosenLanguage(code);
            chooseHomeLanguage(code, user);
            setRecentPage(1);
          }}
        />
      </header>
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {d && (
        <>
          <section className="ux-home-next ux-card illustrated-next">
            <div className="ux-home-illustration">
              <img src={hero} alt="" />
            </div>
            <div className="ux-home-next-copy">
              <div className="ux-card-heading">
                <span className="ux-icon lavender">
                  {isProgram ? <Mic size={28} /> : <Brain size={28} />}
                </span>
                <div>
                  <p>
                    {isProgram
                      ? course
                        ? t("ux.personalProgram")
                        : t("englishPath.title")
                      : t("ux.words")}
                  </p>
                  <h2>
                    {resumable
                      ? t("ux.resumeActivity")
                      : course?.nextLesson
                        ? t("ux.teacherMeeting")
                        : selected === "english-path" && code === "en"
                          ? t("ux.continueLearning")
                          : d.counts.total === 0
                            ? t("ux.firstWords")
                            : d.counts.due > 0 || d.counts.new > 0
                              ? t("ux.wordsYourPace")
                              : t("ux.allCompleted")}
                  </h2>
                </div>
              </div>
              <p dir="auto">
                {resumable?.scope?.title ??
                  course?.nextLesson?.objective ??
                  (d.counts.total === 0
                    ? t("ux.noWordsHelp")
                    : d.counts.due > 0
                      ? t("ux.dueHelp", { count: d.counts.due })
                      : t("ux.optionalPractice"))}
              </p>
              <Link className="button primary" to={destination}>
                {resumable
                  ? t("ux.resumeActivity")
                  : isProgram
                    ? t("ux.continueLearning")
                    : d.counts.total === 0
                      ? t("vocabulary.newWord")
                      : t("ux.startSmart")}
              </Link>
              <Link
                className="button ghost"
                to={
                  isProgram
                    ? course
                      ? `/courses/${course.id}`
                      : "/english-learning"
                    : `/learn?language=${encodeURIComponent(code)}&return=%2Fdashboard`
                }
              >
                {t(isProgram ? "ux.openMap" : "ux.chooseGame")}
              </Link>
            </div>
          </section>
          <div className="ux-home-section-heading">
            <h2>{t("ux.oneMoreThing")}</h2>
            <Link to="/courses">{t("ux.allPrograms")}</Link>
          </div>
          <div className="ux-home-options">
            <section className="ux-card ux-home-words">
              <div className="ux-card-heading">
                <span className="ux-icon lavender">
                  <Bookmark size={28} />
                </span>
                <div>
                  <h2>{t("ux.words")}</h2>
                  <p>
                    {t(isProgram ? "ux.dueWords" : "ux.collectionWords", {
                      count: isProgram ? d.counts.due : d.counts.total,
                    })}
                  </p>
                </div>
                <img className="ux-word-illustration" src={wordCards} alt="" />
              </div>
              <div className="ux-home-word-actions">
                <div className="ux-home-word-action-buttons">
                  <Link
                    className="button secondary"
                    to={smart + returnSuffix}
                    aria-label={t("ux.vocabularyReview")}
                    title={t("ux.vocabularyReview")}
                  >
                    {t("ux.vocabularyReviewShort")}
                  </Link>
                  {latestSelected && (
                    <Link
                      className={`button primary${programPractice ? "" : " disabled"}`}
                      to={programPractice ?? "/courses"}
                      aria-disabled={!programPractice}
                      aria-label={t("ux.programSmartReview")}
                      title={t("ux.programSmartReview")}
                      tabIndex={programPractice ? undefined : -1}
                      onClick={(event) => {
                        if (!programPractice) event.preventDefault();
                      }}
                    >
                      {t("ux.programSmartReviewShort")}
                    </Link>
                  )}
                </div>
                <Link
                  className="ux-home-word-game-link"
                  to={
                    isProgram
                      ? `/learn?language=${encodeURIComponent(code)}&return=%2Fdashboard`
                      : "/word-packs"
                  }
                >
                  {t(isProgram ? "ux.chooseGame" : "nav.wordPacks")}
                </Link>
              </div>
              {latestCourse &&
                !programWords.loading &&
                !programWords.error &&
                !programIds.length && (
                  <Link
                    className="button ghost"
                    to={`/courses/${latestCourse.id}/units/${latestUnitKey}/words`}
                  >
                    {t("ux.unitWords")}
                  </Link>
                )}
              <RemoteState
                loading={
                  Boolean(latestSelected) &&
                  (programWords.loading || programPacks.loading)
                }
                error={programWords.error || programPacks.error}
                retry={() => {
                  void programWords.reload();
                  void programPacks.reload();
                }}
              />
            </section>
            <section className="ux-card ux-home-other-program">
              <img src={personalProgram} alt="" />
              <h2>{t("ux.programs")}</h2>
              <p>{t("ux.programsSubtitle")}</p>
              <Link className="button secondary" to="/courses">
                {t("ux.allPrograms")}
              </Link>
            </section>
          </div>
        </>
      )}
      <ExploreActions />
      <Link
        className="button ghost ux-achievements-entry"
        to="/achievements?return=%2Fdashboard"
      >
        {t("ux.achievements")}
      </Link>
      {d && (
        <DashboardDetails
          d={d}
          languageCode={code}
          recentPage={recentPage}
          setRecentPage={setRecentPage}
        />
      )}
      {programs.error && (
        <details className="ux-secondary-status">
          <summary>{t("ux.programs")}</summary>
          <RemoteState
            loading={false}
            error={programs.error}
            retry={() => void programs.reload()}
          />
        </details>
      )}
      {sessions.error && (
        <details className="ux-secondary-status">
          <summary>{t("ux.history")}</summary>
          <RemoteState
            loading={false}
            error={sessions.error}
            retry={() => void sessions.reload()}
          />
        </details>
      )}
    </div>
  );
}
