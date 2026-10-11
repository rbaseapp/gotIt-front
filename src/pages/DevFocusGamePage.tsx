import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  EarOff,
  Flame,
  GripVertical,
  Headphones,
  Lightbulb,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Star,
  Tag,
  Volume2,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/Modal";
import { LetterBoxesInput } from "../components/LetterBoxesInput";
import { RemoteState } from "../components/RemoteState";
import { useFocusSession } from "../hooks/useFocusSession";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { useResource } from "../lib/useResource";
import { learningReturn } from "../lib/learningNavigation";
import {
  dashboardSchema,
  detailSchema,
  product,
  type Exercise,
  type StudyCard,
} from "../lib/product";
import {
  focusGamesEnabled,
  formatPracticeTime,
  listeningLetters,
  readFocusCheckpoint,
  remembered,
  reviewItems,
  stageSummary,
  type FocusOutcome,
} from "../lib/focusPractice";
import { LiveGameSessionPage } from "./LiveGameSessionPage";
import "./focus-games-source.css";
import "./focus-games.css";
import "./focus-session-end.css";

const illustration: Record<string, string> = {
  flashcards: "e28750e6768b5cd33105d9344bdbad43.webp",
  matching: "a67fd6c3d45b63c8f34e39a5dea8f8ed.png",
  drag_drop: "7ff4938f80f89b8a21791ae3d201a5f4.png",
  listening: "8e5757cae684c7eacfb7443c14cdd330.png",
  pronunciation: "703fa3e9006db9a761d4d5213c3bd2f0.png",
  recall: "733b27676bf58853b6acebeed59264ef.png",
  happy: "bde805db24f53a66deb4ebb27c828b6d.png",
  cheer: "ac2043dc49a4f45c8fa8996719ca255e.png",
  oops: "ca7eb57e214f95982b1ec7c97db2ba06.png",
  goodbye: "afcd891e01809cf8a490a080aa9bb8f0.png",
};
const art = (name: string) =>
  `/assets/focus-games/${illustration[name] ?? illustration.happy}`;
type Engine = ReturnType<typeof useFocusSession>;

export function DevFocusGamePage() {
  const { type = "" } = useParams();
  const [params] = useSearchParams();
  const { user } = useApp();
  const resume = params.get("resume");
  if (!focusGamesEnabled(type)) return <LiveGameSessionPage />;
  // Sessions made by earlier clients retain their original engine and semantics.
  if (resume && user && !readFocusCheckpoint(user.id, resume))
    return <LiveGameSessionPage />;
  const key = `${type}:${params.get("language")}:${params.get("items")}:${params.get("pack")}`;
  return <FocusGame key={key} type={type} />;
}

