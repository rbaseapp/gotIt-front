import {
  useEffect,
  useMemo,
  useRef,
  useState,
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
};

type ActiveAttempt = {
  exerciseId: string;
  choiceId: string;
  result?: "correct" | "incorrect";
};

type TouchDrag = {
  pointerId: number;
  choiceId: string;
  text: string;
  startX: number;
  startY: number;
  active: boolean;
};

const comparable = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase();

export function LiveDragDropBoard({
  exercises,
  busy,
  onSubmit,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [resolvedChoices, setResolvedChoices] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string>();
  const [draggingChoice, setDraggingChoice] = useState<string>();
  const [overTarget, setOverTarget] = useState<string>();
  const [attempt, setAttempt] = useState<ActiveAttempt>();
  const [touchGhost, setTouchGhost] = useState<{
    text: string;
    x: number;
    y: number;
  }>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resolving = useRef(false);
  const touchDrag = useRef<TouchDrag | undefined>(undefined);
  const suppressClick = useRef<string | undefined>(undefined);
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
    if (
      resolving.current ||
      busy ||
      placements[exerciseId] ||
      resolvedChoices.includes(choiceId)
    )
      return;
    const exercise = exercises.find((candidate) => candidate.id === exerciseId);
    if (!exercise) return;

    resolving.current = true;
    setSelectedChoice(undefined);
    setDraggingChoice(undefined);
    setOverTarget(undefined);
    setAttempt({ exerciseId, choiceId });
    const receipt = await onSubmit(exercise, choiceId);
    if (!receipt) {
      setAttempt(undefined);
      resolving.current = false;
      return;
    }

    const correct = receipt.attempt.result === "correct";
    const expected = receipt.attempt.expectedAnswer;
    const correctChoiceId =
      choices.find(
        (choice) =>
          expected && comparable(choice.text) === comparable(expected),
      )?.id ?? choiceId;
    setAttempt({
      exerciseId,
      choiceId,
      result: correct ? "correct" : "incorrect",
    });

    timer.current = setTimeout(
      () => {
        const nextPlacements = {
          ...placements,
          [exerciseId]: correctChoiceId,
        };
        setPlacements(nextPlacements);
        setResolvedChoices((current) => [...current, correctChoiceId]);
        setAttempt(undefined);
        resolving.current = false;
        if (Object.keys(nextPlacements).length === exercises.length) onDone();
      },
      correct ? 540 : 760,
    );
  };

  const targetAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-target]")
      ?.dataset.dropTarget;

  const startTouchDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    choiceId: string,
    text: string,
  ) => {
    if (event.pointerType === "mouse" || busy || resolving.current) return;
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
      if (target) void resolve(target, current.choiceId);
    }
    touchDrag.current = undefined;
    setTouchGhost(undefined);
    setDraggingChoice(undefined);
    setOverTarget(undefined);
  };

  const completed = Object.keys(placements).length;

  return (
    <div className="live-drag-drop" aria-busy={busy || resolving.current}>
      <div className="drag-drop-intro">
        <span className="drag-drop-symbol" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <div>
          <h1>{t("game.dragDropTitle")}</h1>
          <p>{t("game.dragDropHelp")}</p>
        </div>
        <strong>
          {t("game.dragDropProgress", {
            current: completed,
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
            const isAttempt = attempt?.exerciseId === exercise.id;
            const attemptedChoice = choices.find(
              (choice) => choice.id === attempt?.choiceId,
            );
            return (
              <article
                className={cn(
                  "drag-drop-row",
                  placedChoice && "is-complete",
                  isAttempt && attempt.result,
                )}
                key={exercise.id}
              >
                <span className="drag-drop-number" aria-hidden="true">
                  {placedChoice ? <Check size={16} /> : rowIndex + 1}
                </span>
                <b className="drag-drop-word" dir="auto">
                  {exercise.prompt.text}
                </b>
                <button
                  type="button"
                  className={cn(
                    "drag-drop-slot",
                    overTarget === exercise.id && "is-over",
                    selectedChoice && !placedChoice && "is-ready",
                    isAttempt && attempt.result,
                  )}
                  data-drop-target={exercise.id}
                  disabled={Boolean(placedChoice) || busy || resolving.current}
                  aria-label={
                    placedChoice
                      ? t("game.placedMeaning", { meaning: placedChoice.text })
                      : t("game.dropForWord", { word: exercise.prompt.text })
                  }
                  onClick={() => {
                    if (selectedChoice)
                      void resolve(exercise.id, selectedChoice);
                  }}
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
                    setOverTarget(undefined);
                    if (choiceId) void resolve(exercise.id, choiceId);
                  }}
                >
                  {placedChoice || (isAttempt && attemptedChoice) ? (
                    <>
                      <span dir="auto">
                        {(placedChoice ?? attemptedChoice)?.text}
                      </span>
                      {placedChoice || attempt?.result === "correct" ? (
                        <Check size={18} />
                      ) : attempt?.result === "incorrect" ? (
                        <X size={18} />
                      ) : (
                        <span className="drop-spinner" aria-hidden="true" />
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
            <small>{t("game.meaningsBankHelp")}</small>
          </div>
          <div className="meaning-cards">
            {choices.map((choice) => {
              const resolved = resolvedChoices.includes(choice.id);
              const trying = attempt?.choiceId === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  dir="auto"
                  draggable={!resolved && !busy && !resolving.current}
                  disabled={resolved || busy || resolving.current}
                  aria-pressed={selectedChoice === choice.id}
                  aria-label={t("game.dragMeaning", { meaning: choice.text })}
                  className={cn(
                    "meaning-card",
                    selectedChoice === choice.id && "is-selected",
                    draggingChoice === choice.id && "is-dragging",
                    resolved && "is-resolved",
                    trying && "is-trying",
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
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData(
                      "application/x-gotit-choice",
                      choice.id,
                    );
                    setDraggingChoice(choice.id);
                    setSelectedChoice(undefined);
                  }}
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

      <p className="drag-drop-status" aria-live="polite">
        {attempt?.result === "correct"
          ? t("game.placedCorrect")
          : attempt?.result === "incorrect"
            ? t("game.placedIncorrect")
            : selectedChoice
              ? t("game.meaningSelected")
              : ""}
      </p>
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
