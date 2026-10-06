import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { TeacherAvatar } from "../components/TeacherAvatar";
import { CourseComposer, ReadAloud } from "../components/CourseComposer";
import { CourseLiveInterview } from "../components/CourseLiveInterview";
import { CourseJourney } from "../components/CourseJourney";
import { Modal } from "../components/Modal";
import {
  courseApi,
  lessonLink,
  type Course,
  type CoursePreferences,
  type HomeworkSummary,
} from "../lib/courses";
import { getBilingualLanguageOptions } from "../lib/languages";
import { LanguageCombobox } from "../components/LanguageCombobox";
import { errorMessage } from "../lib/product";
import { ApiError } from "../lib/api";
import "../courses.css";

export function CoursePage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const newCourse = searchParams.get("new") === "1";
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]),
    [homework, setHomework] = useState<HomeworkSummary[]>([]);
  const [course, setCourse] = useState<Course | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [available, setAvailable] = useState(true),
    [creating, setCreating] = useState(false),
    [showReview, setShowReview] = useState(false),
    [resumeConversation, setResumeConversation] = useState(false),
    [editingPlan, setEditingPlan] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [showIntakeHistory, setShowIntakeHistory] = useState(false);
  const [fullPlan, setFullPlan] = useState(false);
  const [unitWords, setUnitWords] = useState<{
    title: string;
    words: string[];
    key: string;
  } | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [message, setMessage] = useState("");
  const [editAnswerIndex, setEditAnswerIndex] = useState<number | null>(null);
  const [target, setTarget] = useState(
    searchParams.get("language") ||
      profile.languages[0]?.languageCode ||
      profile.defaultSourceLanguage ||
      "en",
  );
  const [support, setSupport] = useState(() => {
    const uiLanguage =
      searchParams.get("support") || i18n.resolvedLanguage?.split("-")[0];
    return getBilingualLanguageOptions().some(([code]) => code === uiLanguage)
      ? uiLanguage!
      : profile.defaultTranslationLanguage || "en";
  });
  const lock = useRef(false),
    pending = useRef<{ key: string; eventId: string } | null>(null),
    intakeThread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (intakeThread.current)
      intakeThread.current.scrollTop = intakeThread.current.scrollHeight;
  }, [course?.messages.length]);
  const languageOptions = getBilingualLanguageOptions();
  const languageName = (code: string) =>
    languageOptions.find(([value]) => value === code)?.[1] ?? code;
  function eventId(key: string) {
    if (pending.current?.key !== key)
      pending.current = { key, eventId: crypto.randomUUID() };
    return pending.current.eventId;
  }
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setShowReview(false);
    setResumeConversation(false);
    setEditAnswerIndex(null);
    setEditingPlan(false);
    setMessage("");
    Promise.all([
      courseApi.list(),
      courseId ? courseApi.get(courseId) : Promise.resolve(null),
    ])
      .then(([list, selected]) => {
        if (live) {
          setCourses(list.courses);
          setHomework(list.homework);
          setAvailable(list.available);
          setCourse(selected?.course ?? null);
          setCreating(newCourse);
        }
      })
      .catch((err) => {
        if (live) setError(errorMessage(err));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [courseId, newCourse]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      pending.current = null;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("courses.changed")
          : errorMessage(err),
      );
      if (err instanceof ApiError && err.status === 409 && courseId) {
        const fresh = await courseApi.get(courseId).catch(() => null);
        if (fresh) setCourse(fresh.course);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function command(
    path: string,
    extra: Record<string, unknown> = {},
    current = course,
  ) {
    if (!current) throw new Error("Course unavailable");
    const key = JSON.stringify([current.id, current.revision, path, extra]);
    const result = await courseApi.command(current.id, path, {
      revision: current.revision,
      eventId: eventId(key),
      ...extra,
    });
    setCourse(result.course);
    return result.course;
  }
  function start() {
    void run(async () => {
      const result = await courseApi.start({
        targetLanguageCode: target,
        supportLanguageCode: support,
        eventId: eventId(`start:${target}:${support}`),
      });
      navigate(`/courses/${result.course.id}`);
    });
  }
  function deleteSelectedCourse() {
    if (!courseToDelete) return;
    const id = courseToDelete.id;
    void run(async () => {
      await courseApi.delete(id);
      setCourses((current) => current.filter((item) => item.id !== id));
      setHomework((current) => current.filter((item) => item.courseId !== id));
      setCourseToDelete(null);
    });
  }
  function send(channel: "text" | "voice", value = message) {
    void run(async () => {
      const updated = await command("turns", {
        message: value,
        channel,
        mode: editingPlan ? "plan" : "preferences",
        ...(editAnswerIndex === null ? {} : { answerIndex: editAnswerIndex }),
      });
      setMessage("");
      setEditAnswerIndex(null);
      if (editAnswerIndex === null) setResumeConversation(false);
      setEditingPlan(false);
      if (editingPlan && updated.approvedPreferences)
        await command("plan", {}, updated);
    });
  }
  async function sendLiveAnswer(answer: string) {
    if (lock.current || !course) throw new Error(t("courses.liveBusy"));
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const updated = await command(
        "turns",
        {
          message: answer,
          channel: "voice",
          mode: "preferences",
        },
        course,
      );
      pending.current = null;
      return updated;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const draft = course?.versions.find((v) => v.version === course.draftVersion);
  const active = course?.versions.find(
    (v) => v.version === course.activeVersion,
  );
  const displayed = draft ?? active;
  const reviewing = Boolean(
    course &&
    !resumeConversation &&
    !voiceActive &&
    (showReview ||
      (!course.approvedPreferences && course.ready) ||
      (!displayed && course.ready)),
  );
  const intake = Boolean(course && !displayed && (!reviewing || voiceActive));
  const step = displayed ? 3 : reviewing ? 2 : 1;
  const courseGroups = Array.from(
    courses.reduce((groups, item) => {
      const code = item.preferences.targetLanguageCode;
      const group = groups.get(code) ?? [];
      group.push(item);
      groups.set(code, group);
      return groups;
    }, new Map<string, Course[]>()),
  );
  const openHomework = homework.filter(
    (item) =>
      item.status !== "completed" && (!course || item.courseId === course.id),
  );

  if (loading)
    return (
      <div className="course-page course-loading" role="status">
        <LoaderCircle className="spin" />
        {t("courses.loading")}
      </div>
    );
  return (
    <div
      className={`course-page${intake ? " course-intake" : active && !reviewing ? " personal-map" : " canonical-page"}`}
      aria-busy={busy}
      data-figma-desktop={intake ? "43:2286" : active ? "43:2417" : undefined}
      data-figma-mobile={active ? "44:5113" : undefined}
    >
      <header className="course-page-heading">
        <div>
          <h1>
            {course && displayed ? displayed.plan.title : t("courses.title")}
          </h1>
          {course && (
            <p className="course-heading-language">
              {languageName(course.preferences.targetLanguageCode)}
            </p>
          )}
          {active && course && (
            <p className="course-heading-goal" dir="auto">
              {course.preferences.goal}
            </p>
          )}
        </div>
        <div className="course-heading-actions">
          {course ? (
            <Link className="course-text-link" to="/courses">
              {t("courses.allCourses")}
            </Link>
          ) : (
            <>
              {!creating && courses.length > 0 && (
                <button
                  type="button"
                  className="button primary course-create-button"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={18} aria-hidden="true" />
                  {t("courses.newCourse")}
                </button>
              )}
              <Link
                className="course-text-link"
                to="/private-lesson?practice=free"
              >
                {t("courses.freePractice")}
              </Link>
            </>
          )}
        </div>
      </header>
      {error && (
        <div className="course-error" role="alert">
          <p>{error}</p>
          <button
            className="button secondary"
            onClick={() => window.location.reload()}
          >
            {t("courses.reload")}
          </button>
        </div>
      )}
      {!available && <p className="course-note">{t("courses.unavailable")}</p>}
      {!course && !creating && courses.length ? (
        <>
          <div className="course-language-groups">
            {courseGroups.map(([code, items]) => (
              <section
                className="course-language-group"
                key={code}
                aria-label={languageName(code)}
              >
                <div className="course-language-heading">
                  <h2>{languageName(code)}</h2>
                  <span>
                    {t(
                      items.length === 1
                        ? "courses.singleCourse"
                        : "courses.courseCount",
                      { count: items.length },
                    )}
                  </span>
                </div>
                <div className="course-list">
                  {items.map((item) => {
                    const plan =
                      item.versions.find(
                        (version) => version.version === item.activeVersion,
                      ) ??
                      item.versions.find(
                        (version) => version.version === item.draftVersion,
                      );
                    const total =
                      plan?.plan.units.reduce(
                        (sum, unit) => sum + unit.lessons.length,
                        0,
                      ) ?? 0;
                    const status = item.activeVersion
                      ? item.nextLesson
                        ? "inProgress"
                        : "courseComplete"
                      : item.draftVersion
                        ? "awaitingApproval"
                        : "intakeInProgress";
                    return (
                      <div key={item.id} className="course-list-row">
                        <Link
                          to={`/courses/${item.id}`}
                          className="course-list-card"
                        >
                          <BookOpen size={20} aria-hidden="true" />
                          <span className="course-list-card-main">
                            <strong dir="auto">
                              {plan?.plan.title ??
                                t("courses.intakeInProgress")}
                            </strong>
                            <small>
                              {t(`courses.${status}`)}
                              {item.activeVersion &&
                                ` · ${t("courses.completedCount", { count: item.progress.covered, total })}`}
                            </small>
                          </span>
                          <ArrowRight
                            size={18}
                            className="directional-arrow"
                            aria-hidden="true"
                          />
                        </Link>
                        <button
                          type="button"
                          className="course-delete-button"
                          aria-label={t("courses.deleteCourse", {
                            title:
                              plan?.plan.title ?? t("courses.intakeInProgress"),
                          })}
                          onClick={() => setCourseToDelete(item)}
                          disabled={busy}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : !course ? (
        <section className="course-hero course-welcome">
          <div className="course-teacher">
            <TeacherAvatar
              variant="female"
              activity="idle"
              audioLevel={0}
              active={false}
              label={t("courses.teacher")}
            />
          </div>
          <p className="course-kicker">{t("courses.welcomeKicker")}</p>
          <h2>{t("courses.welcomeTitle")}</h2>
          <p>{t("courses.welcomeBody")}</p>
          <div className="course-language-pair">
            <label>
              {t("courses.targetLanguage")}
              <LanguageCombobox
                value={target}
                onChange={setTarget}
                options={languageOptions}
              />
            </label>
            <label>
              {t("courses.supportLanguage")}
              <LanguageCombobox
                value={support}
                onChange={setSupport}
                options={languageOptions}
              />
            </label>
          </div>
          <button
            className="button primary"
            disabled={busy || !available}
            onClick={start}
          >
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <MessageCircle size={18} />
            )}
            {t("courses.buildWithTeacher")}
          </button>
          <small>{t("courses.welcomeHint")}</small>
        </section>
      ) : (
        <>
          {!active && (
            <ol className="course-steps" aria-label={t("courses.stepsLabel")}>
              {["conversation", "preferences", "plan"].map((key, index) => (
                <li
                  key={key}
                  aria-current={step === index + 1 ? "step" : undefined}
                  className={step >= index + 1 ? "reached" : ""}
                >
                  <span>
                    {step > index + 1 ? <Check size={14} /> : index + 1}
                  </span>
                  {t(`courses.steps.${key}`)}
                </li>
              ))}
            </ol>
          )}
          {intake && (
            <section className="course-chat-card">
              {course.intakeProgress && (
                <p className="course-question-step">
                  {t("accountUi.questionStep", {
                    current: Math.min(
                      course.intakeProgress.current,
                      course.intakeProgress.total,
                    ),
                    total: course.intakeProgress.total,
                  })}
                </p>
              )}
              <div className="course-teacher-heading">
                <span>{t("courses.teacher")}</span>
                <small>{t("courses.saved")}</small>
              </div>
              {(!course.ready || voiceActive) && editAnswerIndex === null && (
                <CourseLiveInterview
                  course={course}
                  onAnswer={sendLiveAnswer}
                  onActiveChange={setVoiceActive}
                  onTranscript={setMessage}
                  onFinish={() => {
                    setVoiceActive(false);
                    setShowReview(true);
                  }}
                />
              )}
              <button
                type="button"
                className="button ghost"
                aria-expanded={showIntakeHistory}
                onClick={() => setShowIntakeHistory((value) => !value)}
              >
                {t("ux.fullConversation")}
              </button>
              <div
                className="course-intake-thread"
                role="log"
                aria-live="polite"
                ref={intakeThread}
              >
                {course.messages.map(
                  (turn, index) =>
                    (showIntakeHistory ||
                      resumeConversation ||
                      editAnswerIndex !== null ||
                      index === course.messages.length - 1) && (
                      <div
                        className={`course-message ${turn.role}`}
                        key={index}
                        dir="auto"
                      >
                        <strong>
                          {t(
                            turn.role === "tutor"
                              ? "courses.teacher"
                              : "courses.you",
                          )}
                        </strong>
                        <span>{turn.text}</span>
                        {turn.role === "learner" &&
                          course.intakeAnswers &&
                          course.messages
                            .slice(0, index)
                            .filter((item) => item.role === "learner").length <
                            course.intakeAnswers.length && (
                            <button
                              type="button"
                              className="course-text-link"
                              disabled={busy || voiceActive}
                              onClick={() => {
                                setEditAnswerIndex(
                                  course.messages
                                    .slice(0, index)
                                    .filter((item) => item.role === "learner")
                                    .length,
                                );
                                setMessage(turn.text);
                              }}
                            >
                              <Pencil size={14} />
                              {t("courses.correctAnswer")}
                            </button>
                          )}
                      </div>
                    ),
                )}
              </div>
              {!voiceActive && (
                <details className="course-text-fallback" open>
                  <summary>{t("courses.typeInstead")}</summary>
                  <div className="course-suggestions">
                    {course.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        disabled={busy}
                        onClick={() => send("text", suggestion)}
                        dir="auto"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <CourseComposer
                    value={message}
                    onChange={setMessage}
                    onSubmit={send}
                    language={course.preferences.supportLanguageCode}
                    disabled={busy}
                    label={
                      editAnswerIndex === null
                        ? undefined
                        : t("courses.correctAnswer")
                    }
                    submitLabel={
                      editAnswerIndex === null
                        ? undefined
                        : t("courses.saveCorrection")
                    }
                    replaceVoice={editAnswerIndex !== null}
                  />
                </details>
              )}
              {editAnswerIndex !== null && (
                <button
                  type="button"
                  className="course-text-link"
                  onClick={() => {
                    setEditAnswerIndex(null);
                    setMessage("");
                  }}
                >
                  {t("courses.cancelCorrection")}
                </button>
              )}
              {course.messages.length > 1 &&
                (!course.intakeProgress ||
                  course.intakeProgress.answered >= 6) && (
                  <button
                    className="course-text-link"
                    disabled={busy}
                    onClick={() => {
                      setResumeConversation(false);
                      setShowReview(true);
                    }}
                  >
                    {t("courses.reviewNow")}
                  </button>
                )}
            </section>
          )}
          {reviewing && (
            <section className="course-review-card">
              <span className="course-kicker">{t("courses.reviewKicker")}</span>
              <h2>{t("courses.reviewTitle")}</h2>
              <p>{t("courses.reviewBody")}</p>
              {!displayed && course.intakeAnswers && (
                <button
                  type="button"
                  className="course-text-link"
                  disabled={busy}
                  onClick={() => setResumeConversation(true)}
                >
                  <MessageCircle size={16} />
                  {t("courses.backToConversation")}
                </button>
              )}
              <PreferenceReview
                course={course}
                disabled={busy}
                onSave={(preferences) =>
                  void run(async () => {
                    const key = JSON.stringify([
                      course.id,
                      course.revision,
                      preferences,
                    ]);
                    const result = await courseApi.command(
                      course.id,
                      "preferences",
                      {
                        revision: course.revision,
                        eventId: eventId(key),
                        preferences,
                      },
                      "PUT",
                    );
                    setCourse(result.course);
                  })
                }
              />
              <p className="course-note">{t("courses.provisionalLevel")}</p>
              <button
                className="button primary"
                disabled={busy || !available}
                onClick={() =>
                  void run(async () => {
                    const approved = course.approvedPreferences
                      ? course
                      : await command("preferences/approve");
                    await command("plan", {}, approved);
                    setShowReview(false);
                  })
                }
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                {t(
                  course.approvedPreferences
                    ? "courses.retryPlan"
                    : "courses.approvePreferences",
                )}
              </button>
              {active && course.nextLesson && (
                <Link className="course-text-link" to={lessonLink(course)}>
                  {t("courses.startNextLesson")}
                </Link>
              )}
              <details className="course-adjust">
                <summary>
                  <Pencil size={15} />
                  {t("courses.changeWithTeacher")}
                </summary>
                <CourseComposer
                  value={message}
                  onChange={setMessage}
                  onSubmit={send}
                  language={course.preferences.supportLanguageCode}
                  disabled={busy}
                />
              </details>
            </section>
          )}
          {displayed && !reviewing && (
            <>
              <section className="course-hero course-plan-overview">
                {!draft && (
                  <div
                    className="personal-map-word-preview"
                    lang={course.preferences.targetLanguageCode}
                    dir="auto"
                  >
                    <strong>
                      {displayed.plan.units
                        .find((unit) => unit.key === course.nextLesson?.unitKey)
                        ?.vocabulary.slice(0, 3)
                        .join(" · ") || displayed.plan.outcome}
                    </strong>
                    <small>{t("ux.unitWords")}</small>
                  </div>
                )}
                <span className="course-kicker">
                  {t(
                    draft
                      ? "courses.previewKicker"
                      : course.nextLesson
                        ? "courses.nextLesson"
                        : "courses.courseComplete",
                  )}
                </span>
                <h2 dir="auto">
                  {draft
                    ? displayed.plan.outcome
                    : (course.nextLesson?.title ?? displayed.plan.outcome)}
                </h2>
                <p dir="auto">
                  {draft
                    ? t("courses.previewBody", {
                        count: displayed.plan.units.length,
                      })
                    : (course.nextLesson?.objective ??
                      t("courses.completeBody"))}
                </p>
                {draft ? (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await command("activate", { version: draft.version });
                      })
                    }
                  >
                    <CheckCheck size={18} />
                    {t("courses.approvePlan")}
                  </button>
                ) : (
                  course.nextLesson && (
                    <Link className="button primary" to={lessonLink(course)}>
                      {t("courses.startNextLesson")}
                      <ArrowRight size={18} className="directional-arrow" />
                    </Link>
                  )
                )}
                {!draft && course.nextLesson && (
                  <ReadAloud
                    text={course.nextLesson.objective}
                    language={course.preferences.targetLanguageCode}
                    label={t("courses.readAloud")}
                    className="button secondary personal-map-listen"
                    showLabel
                  />
                )}
                <button
                  className="course-text-link"
                  disabled={busy}
                  onClick={() => setEditingPlan((value) => !value)}
                >
                  <Pencil size={15} />
                  {t("courses.requestChanges")}
                </button>
                {!draft && (
                  <details className="course-progress">
                    <summary>
                      {t("courses.progressLabel", {
                        count: course.progress.demonstrated,
                        total: displayed.plan.units.reduce(
                          (sum, unit) => sum + unit.lessons.length,
                          0,
                        ),
                      })}
                    </summary>
                    <p>
                      {t("courses.progressDetail", {
                        covered: course.progress.covered,
                        demonstrated: course.progress.demonstrated,
                      })}
                    </p>
                    <p>{t("courses.retentionNote")}</p>
                  </details>
                )}
              </section>
              {draft && displayed.version > 1 && (
                <p className="course-change-note" dir="auto">
                  {displayed.plan.changeSummary}
                </p>
              )}
              {course.pendingPlanChange &&
                course.approvedPreferences &&
                !draft && (
                  <section className="course-chat-card">
                    <p dir="auto">{course.pendingPlanChange}</p>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await command("plan");
                        })
                      }
                    >
                      {t("courses.retryPlan")}
                    </button>
                  </section>
                )}
              {editingPlan && (
                <section className="course-chat-card">
                  <h2>{t("courses.whatToChange")}</h2>
                  <p>{t("courses.changeHint")}</p>
                  <CourseComposer
                    value={message}
                    onChange={setMessage}
                    onSubmit={send}
                    language={course.preferences.supportLanguageCode}
                    disabled={busy}
                  />
                </section>
              )}
              {!draft && <HomeworkLinks items={openHomework} />}
              {!draft && (
                <CourseJourney
                  course={course}
                  units={displayed.plan.units}
                  onWords={(unit) =>
                    navigate(`/courses/${course.id}/units/${unit.key}/words`)
                  }
                />
              )}
              {!draft && (
                <button
                  className="button ghost course-full-plan"
                  type="button"
                  aria-expanded={fullPlan}
                  onClick={() => setFullPlan((value) => !value)}
                >
                  {t("accountUi.fullPlan")}
                </button>
              )}
              <div
                className="course-full-syllabus"
                hidden={!draft && !fullPlan}
              >
                <div className="course-syllabus-heading">
                  <h2>{t("courses.syllabus")}</h2>
                  <span>
                    {t("courses.unitCount", {
                      count: displayed.plan.units.length,
                    })}
                  </span>
                </div>
                <p className="course-note" dir="auto">
                  {displayed.plan.scope}
                </p>
                <div className="course-units">
                  {displayed.plan.units.map((unit, index) => {
                    const independent = new Set(
                      course.evidence
                        .filter(
                          (e) =>
                            e.version === displayed.version &&
                            e.unitKey === unit.key &&
                            e.independent,
                        )
                        .map((e) => e.lessonIndex),
                    ).size;
                    const isCurrent =
                      !draft && course.nextLesson?.unitKey === unit.key;
                    const done = !draft && independent === unit.lessons.length;
                    return (
                      <details
                        className={`course-unit${isCurrent ? " current" : ""}`}
                        key={`${displayed.version}:${unit.key}`}
                        open={isCurrent || undefined}
                      >
                        <summary>
                          <span
                            className={`course-unit-number${done ? " completed" : ""}`}
                          >
                            {done ? (
                              <Check size={18} />
                            ) : (
                              String(index + 1).padStart(2, "0")
                            )}
                          </span>
                          <span className="course-unit-name">
                            <strong dir="auto">{unit.title}</strong>
                            <small>
                              {isCurrent ? `${t("courses.youAreHere")} · ` : ""}
                              {t("courses.lessonCount", {
                                count: unit.lessons.length,
                              })}
                            </small>
                          </span>
                          <ChevronDown size={18} />
                        </summary>
                        <div className="course-unit-body">
                          <p className="course-unit-outcome" dir="auto">
                            {unit.outcome}
                          </p>
                          <ol className="course-lesson-list">
                            {unit.lessons.map((lesson, lessonIndex) => {
                              const records = draft
                                ? []
                                : course.evidence.filter(
                                    (e) =>
                                      e.version === displayed.version &&
                                      e.unitKey === unit.key &&
                                      e.lessonIndex === lessonIndex &&
                                      e.covered,
                                  );
                              const isNext =
                                !draft &&
                                course.nextLesson?.unitKey === unit.key &&
                                course.nextLesson.lessonIndex === lessonIndex;
                              const state = records.length
                                ? isNext
                                  ? "repeatLesson"
                                  : "lessonDone"
                                : isNext
                                  ? "nextInPlan"
                                  : "upcomingLesson";
                              const last = records.at(-1);
                              return (
                                <li
                                  key={`${unit.key}:${lessonIndex}`}
                                  className={`course-lesson-${state}`}
                                >
                                  <span className="course-lesson-number">
                                    {records.length ? (
                                      <Check size={15} />
                                    ) : (
                                      lessonIndex + 1
                                    )}
                                  </span>
                                  <div>
                                    <strong dir="auto">{lesson.title}</strong>
                                    <p dir="auto">{lesson.objective}</p>
                                    {!draft && (
                                      <small className="course-lesson-status">
                                        {t(`courses.${state}`)}
                                        {last &&
                                          ` · ${new Date(last.recordedAt).toLocaleDateString(i18n.language)}`}
                                      </small>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                          <div className="course-unit-topics">
                            {unit.grammar.length > 0 && (
                              <div>
                                <h3>{t("courses.grammar")}</h3>
                                <ul>
                                  {unit.grammar.map((topic) => (
                                    <li dir="auto" key={topic}>
                                      {topic}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {unit.vocabulary.length > 0 && (
                              <div>
                                <h3>{t("courses.vocabulary")}</h3>
                                <button
                                  type="button"
                                  className="button secondary"
                                  onClick={() =>
                                    setUnitWords({
                                      key: unit.key,
                                      title: unit.title,
                                      words: unit.vocabulary,
                                    })
                                  }
                                >
                                  {t("ux.unitWords")}
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="course-unit-task">
                            <h3>{t("courses.unitSuccess")}</h3>
                            <p dir="auto">{unit.successTask}</p>
                            <h3>{t("courses.homeworkExample")}</h3>
                            <p dir="auto">{unit.homeworkExample}</p>
                          </div>
                          <p className="course-unit-meta">
                            <Clock3 size={15} />
                            {t("courses.estimatedMinutes", {
                              count: unit.estimatedMinutes,
                            })}
                          </p>
                          {unit.prerequisites.length > 0 && (
                            <p className="course-note">
                              {t("courses.prerequisites")}:{" "}
                              {unit.prerequisites
                                .map(
                                  (key) =>
                                    displayed.plan.units.find(
                                      (item) => item.key === key,
                                    )?.title ?? key,
                                )
                                .join(" · ")}
                            </p>
                          )}
                          <HomeworkLinks
                            items={homework.filter(
                              (item) =>
                                item.courseId === course.id &&
                                item.unitKey === unit.key,
                            )}
                          />
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
              <Modal
                open={Boolean(unitWords)}
                onClose={() => setUnitWords(null)}
                title={unitWords?.title || t("ux.unitWords")}
              >
                <div className="modal-body">
                  <h2>{t("ux.unitWords")}</h2>
                  {unitWords && !draft && (
                    <Link
                      className="button primary"
                      to={`/courses/${course.id}/units/${unitWords.key}/words`}
                    >
                      {t("dashboard.smartPractice")}
                    </Link>
                  )}
                  <ul
                    className="ux-unit-words"
                    lang={course.preferences.targetLanguageCode}
                    dir="auto"
                  >
                    {unitWords?.words.map((word) => (
                      <li key={word}>{word}</li>
                    ))}
                  </ul>
                </div>
              </Modal>
              <Link
                className="button ghost"
                to={`/history?course=${course.id}`}
              >
                {t("ux.history")}
              </Link>
              <details className="course-adjust">
                <summary>{t("courses.savedPreferences")}</summary>
                <PreferenceReview
                  course={{ ...course, preferences: displayed.preferences }}
                  disabled
                  onSave={() => {}}
                />
                <button
                  className="course-text-link"
                  onClick={() => {
                    setShowReview(true);
                    setEditingPlan(false);
                  }}
                >
                  {t("courses.changeWithTeacher")}
                </button>
              </details>
            </>
          )}
          {busy && (
            <div className="course-busy" role="status">
              <LoaderCircle className="spin" size={18} />
              {t(
                reviewing || editingPlan
                  ? "courses.buildingPlan"
                  : "courses.teacherThinking",
              )}
            </div>
          )}
        </>
      )}
      <Modal
        open={Boolean(courseToDelete)}
        onClose={() => {
          if (!busy) setCourseToDelete(null);
        }}
        title={t("courses.deleteCourseTitle")}
        size="sm"
      >
        <div className="modal-body">
          <p>{t("courses.deleteCourseDescription")}</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setCourseToDelete(null)}
              disabled={busy}
            >
              {t("feedback.cancel")}
            </button>
            <button
              className="button primary"
              onClick={deleteSelectedCourse}
              disabled={busy}
            >
              {t("courses.deleteCourseConfirm")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PreferenceReview({
  course,
  disabled,
  onSave,
}: {
  course: Course;
  disabled: boolean;
  onSave: (preferences: CoursePreferences) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(course.preferences.goal);
  const p = course.preferences;
  const languageOptions = getBilingualLanguageOptions();
  const languageName = (code: string) =>
    languageOptions.find(([value]) => value === code)?.[1] ?? code;
  return (
    <>
      <div className="course-preferences">
        <div>
          <span>{t("courses.targetLanguage")}</span>
          <strong>{languageName(p.targetLanguageCode)}</strong>
        </div>
        <div>
          <span>{t("courses.supportLanguage")}</span>
          <strong>{languageName(p.supportLanguageCode)}</strong>
        </div>
        <div>
          <span>{t("courses.goal")}</span>
          <strong dir="auto">{p.goal}</strong>
          {!disabled && (
            <button
              className="course-icon-button"
              aria-label={t("courses.editGoal")}
              onClick={() => {
                setGoal(p.goal);
                setEditing((value) => !value);
              }}
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
        {editing && (
          <form
            className="course-inline-edit"
            onSubmit={(event) => {
              event.preventDefault();
              if (goal.trim()) {
                onSave({ ...p, goal: goal.trim() });
                setEditing(false);
              }
            }}
          >
            <input
              aria-label={t("courses.goal")}
              value={goal}
              maxLength={500}
              onChange={(event) => setGoal(event.target.value)}
            />
            <button className="button secondary" type="submit">
              {t("courses.save")}
            </button>
          </form>
        )}
        <div>
          <span>{t("courses.path")}</span>
          <strong>{t(`courses.paths.${p.path}`)}</strong>
        </div>
        <div>
          <span>{t("courses.pace")}</span>
          <strong dir="auto">
            {!disabled && course.reportedAvailability
              ? course.reportedAvailability
              : t("courses.paceValue", {
                  minutes: p.minutesPerLesson,
                  days: p.daysPerWeek,
                })}
          </strong>
        </div>
        <div>
          <span>{t("courses.experience")}</span>
          <strong dir="auto">{p.experience}</strong>
        </div>
        <div>
          <span>{t("courses.learningStyle")}</span>
          <strong>
            {t(`courses.age.${p.ageGroup}`)} ·{" "}
            {t(`courses.literacy.${p.literacy}`)}
          </strong>
        </div>
        {p.interests.length > 0 && (
          <div>
            <span>{t("courses.interests")}</span>
            <strong dir="auto">{p.interests.join(" · ")}</strong>
          </div>
        )}
      </div>
      {p.statedNeeds.length > 0 && (
        <div className="course-preference-notes">
          <h3>{t("courses.youSaid")}</h3>
          {p.statedNeeds.map((value) => (
            <p key={value} dir="auto">
              {value}
            </p>
          ))}
        </div>
      )}
      {p.recommendations.length > 0 && (
        <div className="course-preference-notes">
          <h3>{t("courses.teacherSuggests")}</h3>
          {p.recommendations.map((value) => (
            <p key={value} dir="auto">
              {value}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
export function HomeworkLinks({ items }: { items: HomeworkSummary[] }) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <section
      className="course-homework-links"
      aria-label={t("courses.homework")}
    >
      {items.map((item) => (
        <Link to={`/homework/${item.id}`} key={item.id}>
          <span className="course-homework-icon">
            <BookOpen size={20} />
          </span>
          <span>
            <small>
              {t(
                item.status === "completed"
                  ? "courses.homeworkCompleted"
                  : "courses.homework",
              )}
            </small>
            <strong dir="auto">{item.title}</strong>
          </span>
          <span className="course-homework-action">
            {t(
              item.status === "completed"
                ? "courses.viewResults"
                : item.completedCount > 0
                  ? "courses.resumeHomework"
                  : "courses.practiceNow",
            )}
            <ArrowRight size={17} className="directional-arrow" />
          </span>
        </Link>
      ))}
    </section>
  );
}