function FocusGame({ type }: { type: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const language = useLearningLanguage();
  const selectedLanguage = params.get("language") || language.code;
  const engine = useFocusSession(type, params, selectedLanguage, (id) => {
    const next = new URLSearchParams(params);
    next.set("resume", id);
    setParams(next, { replace: true });
  });
  const [exit, setExit] = useState(false);
  const returnTo = learningReturn(
    params.get("return"),
    params.has("pack") ? "/word-packs" : "/learn",
  );
  const { state, busy, mode, active, error, pending } = engine;
  const done = new Set(
    state?.outcomes
      .filter((outcome) => outcome.stage === state.stage)
      .map((outcome) => outcome.itemId),
  ).size;
  const total = state?.stageItems.length ?? 0;
  const xp =
    state?.session.status === "completed"
      ? state.session.xpEarned
      : (state?.baselineXp ?? state?.session.xpEarned ?? 0) +
        (state?.outcomes
          .filter(
            (outcome) => !state.baselineAttemptIds?.includes(outcome.attemptId),
          )
          .reduce((sum, outcome) => sum + outcome.xp, 0) ?? 0);
  const outcome = state?.outcomes.find(
    (outcome) => outcome.exerciseId === active?.id,
  );
  const card = engine.cards.find(
    (card) => card.learningItemId === active?.learningItemId,
  );
  const NextArrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;
  const rateShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)))
    )
      return;
    if (
      mode !== "flashcards" ||
      !state?.flipped ||
      !active ||
      outcome ||
      busy ||
      pending ||
      exit
    )
      return;
    const rating = ({ "1": "again", "2": "hard", "3": "good" } as const)[
      event.key as "1" | "2" | "3"
    ];
    if (rating) {
      event.preventDefault();
      void engine.submit(active, { selfRating: rating }).then((receipt) => {
        if (receipt) void engine.advance();
      });
    }
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => rateShortcut(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pending || engine.recording) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [pending, engine.recording]);
  if (!state)
    return (
      <div className="fg-state">
        <RemoteState
          loading={busy || language.loading}
          error={error || language.error}
          retry={engine.retry}
        />
        <Link to={returnTo}>{t("focusGames.back")}</Link>
      </div>
    );
  const hint = (target = active) => {
    if (target && !busy && !pending)
      engine.update((value) => ({
        ...value,
        hintIds: [...new Set([...value.hintIds, target.id])],
      }));
  };
  const feedback = outcome && (
    <AnswerFeedback outcome={outcome} engine={engine} />
  );
  return (
    <div
      className={`fg fx ${state.phase === "play" ? mode : "fg-interlude"}`}
      dir={i18n.dir()}
      aria-busy={busy}
    >
      {state.phase === "play" && (
        <header className="fbar">
          <button
            className="x"
            aria-label={t("focusGames.exit")}
            onClick={() => setExit(true)}
          >
            <X size={24} />
          </button>
          <div
            className="ftrack track"
            role="progressbar"
            aria-label={t("focusGames.progress")}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
          >
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span className="cnt" dir="ltr">
            {Math.min(done + (outcome ? 0 : 1), total)} / {total}
          </span>
          <span className="xpp pill2">
            <Star size={18} fill="currentColor" />
            <span dir="ltr">{xp} XP</span>
          </span>
        </header>
      )}
      {error && (
        <div className="fg-error" role="alert">
          <span>{error}</span>
          <button disabled={busy} onClick={engine.retry}>
            {t("focusGames.retry")}
          </button>
        </div>
      )}
      {pending && !error && (
        <p className="fg-pending" role="status">
          <LoaderCircle className="spin" size={18} />
          {t("focusGames.saving")}
        </p>
      )}
      {state.phase === "transition" && (
        <GameTransition engine={engine} onExit={() => setExit(true)} />
      )}
      {state.phase === "end" && (
        <SessionEnd
          engine={engine}
          returnTo={returnTo}
          restart={() => {
            const next = new URLSearchParams(params);
            next.delete("resume");
            window.location.assign(`/learn/session/${type}?${next}`);
          }}
        />
      )}
      {state.phase === "play" && mode === "flashcards" && active && card && (
        <main className="play">
          <p className="q">
            <img src={art("flashcards")} alt="" />
            {t("focusGames.flashPrompt")}
          </p>
          <div className="stage">
            <button
              className="round"
              aria-label={t("focusGames.previousCard")}
              disabled={
                busy || !!pending || state.exercises.indexOf(active) === 0
              }
              onClick={() =>
                engine.update((value) => ({
                  ...value,
                  activeId:
                    value.exercises[value.exercises.indexOf(active) - 1].id,
                  flipped: false,
                }))
              }
            >
              <ChevronRight className="fg-direction" />
            </button>
            <div className="deck card3d">
              <span className="stack s1" aria-hidden="true" />
              <span className="stack s2" aria-hidden="true" />
              <div className="mover">
                <div className={`flipper${state.flipped ? " on" : ""}`}>
                  <div className="face" aria-hidden={state.flipped}>
                    <button
                      className="spk"
                      tabIndex={state.flipped ? -1 : 0}
                      aria-label={t("focusGames.play")}
                      onClick={() => void engine.play()}
                    >
                      <Volume2 size={22} />
                    </button>
                    <div
                      className="word"
                      dir="auto"
                      lang={card.sourceLanguageCode}
                    >
                      {card.sourceText}
                    </div>
                  </div>
                  <div className="face back" aria-hidden={!state.flipped}>
                    <span className="bdg">{t("focusGames.translation")}</span>
                    <button
                      className="spk"
                      tabIndex={state.flipped ? 0 : -1}
                      aria-label={t("focusGames.play")}
                      onClick={() => void engine.play()}
                    >
                      <Volume2 size={22} />
                    </button>
                    <div
                      className="heb"
                      dir="auto"
                      lang={card.translationLanguageCode}
                    >
                      {card.translationText}
                    </div>
                    <FlashcardMetadata itemId={card.learningItemId} />
                    {card.context && (
                      <div
                        className="bex"
                        dir="auto"
                        lang={card.sourceLanguageCode}
                      >
                        {card.context}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="btn primary flipbtn"
                disabled={busy || !!pending}
                onClick={() =>
                  engine.update((value) => ({
                    ...value,
                    flipped: !value.flipped,
                  }))
                }
              >
                <RotateCcw size={22} />
                {t(
                  state.flipped
                    ? "focusGames.showWord"
                    : "focusGames.showTranslation",
                )}
              </button>
            </div>
            <span className="round ghostr" aria-hidden="true" />
          </div>
          {!state.flipped && !outcome && (
            <div className="rate-wait" role="note">
              <Lightbulb />
              {t("focusGames.rememberFirst")}
            </div>
          )}
          {state.flipped && !outcome && (
            <div className="rate">
              {(["again", "hard", "good"] as const).map((rating, index) => (
                <button
                  key={rating}
                  className={`rating r${index}`}
                  aria-keyshortcuts={String(index + 1)}
                  disabled={busy || !!pending}
                  onClick={async () => {
                    const receipt = await engine.submit(active, {
                      selfRating: rating,
                    });
                    if (receipt) await engine.advance();
                  }}
                >
                  <span>{t(`game.ratings.${rating}`)}</span>
                  <small>{index + 1}</small>
                </button>
              ))}
            </div>
          )}
          {feedback}
        </main>
      )}
      {state.phase === "play" && mode === "matching" && (
        <MatchingGame
          key={state.exercises.map((value) => value.id).join(",")}
          engine={engine}
          hint={hint}
        />
      )}
      {state.phase === "play" && mode === "drag_drop" && active && (
        <ClozeGame
          key={active.id}
          engine={engine}
          hint={() => hint()}
          feedback={feedback}
        />
      )}
      {state.phase === "play" &&
        (mode === "listening" || mode === "recall") &&
        active &&
        card && (
          <WritingGame
            key={active.id}
            engine={engine}
            card={card}
            hint={() => hint()}
            feedback={feedback}
          />
        )}
      {state.phase === "play" && mode === "pronunciation" && active && card && (
        <PronunciationGame
          key={active.id}
          engine={engine}
          card={card}
          feedback={feedback}
        />
      )}
      {exit && (
        <Modal
          open
          title={t("focusGames.leaveTitle")}
          onClose={() => setExit(false)}
        >
          <div className="fg-exit">
            <img src={art("goodbye")} alt="" />
            <p>
              {t(pending ? "focusGames.pendingExit" : "focusGames.savedExit")}
            </p>
            <div className="fg-segments" aria-hidden="true">
              {state.sequence.map((_, index) => (
                <i
                  className={
                    index < state.stage
                      ? "done"
                      : index === state.stage
                        ? "current"
                        : ""
                  }
                  key={index}
                />
              ))}
            </div>
            <button className="fg-primary" onClick={() => setExit(false)}>
              {t("focusGames.keepPlaying")}
              <NextArrow />
            </button>
            <button
              className="fg-secondary"
              disabled={busy || !!pending || engine.recording}
              onClick={() => {
                engine.cancelRecording();
                engine.stopAudio();
                navigate(returnTo);
              }}
            >
              {t("focusGames.saveAndExit")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const focusMetadataSchema = z.object({
  item: detailSchema.pick({ phoneticText: true, partOfSpeech: true }),
});
function FlashcardMetadata({ itemId }: { itemId: string }) {
  const metadata = useResource(
    useCallback(
      () => product(focusMetadataSchema, `learning-items/${itemId}`),
      [itemId],
    ),
  );
  return metadata.data?.item.partOfSpeech ? (
    <div className="pos" dir="auto">
      {metadata.data.item.partOfSpeech}
    </div>
  ) : null;
}

function AnswerFeedback({
  outcome,
  engine,
}: {
  outcome: FocusOutcome;
  engine: Engine;
}) {
  const { t, i18n } = useTranslation();
  const success = remembered(outcome);
  const Arrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;
  return (
    <section
      className={`fg-feedback ${success ? "correct" : "correction"}`}
      role="status"
    >
      <div>
        <strong>
          {t(
            outcome.result === "skipped"
              ? "focusGames.skipped"
              : success
                ? "focusGames.correct"
                : outcome.result === "partially_correct"
                  ? "focusGames.assisted"
                  : "focusGames.correction",
          )}
        </strong>
        {outcome.expectedAnswer && (
          <span dir="auto">{outcome.expectedAnswer}</span>
        )}
        {outcome.score !== null && engine.mode === "pronunciation" && (
          <b>{outcome.score} / 100</b>
        )}
        {outcome.pronunciationFeedback && (
          <p>{outcome.pronunciationFeedback}</p>
        )}
        {outcome.xpKnown !== false && <small dir="ltr">+{outcome.xp} XP</small>}
      </div>
      <button
        className="fg-primary"
        disabled={engine.busy || !!engine.pending}
        onClick={() => void engine.advance()}
      >
        {t("focusGames.continue")}
        <Arrow size={20} />
      </button>
    </section>
  );
}

function MatchingGame({
  engine,
  hint,
}: {
  engine: Engine;
  hint: (target?: Exercise) => void;
}) {
  const { t, i18n } = useTranslation();
  const { state, busy, pending } = engine;
  const [selected, setSelected] = useState<string>();
  const [chosen, setChosen] = useState<string>();
  const board = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<
    Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>
  >([]);
  const exercises = state!.exercises;
  const choices = exercises[0]?.prompt.choices ?? [];
  const outcomes = state!.outcomes.filter((outcome) =>
    exercises.some((exercise) => exercise.id === outcome.exerciseId),
  );
  const resolved = (id: string) =>
    outcomes.find((outcome) => outcome.exerciseId === id);
  const choiceFor = (outcome: FocusOutcome) =>
    choices.find(
      (choice) =>
        choice.text.normalize("NFKC").toLocaleLowerCase() ===
        outcome.expectedAnswer?.normalize("NFKC").toLocaleLowerCase(),
    );
  useLayoutEffect(() => {
    const measure = () => {
      if (!board.current) return;
      const rect = board.current.getBoundingClientRect();
      setLines(
        outcomes.flatMap((outcome) => {
          const choice = choiceFor(outcome);
          const left = board.current?.querySelector(
            `[data-word="${outcome.exerciseId}"] .dot`,
          );
          const right = board.current?.querySelector(
            `[data-meaning="${choice?.id}"] .dot`,
          );
          if (!left || !right) return [];
          const a = left.getBoundingClientRect(),
            b = right.getBoundingClientRect();
          return [
            {
              id: outcome.attemptId,
              x1: a.left + a.width / 2 - rect.left,
              y1: a.top + a.height / 2 - rect.top,
              x2: b.left + b.width / 2 - rect.left,
              y2: b.top + b.height / 2 - rect.top,
            },
          ];
        }),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !board.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(board.current);
    return () => observer.disconnect();
    // Receipt ids are stable and represent the acknowledged pairs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomes.map((outcome) => outcome.attemptId).join(",")]);
  const resolve = async (exerciseId: string, choiceId: string) => {
    if (busy || pending) return;
    const exercise = exercises.find((exercise) => exercise.id === exerciseId);
    if (!exercise || resolved(exerciseId)) return;
    setSelected(exerciseId);
    setChosen(choiceId);
    const receipt = await engine.submit(exercise, { choiceId });
    if (receipt) {
      setSelected(undefined);
      setChosen(undefined);
    }
  };
  const pointer = useRef<string | undefined>(undefined);
  const onPointerUp = (event: React.PointerEvent, meaningId?: string) => {
    const source = pointer.current;
    pointer.current = undefined;
    if (!source) return;
    const hit = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-meaning]");
    const target = meaningId ?? hit?.dataset.meaning;
    if (target) void resolve(source, target);
  };
  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selected,
  );
  const hinted =
    selectedExercise && state!.hintIds.includes(selectedExercise.id)
      ? engine.cards.find(
          (card) => card.learningItemId === selectedExercise.learningItemId,
        )?.translationText
      : undefined;
  const sourceCode = engine.cards[0]?.sourceLanguageCode;
  const targetCode = engine.cards[0]?.translationLanguageCode;
  const languageName = (code?: string) =>
    code
      ? new Intl.DisplayNames([i18n.language], { type: "language" }).of(code)
      : "";
  return (
    <main className="fplay">
      <div className="stage">
        <div className="head">
          <h1>{t("focusGames.matchPrompt")}</h1>
          <span className="cat">
            <Tag size={18} />
            {state!.session.scope?.title ?? t("focusGames.yourWords")} ·{" "}
            {t("focusGames.board", {
              current:
                Math.ceil(
                  state!.outcomes.filter(
                    (outcome) =>
                      outcome.stage === state!.stage &&
                      !exercises.some(
                        (exercise) => exercise.id === outcome.exerciseId,
                      ),
                  ).length / 5,
                ) + 1,
            })}
          </span>
        </div>
        <div className="bwrap">
          <div className="colhead">
            <span className="lab">
              <i>{targetCode === "he" ? "א" : targetCode?.toUpperCase()}</i>
              {languageName(targetCode)}
            </span>
            <span />
            <span className="lab en">
              <i>{sourceCode === "he" ? "א" : sourceCode?.toUpperCase()}</i>
              {languageName(sourceCode)}
            </span>
          </div>
          <div className="board" ref={board}>
            <div className="col">
              {choices.map((choice) => {
                const outcome = outcomes.find(
                  (outcome) => choiceFor(outcome)?.id === choice.id,
                );
                return (
                  <div
                    data-meaning={choice.id}
                    key={choice.id}
                    className={`item he ${outcome ? `matched ok c${outcomes.indexOf(outcome) % 4}${remembered(outcome) ? "" : " bad"}` : ""} ${chosen === choice.id ? "sel" : ""} ${hinted === choice.text ? "hint" : ""}`}
                    onPointerUp={(event) => onPointerUp(event, choice.id)}
                  >
                    <button
                      className="t"
                      disabled={!!outcome || busy || !!pending}
                      aria-pressed={chosen === choice.id}
                      onClick={() => {
                        setChosen(choice.id);
                        if (selected) void resolve(selected, choice.id);
                      }}
                    >
                      <span className="w" dir="auto">
                        {choice.text}
                      </span>
                      <span className="dot">
                        {outcome && <Check size={15} />}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mid" />
            <div
              className={`col ${choices.length > exercises.length ? "pad" : ""}`}
            >
              {exercises.map((exercise) => {
                const outcome = resolved(exercise.id);
                return (
                  <div
                    data-word={exercise.id}
                    key={exercise.id}
                    className={`item ${outcome ? `matched ok c${outcomes.indexOf(outcome) % 4}${remembered(outcome) ? "" : " bad"}` : ""} ${selected === exercise.id ? "sel" : ""}`}
                  >
                    <button
                      className="t"
                      disabled={!!outcome || busy || !!pending}
                      aria-pressed={selected === exercise.id}
                      onPointerDown={(event) => {
                        pointer.current = exercise.id;
                        event.currentTarget.setPointerCapture?.(
                          event.pointerId,
                        );
                      }}
                      onPointerUp={onPointerUp}
                      onPointerCancel={() => {
                        pointer.current = undefined;
                      }}
                      onLostPointerCapture={() => {
                        pointer.current = undefined;
                      }}
                      onClick={() => {
                        setSelected(exercise.id);
                        if (chosen) void resolve(exercise.id, chosen);
                      }}
                    >
                      <span className="dot">
                        {outcome && <Check size={15} />}
                      </span>
                      <span className="w en" dir="auto">
                        {exercise.prompt.text}
                      </span>
                    </button>
                    <button
                      className="spk"
                      aria-label={`${t("focusGames.play")} ${exercise.prompt.text}`}
                      onClick={() => void engine.play(exercise)}
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
            <svg className="fg-connections" aria-hidden="true">
              {lines.map((line, index) => (
                <path
                  key={line.id}
                  d={`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke={
                    ["#3b82f6", "#8b5cf6", "#e58a00", "#db2777"][index % 4]
                  }
                  strokeOpacity="0.4"
                  strokeWidth="4"
                />
              ))}
            </svg>
          </div>
        </div>
        <div className="foot">
          <div className="tools">
            <button
              className="ghost"
              disabled={!selected || busy || !!pending}
              onClick={() => hint(selectedExercise)}
            >
              <Lightbulb size={20} />
              {t("focusGames.hint")}
            </button>
            <span>{t("focusGames.matchHelp")}</span>
          </div>
          <div className="coach">
            <img className="fg-board-mascot" src={art("matching")} alt="" />
            {selected && (
              <span className="bub" dir="auto">
                {t("focusGames.chooseMeaning")}
              </span>
            )}
          </div>
        </div>
        <div role="status" className="fg-match-feedback">
          {outcomes.at(-1) && !remembered(outcomes.at(-1)!) && (
            <span>
              {t("focusGames.correction")}{" "}
              <b dir="auto">{outcomes.at(-1)!.expectedAnswer}</b>
            </span>
          )}
        </div>
        <div role="status" className="sr">
          {outcomes.length
            ? t("focusGames.pairsDone", { count: outcomes.length })
            : ""}
        </div>
        {outcomes.length === exercises.length && (
          <button
            className="fg-primary fg-board-next"
            disabled={busy}
            onClick={() => void engine.advance()}
          >
            {t("focusGames.continue")}
            <ArrowLeft />
          </button>
        )}
      </div>
    </main>
  );
}

function ClozeGame({
  engine,
  hint,
  feedback,
}: {
  engine: Engine;
  hint: () => void;
  feedback: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { active, state, busy, pending } = engine;
  const exercise = active!;
  const outcome = state!.outcomes.find(
    (outcome) => outcome.exerciseId === exercise.id,
  );
  const card = engine.cards.find(
    (card) => card.learningItemId === exercise.learningItemId,
  );
  const choices = exercise.prompt.choices ?? [];
  const correctChoice = choices.find(
    (choice) =>
      choice.text.normalize("NFKC").toLocaleLowerCase() ===
      card?.sourceText.normalize("NFKC").toLocaleLowerCase(),
  );
  // Keep the original four-tile composition while retaining only server-issued ids.
  const visibleChoices =
    correctChoice && choices.length > 4
      ? choices.filter(
          (choice) =>
            choice.id === correctChoice.id ||
            choices
              .filter((other) => other.id !== correctChoice.id)
              .slice(0, 3)
              .some((other) => other.id === choice.id),
        )
      : choices;
  const context = exercise.prompt.context;
  const parts = context?.split(/(_{2,}|\[…\]|\[\.\.\.\])/u);
  const gapIndex =
    parts?.findIndex((part) => /^_{2,}$|^\[(?:…|\.\.\.)\]$/u.test(part)) ?? -1;
  const target = useRef<HTMLSpanElement>(null);
  const drag = useRef<
    { id: string; startX: number; startY: number; moved: boolean } | undefined
  >(undefined);
  const suppress = useRef(false);
  const [ghost, setGhost] = useState<{ text: string; x: number; y: number }>();
  const choose = (choiceId: string) => {
    if (
      !busy &&
      !pending &&
      !outcome &&
      exercise.prompt.choices?.some((choice) => choice.id === choiceId)
    )
      void engine.submit(exercise, { choiceId });
  };
  const pointerUp = (event: React.PointerEvent) => {
    const value = drag.current;
    drag.current = undefined;
    setGhost(undefined);
    if (!value?.moved) return;
    suppress.current = true;
    const rect = target.current?.getBoundingClientRect();
    if (
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    )
      choose(value.id);
  };
  const gap = (
    <span
      className="gap"
      ref={target}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        choose(event.dataTransfer.getData("text/plain"));
      }}
    >
      {outcome?.expectedAnswer ?? <span aria-hidden="true">?</span>}
    </span>
  );
  return (
    <main className="fplay">
      <div className="stage">
        <div className="head">
          <h1>{t("focusGames.dragPrompt")}</h1>
          <span className="cat">
            {t("focusGames.sentence", {
              current: state!.stageItems.indexOf(exercise.learningItemId) + 1,
              total: state!.stageItems.length,
            })}
          </span>
        </div>
        <div className={`deck ${outcome ? "ok" : ""}`}>
          <img
            className="mochi"
            src={art(
              outcome ? (remembered(outcome) ? "happy" : "oops") : "drag_drop",
            )}
            alt=""
          />
          <span className="bub">
            {t(outcome ? "focusGames.correctForm" : "focusGames.dragQuestion")}
          </span>
          <div
            className={`card ${outcome ? (remembered(outcome) ? "solved" : "bad") : ""}`}
          >
            <button
              className="say"
              disabled={!outcome}
              aria-label={t("focusGames.playSentence")}
              onClick={engine.playSentence}
            >
              <Volume2 />
            </button>
            <p className="sen" dir="auto" lang={card?.sourceLanguageCode}>
              {gapIndex >= 0 ? (
                parts!.map((part, index) =>
                  index === gapIndex ? (
                    <span key={index}>{gap}</span>
                  ) : /^_{2,}$|^\[(?:…|\.\.\.)\]$/u.test(part) ? (
                    <span key={index}>…</span>
                  ) : (
                    <span key={index}>{part}</span>
                  ),
                )
              ) : (
                <>
                  <span dir="auto">{exercise.prompt.text}</span>
                  {gap}
                </>
              )}
            </p>
            <div className={`heb ${outcome ? "on" : ""}`} dir="auto">
              {outcome ? (
                (card?.translationText ?? exercise.prompt.text)
              ) : (
                <span className="lock">
                  {t(
                    gapIndex >= 0
                      ? "focusGames.translationLocked"
                      : "focusGames.translationPrompt",
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="tray">
          <div className="tray-l">
            <GripVertical size={18} />
            {t("focusGames.dragHelp")}
          </div>
          <div className="tiles">
            {visibleChoices.map((choice, index) => (
              <button
                key={choice.id}
                className={`tile c${index % 4} ${state!.hintIds.includes(exercise.id) && card?.sourceText === choice.text ? "hint" : ""}`}
                disabled={busy || !!pending || !!outcome}
                draggable={false}
                onPointerDown={(event) => {
                  if (busy || pending || outcome) return;
                  drag.current = {
                    id: choice.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    moved: false,
                  };
                  suppress.current = false;
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const value = drag.current;
                  if (!value) return;
                  if (
                    Math.hypot(
                      event.clientX - value.startX,
                      event.clientY - value.startY,
                    ) > 6
                  )
                    value.moved = true;
                  if (value.moved)
                    setGhost({
                      text: choice.text,
                      x: event.clientX,
                      y: event.clientY,
                    });
                }}
                onPointerUp={pointerUp}
                onPointerCancel={() => {
                  drag.current = undefined;
                  setGhost(undefined);
                }}
                onLostPointerCapture={() => {
                  drag.current = undefined;
                  setGhost(undefined);
                }}
                onClick={() => {
                  if (!suppress.current) choose(choice.id);
                  suppress.current = false;
                }}
              >
                <GripVertical className="grip" size={18} />
                <span dir="auto">{choice.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tools">
          <button
            className="ghost"
            disabled={busy || !!pending || !!outcome}
            onClick={hint}
          >
            <Lightbulb size={20} />
            {t("focusGames.hint")}
          </button>
        </div>
        {feedback}
      </div>
      {ghost &&
        createPortal(
          <div
            className="fg-drag-ghost"
            style={{ left: ghost.x, top: ghost.y }}
          >
            {ghost.text}
          </div>,
          document.body,
        )}
    </main>
  );
}

function WritingGame({
  engine,
  card,
  hint,
  feedback,
}: {
  engine: Engine;
  card: StudyCard;
  hint: () => void;
  feedback: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { active, state, busy, pending, mode } = engine;
  const exercise = active!;
  const outcome = state!.outcomes.find(
    (outcome) => outcome.exerciseId === exercise.id,
  );
  const listening = mode === "listening";
  const bank = listening ? listeningLetters(card, exercise.id) : [];
  const [used, setUsed] = useState<number[]>([]);
  const lengths = exercise.prompt.wordLengths;
  const wordLength = exercise.prompt.letterCount ?? 20;
  const write = (answer: string) => {
    engine.update((value) => ({ ...value, answer }));
  };
  const add = (letter: string, index: number) => {
    if (busy || pending || outcome) return;
    const chars = [...state!.answer.replace(/\s/gu, ""), letter];
    const groups = lengths ?? [wordLength];
    let offset = 0;
    const next = groups
      .map((length) => {
        const value = chars.slice(offset, offset + length).join("");
        offset += length;
        return value;
      })
      .filter(Boolean)
      .join(" ");
    setUsed((value) => [...value, index]);
    write(next);
  };
  const remainingTries = Math.max(
    0,
    2 -
      state!.outcomes.filter(
        (value) =>
          value.stage === state!.stage &&
          value.itemId === card.learningItemId &&
          !remembered(value) &&
          value.result !== "skipped",
      ).length,
  );
  return (
    <main className="fplay">
      <div className="head">
        <h1>
          <Headphones size={26} />
          {t(listening ? "focusGames.listenPrompt" : "focusGames.writePrompt")}
        </h1>
        <button
          className="hpill ghost"
          disabled={busy || !!pending || !!outcome}
          onClick={hint}
        >
          <Lightbulb size={20} />
          {t("focusGames.hint")}
        </button>
      </div>
      <section
        className={`stage ${outcome ? "ans" : ""}`}
        aria-label={t("focusGames.game")}
      >
        <div className="prow">
          {listening ? (
            <div className="player cue">
              <button
                className="playbtn"
                aria-label={t("focusGames.play")}
                onClick={() => void engine.play()}
              >
                <Volume2 size={30} />
              </button>
              <div className="wave" aria-hidden="true">
                {Array.from({ length: 40 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${12 + ((index * 17 + 9) % 38)}px`,
                      animationDelay: `${index * 0.025}s`,
                    }}
                  />
                ))}
              </div>
              <button
                className="slowbtn"
                aria-label={t("focusGames.slow")}
                onClick={() => void engine.play(active, true)}
              >
                {t("focusGames.slowLabel")}
              </button>
            </div>
          ) : (
            <div className="noaud">
              <span className="nl">{t("focusGames.writeTranslation")}</span>
              <span className="nw" dir="auto">
                {exercise.prompt.text}
              </span>
            </div>
          )}
          <div className="gmochi">
            <img
              src={art(
                outcome
                  ? remembered(outcome)
                    ? "happy"
                    : "oops"
                  : listening
                    ? "listening"
                    : "recall",
              )}
              alt=""
            />
          </div>
        </div>
        {state!.hintIds.includes(exercise.id) && (
          <p className="fg-hint" role="status" dir="auto">
            {t("focusGames.assistance")}{" "}
            {listening
              ? card.translationText
              : card.context || card.sourceText.slice(0, 1)}
          </p>
        )}
        {!outcome && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (state!.answer.trim())
                void engine.submit(exercise, { answerText: state!.answer });
            }}
          >
            <LetterBoxesInput
              value={state!.answer}
              length={wordLength}
              wordLengths={lengths}
              onChange={(value) => {
                setUsed([]);
                write(value);
              }}
              label={t("focusGames.answerLabel")}
              language={card.sourceLanguageCode}
              disabled={busy || !!pending}
              autoFocus
            />
            <div className="meta">
              <span
                className="lives"
                aria-label={t("focusGames.tries", { count: remainingTries })}
              >
                <span className="ll">{t("focusGames.attempts")}</span>
                {[0, 1].map((index) => (
                  <i
                    key={index}
                    className={index >= remainingTries ? "gone" : ""}
                  />
                ))}
              </span>
              <span className="typehint">{t("focusGames.keyboardHelp")}</span>
            </div>
            {!!bank.length && (
              <div className="tiles fg-letter-tray" dir="ltr">
                {bank.map((letter, index) => (
                  <button
                    className="tile"
                    key={index}
                    type="button"
                    disabled={
                      used.includes(index) ||
                      busy ||
                      !!pending ||
                      [...state!.answer.replace(/\s/gu, "")].length >=
                        (lengths?.reduce((sum, length) => sum + length, 0) ??
                          wordLength)
                    }
                    onClick={() => add(letter, index)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            )}
            <button
              className={`fg-primary fg-check ${!state!.answer.trim() ? "fg-check-empty" : ""}`}
              disabled={!state!.answer.trim() || busy || !!pending}
            >
              {t("focusGames.check")}
            </button>
          </form>
        )}
        {feedback}
        {outcome &&
          listening &&
          !remembered(outcome) &&
          outcome.result !== "skipped" &&
          remainingTries > 0 && (
            <button
              className="fg-secondary"
              disabled={busy || !!pending}
              onClick={() => void engine.retryExercise()}
            >
              {t("focusGames.tryWordAgain")}
            </button>
          )}
      </section>
      <button
        className="skip"
        disabled={busy || !!pending || !!outcome}
        onClick={() => void engine.submit(exercise, { skipped: true })}
      >
        <EarOff size={19} />
        {t(listening ? "focusGames.cannotListen" : "focusGames.skip")}
      </button>
    </main>
  );
}

function PronunciationGame({
  engine,
  card,
  feedback,
}: {
  engine: Engine;
  card: StudyCard;
  feedback: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { active, state, busy, pending, recording } = engine;
  const exercise = active!;
  const outcome = state!.outcomes.find(
    (value) => value.exerciseId === exercise.id,
  );
  const metadata = useResource(
    useCallback(
      () =>
        product(focusMetadataSchema, `learning-items/${card.learningItemId}`),
      [card.learningItemId],
    ),
  );
  return (
    <main className="fplay">
      <div className="head">
        <h1>
          <Mic size={25} />
          {t("focusGames.sayPrompt")}
        </h1>
      </div>
      <section className="stage" aria-label={t("focusGames.game")}>
        <div className="wcard">
          <div className="wbtns">
            <button
              className="wplay"
              disabled={recording}
              aria-label={t("focusGames.play")}
              onClick={() => void engine.play()}
            >
              <Volume2 size={30} />
            </button>
            <button
              className="slowb"
              disabled={recording}
              aria-label={t("focusGames.slow")}
              onClick={() => void engine.play(active, true)}
            >
              {t("focusGames.slowLabel")}
            </button>
          </div>
          <div className="wtxt">
            <div className="wword" dir="auto" lang={card.sourceLanguageCode}>
              {card.sourceText}
            </div>
            <div className="wsub">
              {metadata.data?.item.phoneticText && (
                <span className="ipa" dir="ltr">
                  {metadata.data.item.phoneticText}
                </span>
              )}
              <span dir="auto">{card.translationText}</span>
            </div>
          </div>
        </div>
        {!outcome && (
          <div className="fg-microphone-row">
            <div className="gmochi">
              <span className="gsay">
                {t(
                  recording ? "focusGames.listeningNow" : "focusGames.yourTurn",
                )}
              </span>
              <img
                src={art(recording ? "listening" : "pronunciation")}
                alt=""
              />
            </div>
            <div className="micbox">
              <button
                className={`mic ${recording ? "rec" : ""}`}
                aria-label={t(
                  recording
                    ? "focusGames.stopRecording"
                    : "focusGames.startRecording",
                )}
                aria-pressed={recording}
                disabled={busy || !!pending}
                onClick={() =>
                  recording
                    ? engine.stopRecording()
                    : void engine.record(exercise)
                }
              >
                {recording ? <Check size={34} /> : <Mic size={34} />}
              </button>
              <span className="mlbl">
                {t(
                  recording
                    ? "focusGames.stopWhenDone"
                    : "focusGames.tapAndSay",
                )}
              </span>
            </div>
          </div>
        )}
        {feedback}
      </section>
      <button
        className="skip"
        disabled={busy || !!pending || recording || !!outcome}
        onClick={() => void engine.submit(exercise, { skipped: true })}
      >
        <MicOff size={19} />
        {t("focusGames.cannotSpeak")}
      </button>
    </main>
  );
}

function GameTransition({
  engine,
  onExit,
}: {
  engine: Engine;
  onExit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { state, mode, busy } = engine;
  const value = state!;
  const stats = stageSummary(value.outcomes, value.stage);
  const next = value.sequence[value.stage + 1];
  const Arrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;
  const elapsed = Math.max(
    0,
    (Date.now() - Date.parse(value.session.startedAt)) / 1000,
  );
  const mistakes = reviewItems(value.outcomes);
  const allowReview =
    value.type === "smart" &&
    value.stage === value.sequence.length - 1 &&
    mistakes.length > 0;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <main className="fg-transition">
      <header>
        <button
          className="fg-close"
          aria-label={t("focusGames.saveAndExit")}
          onClick={onExit}
        >
          <X />
        </button>
        <div
          className="fg-segments"
          aria-label={t("focusGames.gameCount", {
            current: value.stage + 1,
            total: value.sequence.length,
          })}
        >
          {value.sequence.map((_, index) => (
            <i
              className={
                index < value.stage
                  ? "done"
                  : index === value.stage
                    ? "current"
                    : ""
              }
              key={index}
            />
          ))}
          <b>
            {t("focusGames.gameCount", {
              current: value.stage + 1,
              total: value.sequence.length,
            })}
          </b>
        </div>
        <span />
      </header>
      <div className="fg-transition-center">
        <section className="fg-transition-card">
          <div className="fg-transition-summary">
            <img
              className="fg-transition-confetti"
              src="/assets/focus-games/transition-confetti.svg"
              alt=""
            />
            <div className="fg-done-heading">
              <span className="fg-done-badge">
                <Check size={32} />
              </span>
              <div>
                <span>
                  {t("focusGames.finished", {
                    game: t(`focusGames.names.${mode}`),
                  })}
                </span>
                <h1 tabIndex={-1} ref={heading}>
                  {t(
                    stats.correct
                      ? "focusGames.wellDone"
                      : "focusGames.keepGoing",
                  )}
                </h1>
              </div>
            </div>
            <div className="fg-summary-stats">
              <SummaryStat
                icon={<CheckCircle2 />}
                value={`${stats.correct}/${stats.total}`}
                label={t(`focusGames.scoreLabels.${mode}`)}
              />
              <SummaryStat
                icon={<RotateCcw />}
                value={stats.review}
                label={t("focusGames.wordsReview")}
              />
              <SummaryStat
                icon={<Clock3 />}
                value={formatPracticeTime(elapsed)}
                label={t("focusGames.sessionTime")}
              />
            </div>
            {stats.skipped > 0 && (
              <small>
                {t("focusGames.skippedCount", { count: stats.skipped })}
              </small>
            )}
          </div>
          <div className="fg-next-up">
            <div>
              <span>
                {t(
                  next ? "focusGames.nextGame" : "focusGames.sessionComplete",
                  { current: value.stage + 2, total: value.sequence.length },
                )}
              </span>
              <h2>
                {t(next ? `focusGames.names.${next}` : "focusGames.summary")}
              </h2>
              <p>
                {next
                  ? t(`focusGames.descriptions.${next}`, {
                      count: engine.cards.length,
                    })
                  : t("focusGames.endDescription")}
              </p>
            </div>
            <img src={art(next || "cheer")} alt="" />
          </div>
          <div className="fg-transition-actions">
            <button
              className="fg-primary"
              disabled={busy}
              onClick={() => void engine.nextStage()}
            >
              {t(next ? "focusGames.continue" : "focusGames.finish")}
              <Arrow />
            </button>
            <button
              className="fg-secondary"
              disabled={
                busy ||
                value.sequence.length >= 99 ||
                value.outcomes.length >= 900
              }
              onClick={() => void engine.nextStage(true)}
            >
              <RotateCcw size={20} />
              {t("focusGames.playAgain", {
                game: t(`focusGames.names.${mode}`),
              })}
            </button>
          </div>
          {allowReview && (
            <button
              className="fg-review-link"
              disabled={
                busy ||
                value.sequence.length >= 99 ||
                value.outcomes.length >= 900
              }
              onClick={() => void engine.nextStage(false, true)}
            >
              {t("focusGames.reviewMistakes", { count: mistakes.length })}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="fg-summary-stat">
      <span>{icon}</span>
      <div>
        <b dir="ltr">{value}</b>
        <small>{label}</small>
      </div>
    </div>
  );
}

function SessionEnd({
  engine,
  returnTo,
  restart,
}: {
  engine: Engine;
  returnTo: string;
  restart: () => void;
}) {
  const { t } = useTranslation();
  const { state } = engine;
  const value = state!;
  const dashboard = useResource(
    useCallback(
      () =>
        product(
          dashboardSchema,
          `dashboard?sourceLanguageCode=${encodeURIComponent(value.language)}`,
        ),
      [value.language],
    ),
  );
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const [phase, setPhase] = useState<"eat" | "gift" | "open" | "summary">(() =>
    reducedMotion ? "summary" : "eat",
  );
  const [pose, setPose] = useState("open");
  const [taps, setTaps] = useState(0);
  const unique = [
    ...new Set(
      value.outcomes.filter(remembered).map((outcome) => outcome.itemId),
    ),
  ];
  const words = engine.cards.filter((card) =>
    unique.includes(card.learningItemId),
  );
  const mistakes = reviewItems(value.outcomes);
  const hard = engine.cards.find((card) =>
    mistakes.includes(card.learningItemId),
  );
  useEffect(() => {
    if (phase === "eat") {
      const chew = setInterval(
        () => setPose((current) => (current === "open" ? "chew" : "open")),
        380,
      );
      const end = setTimeout(
        () => {
          setPose("offer");
          setPhase("gift");
        },
        Math.min(5200, 1400 + words.length * 360),
      );
      return () => {
        clearInterval(chew);
        clearTimeout(end);
      };
    }
    if (phase === "open") {
      const timer = setTimeout(() => {
        setPose("happy");
        setPhase("summary");
      }, 2100);
      return () => clearTimeout(timer);
    }
  }, [phase, words.length]);
  const poses: Record<string, string> = {
    idle: "8e3e5c5a68d9affb2d505020c26f2d76.webp",
    open: "3995fa955c94b3521848220031ff0b27.webp",
    chew: "6f956f164254522fcbb1984b7d4ea49d.webp",
    happy: "2b2e2ca4c1c96c31d17cc3a233f0ca8c.webp",
    offer: "242f0b4cc00ecadfbf14dfd36a7d6190.webp",
  };
  const asset = (name: string) => `/assets/focus-games/${name}`;
  const coin = asset("a6601c0e7dc803a950a409cbf6eb05bc.webp"),
    gift = asset("b5ee702ebdb675796fb5e33a2541719c.webp");
  const xp = value.session.xpEarned;
  const accuracy = value.session.attemptCount
    ? Math.round(
        (value.session.correctCount / value.session.attemptCount) * 100,
      )
    : 0;
  const gamification = dashboard.data?.gamification;
  return (
    <main className="fg-session-end">
      <header className="bar">
        <Link className="x" to={returnTo} aria-label={t("focusGames.back")}>
          <X size={22} />
        </Link>
        {phase !== "summary" ? (
          <button
            className="skip"
            onClick={() => {
              setPose("happy");
              setPhase("summary");
            }}
          >
            {t("focusGames.skipAnimation")}
          </button>
        ) : (
          <span style={{ marginInlineStart: "auto" }} />
        )}
        {gamification && (
          <span className="pill fl">
            <Flame fill="#ff8a4c" size={20} />
            <b>{gamification.currentStreakDays}</b>
          </span>
        )}
        <span className="pill xpp">
          <img src={coin} alt="" />
          <b className="en">{xp} XP</b>
        </span>
      </header>
      <div className="stage">
        <div
          className={`halo${phase === "open" || phase === "summary" ? " on" : ""}`}
          aria-hidden="true"
        >
          <div className="rays" />
        </div>
        <span className="shadow" aria-hidden="true" />
        <div
          className={`mochi${phase === "eat" ? " gulp" : " idle"}`}
          style={{
            transform: `scale(${phase === "gift" || phase === "open" ? 0.82 : 1})`,
          }}
        >
          <img
            className="pose"
            src={asset(poses[phase === "summary" ? "idle" : pose])}
            alt={t("focusGames.mochi")}
          />
        </div>
        {phase === "eat" &&
          words.slice(0, 8).map((card, index) => (
            <span
              className="wf"
              key={card.learningItemId}
              style={
                {
                  "--sd": index % 2 ? 1 : -1,
                  "--rw": Math.floor(index / 2) - 1.5,
                  "--a": `${0.1 + index * 0.07}s`,
                  "--d": `${0.9 + index * 0.36}s`,
                  "--bg": ["#fff", "#fdf2d2", "#e3f4ec", "#e8f0fe"][index % 4],
                } as CSSProperties
              }
              dir="auto"
            >
              {card.sourceText}
            </span>
          ))}
        {phase === "gift" && (
          <button
            className={`gift wait${taps ? ` h${taps}` : ""}`}
            aria-label={t("focusGames.openSummary")}
            onClick={() => {
              const count = taps + 1;
              setTaps(count);
              if (count >= 3) setPhase("open");
            }}
          >
            <img src={gift} alt="" />
          </button>
        )}
        {phase === "open" && (
          <>
            <img className="lid" src={gift} alt="" />
            <img
              className="box"
              src={asset("a41b1c0f865edef1f2f12d91422139fb.webp")}
              alt=""
            />
            <div className="xpbig">
              <img src={coin} alt="" />
              <span className="en">{xp}</span>
            </div>
          </>
        )}
      </div>
      <div className="msg" aria-live="polite">
        <h1>
          {t(
            phase === "eat"
              ? "focusGames.sessionComplete"
              : phase === "gift"
                ? "focusGames.summaryReady"
                : phase === "open"
                  ? "focusGames.earned"
                  : "focusGames.wellDone",
          )}
        </h1>
        <p>
          {phase === "gift"
            ? t("focusGames.tapGift", { count: 3 - taps })
            : phase === "eat"
              ? t("focusGames.practicedWords", { count: unique.length })
              : phase === "open"
                ? `+${xp} XP`
                : t("focusGames.serverTotals", {
                    correct: value.session.correctCount,
                    count: value.session.attemptCount,
                    time: formatPracticeTime(
                      value.session.durationSeconds ?? 0,
                    ),
                  })}
        </p>
        {phase === "gift" && (
          <div className="taps" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span className={index < taps ? "on" : ""} key={index} />
            ))}
          </div>
        )}
      </div>
      {phase === "summary" && (
        <section className="sum" aria-label={t("focusGames.summary")}>
          <div className="level">
            {gamification && (
              <>
                <span className="lv">
                  {t("focusGames.level", { level: gamification.level })}
                </span>
                <div
                  className="lbar"
                  role="progressbar"
                  aria-label={t("focusGames.earned")}
                  aria-valuemin={0}
                  aria-valuemax={gamification.nextLevelXp}
                  aria-valuenow={Math.min(
                    gamification.totalXp,
                    gamification.nextLevelXp,
                  )}
                >
                  <span
                    style={{
                      width: `${gamification.nextLevelXp ? Math.min(100, (gamification.totalXp / gamification.nextLevelXp) * 100) : 100}%`,
                    }}
                  />
                </div>
                <span className="lv">
                  {t("focusGames.level", { level: gamification.level + 1 })}
                </span>
                <small dir="ltr">
                  {gamification.totalXp} / {gamification.nextLevelXp} XP
                </small>
              </>
            )}
            <span className="earned en">+{xp} XP</span>
          </div>
          <div className="cards">
            <div className="card" style={{ "--d": ".05s" } as CSSProperties}>
              <span className="k">{t("focusGames.practiced")}</span>
              <div className="vis">
                <span className="v">{unique.length}</span>
              </div>
              <small>{t("focusGames.endDescription")}</small>
            </div>
            <div className="card" style={{ "--d": ".18s" } as CSSProperties}>
              <span className="k">{t("focusGames.accuracy")}</span>
              <div className="vis">
                <div className="ring">
                  <svg viewBox="0 0 84 84" aria-hidden="true">
                    <circle
                      cx="42"
                      cy="42"
                      r="38"
                      fill="none"
                      stroke="#e2f3ec"
                      strokeWidth="8"
                    />
                    <circle
                      cx="42"
                      cy="42"
                      r="38"
                      fill="none"
                      stroke="#22c08a"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="238.8"
                      strokeDashoffset={238.8 * (1 - accuracy / 100)}
                    />
                  </svg>
                  <b>{accuracy}%</b>
                </div>
              </div>
              <small>
                {value.session.correctCount} / {value.session.attemptCount}
              </small>
            </div>
            {gamification && (
              <div className="card" style={{ "--d": ".31s" } as CSSProperties}>
                <span className="k">{t("focusGames.streak")}</span>
                <div className="vis flame">
                  <Flame size={34} fill="#ff8a4c" />
                  <span className="v">{gamification.currentStreakDays}</span>
                </div>
                <small>{t("focusGames.keepGoing")}</small>
              </div>
            )}
          </div>
          {hard && (
            <div className="hard">
              <button
                className="spk"
                aria-label={t("focusGames.play")}
                onClick={() => void engine.playCard(hard)}
              >
                <Volume2 size={20} />
              </button>
              <span className="t">
                {t("focusGames.wordReview")}{" "}
                <b className="en" dir="auto">
                  {hard.sourceText}
                </b>{" "}
                · <span dir="auto">{hard.translationText}</span>
              </span>
            </div>
          )}
          <div className="acts">
            <button className="cta" onClick={restart}>
              <Play size={22} fill="currentColor" />
              {t("focusGames.anotherSession")}
            </button>
            <Link className="sec" to={returnTo}>
              {t("focusGames.back")}
            </Link>
          </div>
          <button
            className="replay"
            onClick={() => {
              setTaps(0);
              setPose("open");
              setPhase(reducedMotion ? "summary" : "eat");
            }}
          >
            {t("focusGames.replayAnimation")}
          </button>
        </section>
      )}
    </main>
  );
}
