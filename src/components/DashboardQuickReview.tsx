import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import {
  BookmarkPlus,
  CheckCircle2,
  CircleAlert,
  Gamepad2,
  Play,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSubscription } from "../context/SubscriptionContext";
import { RemoteState } from "./RemoteState";
import {
  attemptReceipt,
  errorMessage,
  exerciseSchema,
  intent,
  product,
  sessionSchema,
  type AttemptReceipt,
  type Exercise,
  type Intent,
  type Session,
} from "../lib/product";

export function DashboardQuickReview({
  language,
  available,
  preview,
  onScored,
}: {
  language: string;
  available: boolean;
  preview?: string;
  onScored: () => void;
}) {
  const { t } = useTranslation();
  const { hasEntitlement } = useSubscription();
  const [session, setSession] = useState<Session>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [receipt, setReceipt] = useState<AttemptReceipt>();
  const [feedback, setFeedback] = useState<AttemptReceipt>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Intent>();
  const [selectedChoice, setSelectedChoice] = useState<string>();
  const scored = useRef(onScored);
  useEffect(() => {
    scored.current = onScored;
  }, [onScored]);
  const creation = useRef<Intent | undefined>(undefined);
  const activeSession = useRef<Session | undefined>(undefined);
  const started = useRef(false);
  const lock = useRef(false);
  const canPlay = hasEntitlement("practice.play");
  const current = exercises[index];
  const fullReview = `/learn/smart?${new URLSearchParams({ language, return: "/dashboard" })}`;
  const start = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let active = activeSession.current;
      if (!active) {
        creation.current ??= intent({
          sessionType: "recall",
          sourceLanguageCode: language,
          count: 5,
        });
        active = (
          await product(
            z.object({ session: sessionSchema }),
            "practice/sessions",
            "POST",
            creation.current.body,
            creation.current.eventId,
          )
        ).session;
        activeSession.current = active;
        setSession(active);
      }
      const issued = await product(
        z.object({ exercises: z.array(exerciseSchema) }),
        `practice/sessions/${active.id}/exercises`,
        "POST",
        {
          count: Math.min(5, active.itemCount),
          kind: "multiple_choice",
          direction: "source_to_translation",
        },
      );
      if (!issued.exercises.length)
        throw new Error(t("newDashboard.noReviewWords"));
      if (
        issued.exercises.some(
          (e) =>
            e.kind !== "multiple_choice" ||
            e.direction !== "source_to_translation" ||
            e.prompt.languageCode !== language ||
            !e.prompt.choices?.length,
        )
      )
        throw new Error(t("game.languageMismatch"));
      if (issued.exercises.some((e) => e.prompt.choices?.length !== 4))
        throw new Error(t("productErrors.INSUFFICIENT_DISTRACTORS"));
      setExercises(issued.exercises);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [language, t]);
  useEffect(() => {
    if (!started.current && available && language && canPlay) {
      started.current = true;
      void start();
    }
  }, [available, language, canPlay, start]);
  const submit = async (choiceId?: string) => {
    if (!current || receipt || lock.current || (!pending && !choiceId)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const submission =
      pending ?? intent({ exerciseId: current.id, choiceId, hintsUsed: 0 });
    if (!pending) setSelectedChoice(choiceId);
    setPending(submission);
    try {
      const result = await product(
        attemptReceipt,
        "practice/attempts",
        "POST",
        submission.body,
        submission.eventId,
      );
      setReceipt(result);
      setFeedback(result);
      setPending(undefined);
      scored.current();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const next = useCallback(async () => {
    if (!session || lock.current) return;
    if (index < exercises.length - 1) {
      setIndex(index + 1);
      setReceipt(undefined);
      setSelectedChoice(undefined);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const closed = await product(
        z.object({ session: sessionSchema }),
        `practice/sessions/${session.id}`,
        "PATCH",
        { status: "completed" },
      );
      setSession(closed.session);
      scored.current();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [session, index, exercises.length]);
  useEffect(() => {
    if (!receipt || session?.status === "completed") return;
    // Match the reference's brief answer acknowledgement; cancel on navigation.
    // A failed close stays visible for explicit retry, without a retry loop.
    const timer = window.setTimeout(() => void next(), 900);
    return () => window.clearTimeout(timer);
  }, [receipt, session?.status, next]);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(undefined), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  // With no saved words there is nothing to review: say where words come from instead of
  // showing a practice card that cannot start.
  const empty =
    !available && !exercises.length && session?.status !== "completed";
  const result = receipt?.attempt.result;
  const correct = feedback?.attempt.result === "correct";
  return (
    <section className="nd-review nd-card" aria-labelledby="nd-review-title">
      <header className="nd-card-heading">
        <span className="nd-square">
          <Gamepad2 size={22} />
        </span>
        <div>
          <h2 id="nd-review-title">{t("newDashboard.quickReview")}</h2>
          <p>{t("newDashboard.reviewHelp")}</p>
        </div>
      </header>
      {empty ? (
        <div className="nd-review-empty">
          <BookmarkPlus size={28} aria-hidden="true" />
          <h3>{t("newDashboard.emptyReviewTitle")}</h3>
          <p>{t("newDashboard.emptyReviewBody")}</p>
        </div>
      ) : (
        <>
          <div
            className="nd-segments"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={exercises.length || 5}
            aria-valuenow={receipt ? index + 1 : index}
            aria-label={t("newDashboard.reviewProgress", {
              current: receipt ? index + 1 : index,
              total: exercises.length || 5,
            })}
          >
            {Array.from({ length: exercises.length || 5 }, (_, i) => (
              <span
                key={i}
                className={i < index || (i === index && receipt) ? "done" : ""}
              />
            ))}
          </div>
          <div
            className={`nd-word-card${result ? ` ${result}` : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {session?.status === "completed" ? (
              <>
                <h3>{t("game.completed")}</h3>
                <p>{t("newDashboard.savedXp", { xp: session.xpEarned })}</p>
              </>
            ) : (
              <>
                <strong dir="auto">
                  {current?.prompt.text ??
                    preview ??
                    t("newDashboard.yourWords")}
                </strong>
                <p>{t("newDashboard.meaningQuestion")}</p>
              </>
            )}
          </div>
          {current && session?.status !== "completed" && (
            <div className="nd-choices">
              {current.prompt.choices?.map((choice) => (
                <button
                  type="button"
                  key={choice.id}
                  disabled={busy || !!pending || !!receipt}
                  className={
                    receipt
                      ? choice.text === receipt.attempt.expectedAnswer
                        ? "correct"
                        : choice.id === selectedChoice
                          ? "incorrect"
                          : undefined
                      : undefined
                  }
                  onClick={() => void submit(choice.id)}
                  dir="auto"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <RemoteState
        loading={busy}
        error={error}
        retry={() => void (pending ? submit() : receipt ? next() : start())}
      />
      {empty ? (
        <Link className="nd-button" to="/vocabulary">
          <BookmarkPlus size={16} />
          {t("newDashboard.addWords")}
        </Link>
      ) : (
        <Link className="nd-button" to={canPlay ? fullReview : "/billing"}>
          <Play size={16} />
          {t(canPlay ? "newDashboard.fullReview" : "shell.upgradePro")}
        </Link>
      )}
      {feedback && (
        <div
          key={feedback.attempt.id}
          className={`nd-answer-toast ${correct ? "success" : "error"}`}
          role={correct ? "status" : "alert"}
          aria-atomic="true"
        >
          {correct && (
            <div className="nd-answer-confetti" aria-hidden="true">
              {Array.from({ length: 28 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      "--x": `${((i * 47) % 280) - 140}px`,
                      "--delay": `${(i % 7) * 35}ms`,
                      "--rotation": `${(i * 67) % 720}deg`,
                      "--color": ["#35b879", "#f5bf42", "#71b7e8", "#e78db6"][
                        i % 4
                      ],
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          {correct ? <CheckCircle2 size={25} /> : <CircleAlert size={25} />}
          <div>
            <b>{t(`labels.${feedback.attempt.result}`)}</b>
            <p>
              {correct ? (
                t("newDashboard.savedXp", { xp: feedback.attempt.xpEarned })
              ) : (
                <bdi>
                  {t("game.expectedAnswer", {
                    answer: feedback.attempt.expectedAnswer,
                  })}
                </bdi>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("feedback.closeNotification")}
            onClick={() => setFeedback(undefined)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
