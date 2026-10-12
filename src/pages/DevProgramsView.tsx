import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CircleCheck,
  Clock3,
  Ellipsis,
  History,
  MessageCircle,
  Mic,
  Pin,
  Plane,
  Play,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Course, HomeworkSummary } from "../lib/courses";
import { getLanguageOptions } from "../lib/languages";
import { chooseProgram, selectedProgram } from "../lib/learningNavigation";
import {
  courseProgram,
  courseArtworkRevision,
  pathProgram,
  programPercent,
  type Program,
} from "../lib/programs";
import { dashboardSchema, product, query, type WordPack } from "../lib/product";
import { useCachedResource } from "../lib/useCachedResource";
import { resourceKey } from "../lib/resourceCache";
import { ProgramArtwork } from "../components/ProgramArtwork";
import { LearningStatusSource } from "../components/LearningStatusSource";
import { RemoteState } from "../components/RemoteState";
import { LanguageFlag } from "../components/LanguageFlag";
import "../dashboard-design.css";
import "../programs-design.css";

const programIcons = {
  books: BookOpen,
  conversation: MessageCircle,
  work: BriefcaseBusiness,
  travel: Plane,
};
function artwork(program: Program) {
  return program.id === "english-path"
    ? { kind: "path" as const }
    : { kind: "course" as const, courseId: program.id };
}
function artRevision(program: Program) {
  const course = program.course;
  return course ? courseArtworkRevision(course) : "";
}
function useProgramDashboard(code: string) {
  const { user } = useApp();
  const path = `dashboard${query({ sourceLanguageCode: code })}`;
  return useCachedResource(
    useCallback(
      async () => ({
        ...(await product(dashboardSchema, path)),
        language: code,
      }),
      [code, path],
    ),
    resourceKey(user, path),
  );
}

