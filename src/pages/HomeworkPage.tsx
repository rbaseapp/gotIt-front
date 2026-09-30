import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Check,
  BookOpen,
  Lightbulb,
  LoaderCircle,
  Pause,
  RotateCcw,
} from "lucide-react";
import { CourseComposer, ReadAloud } from "../components/CourseComposer";
import { courseApi, type Homework } from "../lib/courses";
import { errorMessage } from "../lib/product";
import { ApiError } from "../lib/api";
import { useApp } from "../context/AppContext";
import "../courses.css";

export function HomeworkPage() {
  const { homeworkId = "" } = useParams(),
    { t } = useTranslation(),
    { user } = useApp(),
    navigate = useNavigate();
  const [homework, setHomework] = useState<Homework | null>(null),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const lock = useRef(false),
    pending = useRef<{ key: string; eventId: string } | null>(null);
  const draftKey = `gotit.homework-draft:${user?.id ?? "anonymous"}:${homeworkId}`;
  function eventId(key: string) {
    if (pending.current?.key !== key)
      pending.current = { key, eventId: crypto.randomUUID() };
    return pending.current.eventId;
  }
  function restore(data: Homework) {
    const next = data.tasks.findIndex((task) => !task.done);
    setHomework(data);
    setIndex(
      next < 0 && data.tasks.length ? data.tasks.length : Math.max(0, next),
    );
    let draft = data.tasks[next]?.draft ?? "";
    try {
      const local = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as {
        index: number;
        answer: string;
      } | null;
      if (local?.index === next && typeof local.answer === "string")
        draft = local.answer;
    } catch {
      /* Browser storage is optional. */
    }
    setAnswer(draft);
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      let data = (await courseApi.homework(homeworkId)).homework;
      setHomework(data);
      if (data.status === "pending")
        data = (
          await courseApi.homeworkCommand(homeworkId, "prepare", {
            revision: data.revision,
            eventId: eventId(`prepare:${data.revision}`),
          })
        ).homework;
      restore(data);
      pending.current = null;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load(); /* Restore only when the route changes. */
  }, [homeworkId]); // eslint-disable-line react-hooks/exhaustive-deps
  function changeAnswer(value: string) {
    setAnswer(value);
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ index, answer: value }),
      );
    } catch {
      /* Pause still saves to the server. */
    }
  }
  async function action(
    kind: "answer" | "hint" | "skip" | "draft",
    channel: "text" | "voice" = "text",
    value = answer,
  ) {
    if (!homework || lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    const body = {
      revision: homework.revision,
      taskIndex: index,
      action: kind,
      answer: value,
      channel,
    };
    try {
      const result = await courseApi.homeworkCommand(homeworkId, "actions", {
        ...body,
        eventId: eventId(JSON.stringify(body)),
      });
      setHomework(result.homework);
      pending.current = null;
      if (kind === "answer" || kind === "skip") {
        setAnswer("");
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          /* Optional storage. */
        }
      }
      return result.homework;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("courses.changed")
          : errorMessage(err),
      );
      if (err instanceof ApiError && err.status === 409) {
        const fresh = await courseApi.homework(homeworkId).catch(() => null);
        if (fresh) restore(fresh.homework);
      }
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const task = homework?.tasks[index],
    attempt = task?.attempts.at(-1),
    back = homework?.courseId ? `/courses/${homework.courseId}` : "/courses";
  const finished = Boolean(
    homework && homework.tasks.length && index >= homework.tasks.length,
  );
  const independent =
    homework?.tasks.filter((item) => item.attempts.some((a) => a.independent))
      .length ?? 0;
  const practiceNeeded =
    homework?.tasks.filter(
      (item) => !item.attempts.some((a) => a.result === "correct"),
    ) ?? [];
  return (
    <div className="course-page homework-page" aria-busy={busy || loading}>
      <header className="course-page-heading">
        <div>
          <p className="eyebrow">{t("courses.homework")}</p>
          <h1 dir="auto">{homework?.title ?? t("courses.homeworkTitle")}</h1>
        </div>
        <Link className="course-text-link" to={back}>
          {t("courses.backToCourse")}
        </Link>
      </header>
      {error && (
        <div role="alert" className="course-error">
          <p>{error}</p>
          {!task && (
            <button className="button secondary" onClick={() => void load()}>
              {t("courses.tryAgain")}
            </button>
          )}
        </div>
      )}
      {loading ? (
        <section className="course-chat-card course-loading" role="status">
          <LoaderCircle className="spin" />
          <h2>{t("courses.preparingHomework")}</h2>
          <p>{t("courses.preparingHomeworkBody")}</p>
        </section>
      ) : finished ? (
        <section className="course-hero homework-finished">
          <span className="course-success-icon">
            <Check size={28} />
          </span>
          <h2>{t("courses.homeworkDone")}</h2>
          <p>
            {independent
              ? t("courses.independentSuccess", { count: independent })
              : t("courses.practiceSuccess")}
          </p>
          {practiceNeeded.length > 0 && (
            <p dir="auto">
              {t("courses.nextReview")}: {practiceNeeded[0]?.objective}
            </p>
          )}
          <p className="course-note">{t("courses.homeworkContinuation")}</p>
          <Link className="button primary" to={back}>
            {t("courses.backToCourse")}
            <ArrowRight size={17} className="directional-arrow" />
          </Link>
          <details className="course-adjust">
            <summary>{t("courses.viewResults")}</summary>
            {homework?.tasks.map((item, taskIndex) => (
              <article className="homework-result-row" key={taskIndex}>
                <strong dir="auto">{item.objective}</strong>
                <p>
                  {t(
                    item.attempts.some((a) => a.independent)
                      ? "courses.independent"
                      : item.attempts.some((a) => a.result === "correct")
                        ? "courses.withSupport"
                        : "courses.forReview",
                  )}
                </p>
                <p dir="auto">{item.solution?.explanation}</p>
              </article>
            ))}
          </details>
        </section>
      ) : task && homework ? (
        <>
          <div className="homework-progress">
            <span>
              {t("courses.taskProgress", {
                current: index + 1,
                total: homework.tasks.length,
              })}
            </span>
            <span>
              {t("courses.estimatedMinutes", {
                count: homework.estimatedMinutes ?? 5,
              })}
            </span>
            <progress
              aria-label={t("courses.taskProgressLabel")}
              value={homework.completedCount}
              max={homework.tasks.length}
            />
          </div>
          <section className="homework-task-card" key={index}>
            <p className="course-kicker" dir="auto">
              {task.objective}
            </p>
            <div className="course-current-question">
              <h2 dir="auto">{task.prompt}</h2>
              <ReadAloud
                text={task.prompt}
                language={homework.supportLanguageCode}
              />
            </div>
            {task.listeningText && (
              <div className="homework-listen">
                <ReadAloud
                  text={task.listeningText}
                  language={homework.targetLanguageCode}
                />
                <details>
                  <summary>{t("courses.readInstead")}</summary>
                  <p dir="auto">{task.listeningText}</p>
                </details>
              </div>
            )}
            {task.kind === "choice" ? (
              <div className="homework-choices">
                {task.choices.map((choice) => (
                  <div className="homework-choice-option" key={choice}>
                    <button
                      className={answer === choice ? "selected" : ""}
                      type="button"
                      disabled={busy || task.done}
                      onClick={() => changeAnswer(choice)}
                      dir="auto"
                    >
                      {choice}
                    </button>
                    {homework.oralFirst && (
                      <ReadAloud
                        text={choice}
                        label={choice}
                        language={homework.targetLanguageCode}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {task.kind === "order" && !task.done && (
              <div className="homework-tokens">
                {task.tokens.map((token, tokenIndex) => (
                  <button
                    key={`${token}:${tokenIndex}`}
                    disabled={busy}
                    onClick={() =>
                      changeAnswer([answer, token].filter(Boolean).join(" "))
                    }
                    dir="auto"
                  >
                    {token}
                  </button>
                ))}
                <button
                  className="course-icon-button"
                  aria-label={t("courses.clearAnswer")}
                  onClick={() => changeAnswer("")}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}
            {!task.done &&
              (task.kind === "choice" ? (
                <button
                  className="button primary"
                  disabled={busy || !answer}
                  onClick={() => void action("answer")}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                  {t("courses.checkAnswer")}
                </button>
              ) : (
                <CourseComposer
                  value={answer}
                  onChange={changeAnswer}
                  onSubmit={(channel) => void action("answer", channel)}
                  language={homework.targetLanguageCode}
                  disabled={busy}
                  label={t("courses.yourAnswer")}
                  submitLabel={t("courses.checkAnswer")}
                />
              ))}
            {attempt && (
              <div
                className={`homework-feedback ${attempt.result}`}
                role="status"
              >
                <strong>{t(`courses.feedback.${attempt.result}`)}</strong>
                <p dir="auto">{attempt.feedback}</p>
                <ReadAloud
                  text={attempt.feedback}
                  language={homework.supportLanguageCode}
                />
              </div>
            )}
            {task.hint && !task.done && (
              <aside className="homework-hint">
                <Lightbulb size={18} />
                <p dir="auto">{task.hint}</p>
                <ReadAloud
                  text={task.hint}
                  language={homework.supportLanguageCode}
                />
              </aside>
            )}
            {task.done && (
              <>
                {task.solution && attempt?.result !== "correct" && (
                  <div className="homework-solution">
                    <strong dir="auto" lang={homework.targetLanguageCode}>
                      {task.solution.answer}
                    </strong>
                    <p dir="auto">{task.solution.explanation}</p>
                  </div>
                )}
                <button
                  className="button primary"
                  onClick={() => {
                    setIndex(index + 1);
                    setAnswer(homework.tasks[index + 1]?.draft ?? "");
                  }}
                >
                  {t(
                    index + 1 === homework.tasks.length
                      ? "courses.finishPractice"
                      : "courses.nextTask",
                  )}
                  <ArrowRight size={17} className="directional-arrow" />
                </button>
              </>
            )}
            {!task.done && (
              <div className="homework-support-actions">
                <button
                  className="course-text-link"
                  disabled={busy || task.hintUsed}
                  onClick={() => void action("hint")}
                >
                  <Lightbulb size={16} />
                  {t("courses.hint")}
                </button>
                <button
                  className="course-text-link"
                  disabled={busy}
                  onClick={() => void action("skip")}
                >
                  {t("courses.skipTask")}
                </button>
              </div>
            )}
          </section>
          <footer className="homework-footer">
            <button
              className="course-text-link"
              disabled={busy}
              onClick={() => {
                if (task.done) navigate(back);
                else
                  void action("draft").then((saved) => {
                    if (saved) navigate(back);
                  });
              }}
            >
              <Pause size={16} />
              {t("courses.pauseHomework")}
            </button>
            <small>
              {t(answer ? "courses.draftNotice" : "courses.progressSaved")}
            </small>
          </footer>
        </>
      ) : null}
    </div>
  );
}

export function LessonHomeworkCard({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    courseApi
      .homework(lessonId)
      .then((result) => {
        if (live) setHomework(result.homework);
      })
      .catch((err) => {
        if (live && !(err instanceof ApiError && err.status === 404))
          setError(errorMessage(err));
      });
    return () => {
      live = false;
    };
  }, [lessonId, retry]);
  if (error)
    return (
      <div className="course-error" role="alert">
        <p>{error}</p>
        <button
          className="button secondary"
          onClick={() => setRetry((value) => value + 1)}
        >
          {t("courses.tryAgain")}
        </button>
      </div>
    );
  if (!homework) return null;
  return (
    <Link className="lesson-homework-card" to={`/homework/${lessonId}`}>
      <span className="course-homework-icon">
        <BookOpen size={22} />
      </span>
      <span>
        <strong>{t("courses.lessonHomeworkTitle")}</strong>
        <small>{t("courses.lessonHomeworkBody")}</small>
      </span>
      <span className="button primary">
        {t(
          homework.status === "completed"
            ? "courses.viewResults"
            : "courses.practiceNow",
        )}
        <ArrowRight size={16} className="directional-arrow" />
      </span>
    </Link>
  );
}
