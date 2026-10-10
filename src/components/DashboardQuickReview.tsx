import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Play } from "lucide-react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Intent>();
  const creation = useRef<Intent | undefined>(undefined);
  const lock = useRef(false);
  const current = exercises[index];
  const fullReview = `/learn/smart?${new URLSearchParams({ language, return: "/dashboard" })}`;
  const start = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let active = session;
      if (!active) {
        creation.current ??= intent({
          sessionType: "recall",
          sourceLanguageCode: language,
          count: 5,
          includeNewItems: false,
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
      setExercises(issued.exercises);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async (choiceId?: string) => {
    if (!current || receipt || lock.current || (!pending && !choiceId)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const submission =
      pending ?? intent({ exerciseId: current.id, choiceId, hintsUsed: 0 });
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
      setPending(undefined);
      onScored();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const next = async () => {
    if (!session || lock.current) return;
    if (index < exercises.length - 1) {
      setIndex(index + 1);
      setReceipt(undefined);
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
      onScored();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
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
      <div className="nd-word-card" aria-live="polite">
        {session?.status === "completed" ? (
          <>
            <h3>{t("game.completed")}</h3>
            <p>{t("newDashboard.savedXp", { xp: session.xpEarned })}</p>
          </>
        ) : (
          <>
            <strong dir="auto">
              {current?.prompt.text ?? preview ?? t("newDashboard.yourWords")}
            </strong>
            <p>{t("newDashboard.meaningQuestion")}</p>
            {receipt && (
              <div
                className={`nd-answer ${receipt.attempt.result === "correct" ? "correct" : "incorrect"}`}
              >
                <b>{t(`labels.${receipt.attempt.result}`)}</b>
                <span dir="auto">{receipt.attempt.expectedAnswer}</span>
                <small>
                  {t("newDashboard.savedXp", { xp: receipt.attempt.xpEarned })}
                </small>
              </div>
            )}
          </>
        )}
      </div>
      {current && !receipt && (
        <div className="nd-choices">
          {current.prompt.choices?.map((choice) => (
            <button
              type="button"
              key={choice.id}
              disabled={busy || !!pending}
              onClick={() => void submit(choice.id)}
              dir="auto"
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}
      {!exercises.length &&
        (hasEntitlement("practice.play") ? (
          <button
            className="nd-button"
            disabled={busy || !available || !language}
            onClick={() => void start()}
          >
            <Play size={16} />
            {t("newDashboard.startQuick")}
          </button>
        ) : (
          <Link className="nd-button" to="/billing">
            {t("shell.upgradePro")}
          </Link>
        ))}
      {receipt && session?.status !== "completed" && (
        <button
          className="nd-button"
          disabled={busy}
          onClick={() => void next()}
        >
          {t(
            index < exercises.length - 1
              ? "newDashboard.nextWord"
              : "newDashboard.finishReview",
          )}
        </button>
      )}
      <RemoteState
        loading={busy}
        error={error}
        retry={() => void (pending ? submit() : receipt ? next() : start())}
      />
      <Link
        className="nd-text-link"
        to={
          session?.status === "active"
            ? `/learn/session/recall?${new URLSearchParams({ resume: session.id, language, return: "/dashboard" })}`
            : fullReview
        }
      >
        {t("newDashboard.fullReview")}
      </Link>
    </section>
  );
}