export function DevProgramsView({
  courses,
  homework,
  packs,
  coursesLoading,
  packsLoading,
  coursesError,
  packsError,
  retryCourses,
  retryPacks,
  busy,
  onRemove,
  onNew,
}: {
  courses: Course[];
  homework: HomeworkSummary[];
  packs: WordPack[];
  coursesLoading: boolean;
  packsLoading: boolean;
  coursesError: string;
  packsError: string;
  retryCourses: () => void;
  retryPacks: () => void;
  busy: boolean;
  onRemove: (course: Course) => Promise<void>;
  onNew: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useApp();
  const navigate = useNavigate();
  const [selection, setSelection] = useState(() => selectedProgram(user));
  const [filter, setFilter] = useState<"all" | "ongoing" | "completed">("all");
  const languageName = (language: string) =>
    getLanguageOptions(i18n.resolvedLanguage || "en").find(
      ([id]) => id === language,
    )?.[1] ?? language;
  const path = pathProgram(
    packs,
    t("ux.fromZeroLanguage", { language: languageName("en") }),
    t("ux.structuredHelp"),
  );
  const programs = [
    ...(path ? [path] : []),
    ...courses.map((course) => courseProgram(course, t("ux.personalProgram"))),
  ];
  const active =
    programs.find((program) => program.id === selection) ??
    programs.find((program) => program.status === "ongoing") ??
    programs[0];
  const code = active?.language ?? profile.defaultSourceLanguage ?? "en";
  const dashboard = useProgramDashboard(code);
  const metrics =
    dashboard.data?.language === code ? dashboard.data : undefined;
  const select = (program: Program) => {
    chooseProgram(program.id, user, program.language);
    setSelection(program.id);
  };
  const open = (program: Program, destination: string) => {
    select(program);
    navigate(destination);
  };
  const changeLanguage = (language: string) => {
    const program =
      programs.find(
        (item) => item.language === language && item.status === "ongoing",
      ) ?? programs.find((item) => item.language === language);
    if (program) select(program);
  };
  const others = programs.filter(
    (program) =>
      program.id !== active?.id &&
      (filter === "all" ||
        (filter === "completed"
          ? program.status === "completed"
          : program.status !== "completed")),
  );
  const loading = coursesLoading || packsLoading;
  const percent = active ? programPercent(active) : 0;
  const weeks = active?.daysPerWeek
    ? Math.ceil((active.total - active.completed) / active.daysPerWeek)
    : 0;
  const assignment = homework.find(
    (item) => item.courseId === active?.id && item.status !== "completed",
  );
  return (
    <div className="pg-page page-enter">
      <LearningStatusSource
        goal={metrics?.dailyGoal}
        streakDays={metrics?.gamification.currentStreakDays}
        language={{
          value: code,
          options: programs.map((program) => program.language),
          translationCode:
            active?.supportLanguage ??
            profile.defaultTranslationLanguage ??
            "he",
          onChange: changeLanguage,
          disabled: loading || !programs.length,
        }}
      />
      <div className="pg-wrap">
        <header className="pg-heading">
          <div>
            <h1>{t("programsDesign.title")}</h1>
            <p>{t("programsDesign.subtitle")}</p>
          </div>
          {active && (
            <ProgramArtwork
              key={`mascot-${code}`}
              className="pg-mascot"
              input={{ kind: "mascot", languageCode: code }}
              alt={t("programsDesign.mascotAlt", {
                language: languageName(code),
              })}
            />
          )}
        </header>
        <RemoteState
          loading={coursesLoading}
          error={coursesError}
          retry={retryCourses}
        />
        <RemoteState
          loading={packsLoading}
          error={packsError}
          retry={retryPacks}
        />
        {active && (
          <section className="pg-active" aria-labelledby="pg-active-title">
            <div className="pg-active-main">
              <span className="pg-active-badge">
                <span aria-hidden="true" />
                {t("programsDesign.active")}
              </span>
              <h2 id="pg-active-title" dir="auto">
                {active.title}
              </h2>
              <p dir="auto">{active.description || t("ux.personalHelp")}</p>
              <div className="pg-tags">
                <span>
                  <LanguageFlag code={active.language} />
                  {languageName(active.language)}
                </span>
                <span>
                  <ChartNoAxesColumnIncreasing size={15} aria-hidden="true" />
                  {["beginner", "intermediate", "advanced"].includes(
                    active.level,
                  )
                    ? t(`packs.levels.${active.level}`, {
                        defaultValue: active.level,
                      })
                    : active.level}
                </span>
                {active.minutes && (
                  <span>
                    <Clock3 size={15} aria-hidden="true" />
                    {t("programsDesign.minutes", { count: active.minutes })}
                  </span>
                )}
              </div>
              <button
                className="pg-button pg-primary"
                onClick={() => open(active, active.continueTo)}
              >
                {active.status === "completed" ? (
                  <RotateCw size={18} aria-hidden="true" />
                ) : (
                  <Play size={18} fill="currentColor" aria-hidden="true" />
                )}
                {t(
                  active.status === "draft"
                    ? "programsDesign.finishSetup"
                    : active.status === "completed"
                      ? "programsDesign.review"
                      : active.lessonNumber
                        ? "programsDesign.continueLesson"
                        : "programsDesign.continue",
                  { number: active.lessonNumber },
                )}
              </button>
              <Link className="pg-overview" to={active.destination}>
                {t("programsDesign.overview")}
              </Link>
            </div>
            <ProgramArtwork
              key={`${active.id}-active`}
              className="pg-active-art"
              input={artwork(active)}
              revision={artRevision(active)}
              alt={t("programsDesign.programAlt", { title: active.title })}
            />
            <div className="pg-progress-panel">
              <div className="pg-progress-heading">
                <strong>
                  <CalendarDays size={17} aria-hidden="true" />
                  {active.status === "completed"
                    ? t("programsDesign.completed")
                    : weeks
                      ? t("programsDesign.weeks", { count: weeks })
                      : t("programsDesign.yourProgress")}
                </strong>
                <b>{percent}%</b>
              </div>
              <div
                className="pg-segments"
                role="progressbar"
                aria-label={t("programsDesign.progress")}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {[0, 1, 2, 3].map((index) => (
                  <span key={index}>
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, percent * 4 - index * 100))}%`,
                      }}
                    />
                  </span>
                ))}
              </div>
              <ul className="pg-checkpoints">
                {active.checkpoints.map((checkpoint, index) => (
                  <li key={index}>
                    <span
                      className={`pg-check ${checkpoint.completed ? "done" : ""}`}
                    >
                      {checkpoint.completed ? (
                        <Check size={17} aria-hidden="true" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </span>
                    <span dir="auto">{checkpoint.title}</span>
                    <BookOpen size={18} aria-hidden="true" />
                  </li>
                ))}
                {!active.checkpoints.length && (
                  <li>
                    <MessageCircle size={19} aria-hidden="true" />
                    {t("courses.intakeInProgress")}
                  </li>
                )}
              </ul>
              <button
                className="pg-next"
                onClick={() => open(active, active.continueTo)}
              >
                <span className="pg-next-icon">
                  <Mic size={17} aria-hidden="true" />
                </span>
                <strong dir="auto">
                  {active.next
                    ? t("programsDesign.next", { title: active.next })
                    : t(
                        active.status === "completed"
                          ? "programsDesign.allDone"
                          : "programsDesign.finishSetup",
                      )}
                </strong>
                <Play size={14} aria-hidden="true" />
              </button>
              <div className="pg-progress-foot">
                <CalendarDays size={16} aria-hidden="true" />
                {assignment ? (
                  <Link to={`/homework/${assignment.id}`}>
                    {t("programsDesign.homeworkReady")}
                  </Link>
                ) : (
                  <span>
                    {t(
                      active.course
                        ? "programsDesign.lessonCount"
                        : "programsDesign.unitCount",
                      { count: active.completed, total: active.total },
                    )}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
        <section className="pg-programs" aria-labelledby="pg-all-title">
          <header className="pg-section-heading">
            <h2 id="pg-all-title">{t("programsDesign.allPrograms")}</h2>
            <div
              className="pg-filters"
              role="group"
              aria-label={t("programsDesign.filter")}
            >
              {(["all", "ongoing", "completed"] as const).map((value) => {
                const Icon =
                  value === "all" ? Pin : value === "ongoing" ? History : Check;
                return (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    {t(`programsDesign.${value}`)}
                  </button>
                );
              })}
            </div>
          </header>
          {!loading && !active && !coursesError && !packsError && (
            <div className="pg-empty">
              <BookOpen size={30} aria-hidden="true" />
              <h3>{t("ux.noPrograms")}</h3>
              <p>{t("ux.noProgramsHelp")}</p>
            </div>
          )}
          <div className="pg-grid">
            {others.map((program) => {
              const Icon = programIcons[program.kind];
              const progress = programPercent(program);
              return (
                <article
                  className={`pg-card pg-kind-${program.kind}`}
                  key={program.id}
                >
                  <div className="pg-card-cover">
                    <ProgramArtwork
                      input={artwork(program)}
                      revision={artRevision(program)}
                      alt={t("programsDesign.programAlt", {
                        title: program.title,
                      })}
                    />
                    <span
                      className="pg-language"
                      aria-label={languageName(program.language)}
                    >
                      {program.language.split("-")[0].toUpperCase()}
                    </span>
                    <details
                      className="pg-menu"
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.currentTarget.open = false;
                          event.currentTarget.querySelector("summary")?.focus();
                        }
                      }}
                    >
                      <summary
                        aria-label={t("programsDesign.options", {
                          title: program.title,
                        })}
                      >
                        <Ellipsis size={21} />
                      </summary>
                      <div>
                        <button onClick={() => select(program)}>
                          <Pin size={16} />
                          {t("programsDesign.makeActive")}
                        </button>
                        {program.course && (
                          <button
                            disabled={busy}
                            onClick={() => void onRemove(program.course!)}
                          >
                            <Trash2 size={16} />
                            {t("courses.deleteCourseConfirm")}
                          </button>
                        )}
                      </div>
                    </details>
                  </div>
                  <div className="pg-card-body">
                    <header>
                      <h3 dir="auto">{program.title}</h3>
                      <span className={`pg-status ${program.status}`}>
                        {program.status === "completed" ? (
                          <CircleCheck size={15} />
                        ) : (
                          <Clock3 size={15} />
                        )}
                        {t(`programsDesign.${program.status}`)}
                      </span>
                    </header>
                    <p className="pg-description" dir="auto">
                      {program.description || t("ux.personalHelp")}
                    </p>
                    <div className="pg-card-meta">
                      {program.minutes && (
                        <span>
                          <Clock3 size={15} />
                          {t("programsDesign.minutesPerLesson", {
                            count: program.minutes,
                          })}
                        </span>
                      )}
                      <span>
                        <Clock3 size={15} />
                        {t(
                          program.course
                            ? "programsDesign.lessonCount"
                            : "programsDesign.unitCount",
                          { count: program.completed, total: program.total },
                        )}
                      </span>
                    </div>
                    <progress
                      className="pg-card-progress"
                      max={100}
                      value={progress}
                      aria-label={t("programsDesign.progress")}
                    />
                    <div className="pg-card-next">
                      <Icon size={19} aria-hidden="true" />
                      <strong dir="auto">
                        {program.next
                          ? t("programsDesign.nextLesson", {
                              title: program.next,
                            })
                          : t(
                              program.status === "completed"
                                ? "programsDesign.allDone"
                                : "programsDesign.finishSetup",
                            )}
                      </strong>
                    </div>
                    <button
                      className="pg-button"
                      onClick={() => open(program, program.destination)}
                    >
                      {program.status === "completed" ? (
                        <RotateCw size={17} />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                      {t(
                        program.status === "completed"
                          ? "programsDesign.review"
                          : "programsDesign.openProgram",
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
            <button className="pg-new-card" onClick={onNew}>
              <span>
                <Plus size={30} aria-hidden="true" />
              </span>
              <strong>{t("ux.newProgram")}</strong>
              <small>{t("programsDesign.newHelp")}</small>
            </button>
          </div>
          {filter !== "all" && !others.length && (
            <p className="pg-filter-empty" role="status">
              {t("programsDesign.filterEmpty")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
