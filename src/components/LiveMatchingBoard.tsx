import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Link2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AttemptReceipt, Exercise } from "../lib/product";
import { cn } from "../lib/utils";

type Props = {
  exercises: Exercise[];
  busy: boolean;
  onSubmit: (
    exercise: Exercise,
    choiceId: string,
  ) => Promise<AttemptReceipt | undefined>;
  onDone: () => void;
};

const comparable = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase();

export function LiveMatchingBoard({
  exercises,
  busy,
  onSubmit,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const [left, setLeft] = useState<string>();
  const [right, setRight] = useState<string>();
  const [resolvedExercises, setResolvedExercises] = useState<string[]>([]);
  const [resolvedChoices, setResolvedChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "incorrect">();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resolving = useRef(false);
  const leftRef = useRef<string | undefined>(undefined);
  const rightRef = useRef<string | undefined>(undefined);
  const choices = useMemo(
    () => exercises[0]?.prompt.choices ?? [],
    [exercises],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const resolve = async (exerciseId: string, choiceId: string) => {
    if (resolving.current || busy) return;
    const exercise = exercises.find((candidate) => candidate.id === exerciseId);
    if (!exercise) return;
    resolving.current = true;
    leftRef.current = exerciseId;
    rightRef.current = choiceId;
    setLeft(exerciseId);
    setRight(choiceId);
    const receipt = await onSubmit(exercise, choiceId);
    if (!receipt) {
      resolving.current = false;
      return;
    }

    const correct = receipt.attempt.result === "correct";
    const expected = receipt.attempt.expectedAnswer;
    const correctChoice =
      choices.find(
        (choice) =>
          expected && comparable(choice.text) === comparable(expected),
      )?.id ?? choiceId;
    setFeedback(correct ? "correct" : "incorrect");

    timer.current = setTimeout(() => {
      const nextExercises = [...resolvedExercises, exerciseId];
      setResolvedExercises(nextExercises);
      setResolvedChoices((current) => [...current, correctChoice]);
      setLeft(undefined);
      setRight(undefined);
      leftRef.current = undefined;
      rightRef.current = undefined;
      setFeedback(undefined);
      resolving.current = false;
      if (nextExercises.length === exercises.length) onDone();
    }, 650);
  };

  const chooseLeft = (exerciseId: string) => {
    leftRef.current = exerciseId;
    setLeft(exerciseId);
    if (rightRef.current) void resolve(exerciseId, rightRef.current);
  };
  const chooseRight = (choiceId: string) => {
    rightRef.current = choiceId;
    setRight(choiceId);
    if (leftRef.current) void resolve(leftRef.current, choiceId);
  };

  return (
    <div className="live-matching" aria-busy={busy || resolving.current}>
      <div className="matching-intro">
        <span className="matching-symbol" aria-hidden="true">
          <Link2 size={22} />
        </span>
        <div>
          <h1>{t("game.matchTitle")}</h1>
          <p>{t("game.matchHelp")}</p>
        </div>
        <strong>
          {t("game.matchProgress", {
            current: resolvedExercises.length,
            total: exercises.length,
          })}
        </strong>
      </div>
      <div className="live-matching-board">
        <div className="matching-column">
          {exercises.map((exercise) => {
            const resolved = resolvedExercises.includes(exercise.id);
            return (
              <button
                key={exercise.id}
                type="button"
                dir="auto"
                disabled={resolved || busy || resolving.current}
                aria-pressed={left === exercise.id}
                className={cn(
                  "matching-tile",
                  left === exercise.id && "selected",
                  resolved && "resolved",
                  left === exercise.id && feedback,
                )}
                onClick={() => chooseLeft(exercise.id)}
              >
                <span>{exercise.prompt.text}</span>
                {resolved && <Check size={18} />}
                {left === exercise.id && feedback === "incorrect" && (
                  <X size={18} />
                )}
              </button>
            );
          })}
        </div>
        <div className="matching-column">
          {choices.map((choice) => {
            const resolved = resolvedChoices.includes(choice.id);
            return (
              <button
                key={choice.id}
                type="button"
                dir="auto"
                disabled={resolved || busy || resolving.current}
                aria-pressed={right === choice.id}
                className={cn(
                  "matching-tile",
                  right === choice.id && "selected",
                  resolved && "resolved",
                  right === choice.id && feedback,
                )}
                onClick={() => chooseRight(choice.id)}
              >
                <span>{choice.text}</span>
                {resolved && <Check size={18} />}
                {right === choice.id && feedback === "incorrect" && (
                  <X size={18} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
