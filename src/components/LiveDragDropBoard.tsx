import {
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check, GripVertical, Sparkles, X } from "lucide-react";
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
  doneLabel?: string;
};

type TouchDrag = {
  pointerId: number;
  choiceId: string;
  text: string;
  startX: number;
  startY: number;
  active: boolean;
};

type BoardResult = {
  correct: boolean;
  expectedChoiceId: string;
};

const comparable = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase();

export function LiveDragDropBoard({
  exercises,
  busy,
  onSubmit,
  onDone,
  doneLabel,
}: Props) {
  const { t } = useTranslation();
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedChoice, setSelectedChoice] = useState<string>();
  const [draggingChoice, setDraggingChoice] = useState<string>();
  const [overTarget, setOverTarget] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<Record<string, BoardResult>>();
  const [touchGhost, setTouchGhost] = useState<{
    text: string;
    x: number;
    y: number;
  }>();
  const touchDrag = useRef<TouchDrag | undefined>(undefined);
  const suppressClick = useRef<string | undefined>(undefined);
  const choices = useMemo(
    () => exercises[0]?.prompt.choices ?? [],
    [exercises],
  );
  const placedChoiceIds = Object.values(placements);
  const complete = placedChoiceIds.length === exercises.length;

  const place = (exerciseId: string, choiceId: string) => {
    if (checking || results || busy) return;
    setPlacements((current) => {
      const next = { ...current };
      const previousExercise = Object.entries(current).find(
        ([, placedChoiceId]) => placedChoiceId === choiceId,
      )?.[0];
      const displacedChoice = current[exerciseId];
      if (previousExercise && previousExercise !== exerciseId) {
        if (displacedChoice) next[previousExercise] = displacedChoice;
        else delete next[previousExercise];
      }
      next[exerciseId] = choiceId;
      return next;
    });
    setSelectedChoice(undefined);
    setDraggingChoice(undefined);
    setOverTarget(undefined);
  };

  const checkBoard = async () => {
    if (!complete || checking || results || busy) return;
    setChecking(true);
    const checked: Record<string, BoardResult> = {};
    for (const exercise of exercises) {
      const choiceId = placements[exercise.id];
      if (!choiceId) continue;
      const receipt = await onSubmit(exercise, choiceId);
      if (!receipt) {
        setChecking(false);
        return;
      }
      const expected = receipt.attempt.expectedAnswer;
      const expectedChoiceId =
        choices.find(
          (choice) =>
            expected && comparable(choice.text) === comparable(expected),
        )?.id ?? choiceId;
      checked[exercise.id] = {
        correct: receipt.attempt.result === "correct",
        expectedChoiceId,
      };
    }
    setResults(checked);
    setChecking(false);
  };

  const targetAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-target]")
      ?.dataset.dropTarget;

  const startTouchDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    choiceId: string,
    text: string,
  ) => {
    if (event.pointerType === "mouse" || busy || checking || results) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchDrag.current = {
      pointerId: event.pointerId,
      choiceId,
      text,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  };

  const moveTouchDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = touchDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (
      !current.active &&
      Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY,
      ) > 7
    ) {
      current.active = true;
      setDraggingChoice(current.choiceId);
    }
    if (!current.active) return;
    event.preventDefault();
    setTouchGhost({ text: current.text, x: event.clientX, y: event.clientY });
    setOverTarget(targetAt(event.clientX, event.clientY));
  };

  const finishTouchDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = touchDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.active) {
      event.preventDefault();
      suppressClick.current = current.choiceId;
      const target = targetAt(event.clientX, event.clientY) ?? overTarget;
      if (target) place(target, current.choiceId);
    }
    touchDrag.current = undefined;
    setTouchGhost(undefined);
    setDraggingChoice(undefined);
    setOverTarget(undefined);
  };

  const startNativeDrag = (
    event: ReactDragEvent<HTMLButtonElement>,
    choiceId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-gotit-choice", choiceId);
    setDraggingChoice(choiceId);
    setSelectedChoice(undefined);
  };

  const correctCount = results
    ? Object.values(results).filter((result) => result.correct).length
    : 0;

  return (
    <div className="live-drag-drop" aria-busy={busy || checking}>
      <div className="drag-drop-intro">
        <span className="drag-drop-symbol" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <div>
          <h1>{t("game.dragDropTitle")}</h1>
          <p>{t("game.dragDropDraftHelp")}</p>
        </div>
        <strong>
          {results
            ? t("game.dragDropScore", {
                correct: correctCount,
                total: exercises.length,
              })
            : t("game.dragDropProgress", {
                current: placedChoiceIds.length,
                total: exercises.length,
              })}
        </strong>
      </div>

      <div className="drag-drop-layout">
        <div className="drag-drop-rows">
          {exercises.map((exercise, rowIndex) => {
            const placedChoiceId = placements[exercise.id];
            const placedChoice = choices.find(
              (choice) => choice.id === placedChoiceId,
            );
            const result = results?.[exercise.id];
            const expectedChoice = choices.find(
              (choice) => choice.id === result?.expectedChoiceId,
            );
            return (
              <article
                className={cn(
                  "drag-drop-row",
                  placedChoice && !result && "is-filled",
                  result && (result.correct ? "correct" : "incorrect"),
                )}
                key={exercise.id}
              >
                <span className="drag-drop-number" aria-hidden="true">
                  {result ? (
                    result.correct ? (
                      <Check size={16} />
                    ) : (
                      <X size={16} />
                    )
                  ) : (
                    rowIndex + 1
                  )}
                </span>
                <b className="drag-drop-word" dir="auto">
                  {exercise.prompt.text}
                </b>
                <button
                  type="button"
                  className={cn(
                    "drag-drop-slot",
                    placedChoice && "has-card",
                    overTarget === exercise.id && "is-over",
                    selectedChoice && !results && "is-ready",
                    result && (result.correct ? "correct" : "incorrect"),
                  )}
                  data-drop-target={exercise.id}
                  draggable={Boolean(placedChoice) && !checking && !results}
                  disabled={busy || checking || Boolean(results)}
                  aria-label={
                    placedChoice
                      ? t("game.placedMeaning", { meaning: placedChoice.text })
                      : t("game.dropForWord", { word: exercise.prompt.text })
                  }
                  onClick={() => {
                    if (selectedChoice) place(exercise.id, selectedChoice);
                    else if (placedChoice) setSelectedChoice(placedChoice.id);
                  }}
                  onDragStart={(event) => {
                    if (placedChoice) startNativeDrag(event, placedChoice.id);
                  }}
                  onDragEnd={() => {
                    setDraggingChoice(undefined);
                    setOverTarget(undefined);
                  }}
                  onPointerDown={(event) => {
                    if (placedChoice)
                      startTouchDrag(event, placedChoice.id, placedChoice.text);
                  }}
                  onPointerMove={moveTouchDrag}
                  onPointerUp={finishTouchDrag}
                  onPointerCancel={finishTouchDrag}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setOverTarget(exercise.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    )
                      setOverTarget(undefined);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const choiceId =
                      event.dataTransfer.getData(
                        "application/x-gotit-choice",
                      ) || draggingChoice;
                    if (choiceId) place(exercise.id, choiceId);
                  }}
                >
                  {placedChoice ? (
                    <>
                      {!results && (
                        <GripVertical size={17} aria-hidden="true" />
                      )}
                      <span dir="auto">{placedChoice.text}</span>
                      {result &&
                        (result.correct ? (
                          <Check size={18} />
                        ) : (
                          <X size={18} />
                        ))}
                      {result && !result.correct && expectedChoice && (
                        <small className="slot-correction" dir="auto">
                          {t("game.correctMeaning", {
                            meaning: expectedChoice.text,
                          })}
                        </small>
                      )}
                    </>
                  ) : (
                    <span className="drop-placeholder">
                      <span aria-hidden="true">+</span>
                      {t("game.dropHere")}
                    </span>
                  )}
                </button>
              </article>
            );
          })}
        </div>

        <section className="meaning-bank" aria-labelledby="meaning-bank-title">
          <div className="meaning-bank-heading">
            <span id="meaning-bank-title">{t("game.meaningsBank")}</span>
            <small>
              {results
                ? t("game.boardChecked")
                : t("game.meaningsBankDraftHelp")}
            </small>
          </div>
          <div className="meaning-cards">
            {choices.map((choice) => {
              const placed = placedChoiceIds.includes(choice.id);
              return (
                <button
                  key={choice.id}
                  type="button"
                  dir="auto"
                  draggable={!placed && !busy && !checking && !results}
                  disabled={placed || busy || checking || Boolean(results)}
                  aria-pressed={selectedChoice === choice.id}
                  aria-label={t("game.dragMeaning", { meaning: choice.text })}
                  className={cn(
                    "meaning-card",
                    selectedChoice === choice.id && "is-selected",
                    draggingChoice === choice.id && "is-dragging",
                    placed && "is-resolved",
                  )}
                  onClick={() => {
                    if (suppressClick.current === choice.id) {
                      suppressClick.current = undefined;
                      return;
                    }
                    setSelectedChoice((current) =>
                      current === choice.id ? undefined : choice.id,
                    );
                  }}
                  onDragStart={(event) => startNativeDrag(event, choice.id)}
                  onDragEnd={() => {
                    setDraggingChoice(undefined);
                    setOverTarget(undefined);
                  }}
                  onPointerDown={(event) =>
                    startTouchDrag(event, choice.id, choice.text)
                  }
                  onPointerMove={moveTouchDrag}
                  onPointerUp={finishTouchDrag}
                  onPointerCancel={finishTouchDrag}
                >
                  <GripVertical size={18} aria-hidden="true" />
                  <span>{choice.text}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="drag-drop-actions" aria-live="polite">
        {results ? (
          <>
            <span>{t("game.boardChecked")}</span>
            <button className="button primary" type="button" onClick={onDone}>
              {doneLabel ?? t("game.continueToSummary")}
            </button>
          </>
        ) : (
          <>
            <span>
              {selectedChoice
                ? t("game.meaningSelected")
                : complete
                  ? t("game.readyToCheck")
                  : t("game.arrangeBeforeCheck")}
            </span>
            <button
              className="button primary"
              type="button"
              disabled={!complete || busy || checking}
              onClick={() => void checkBoard()}
            >
              {checking ? t("game.checkingBoard") : t("game.finishedArranging")}
            </button>
          </>
        )}
      </div>

      {touchGhost && (
        <div
          className="meaning-drag-ghost"
          dir="auto"
          style={{ left: touchGhost.x, top: touchGhost.y }}
          aria-hidden="true"
        >
          <GripVertical size={18} />
          {touchGhost.text}
        </div>
      )}
    </div>
  );
}
