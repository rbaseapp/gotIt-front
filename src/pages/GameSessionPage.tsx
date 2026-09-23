import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Clock3,
  Headphones,
  Lightbulb,
  Mic2,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useApp } from "../context/AppContext";
import { cn, shuffle, speak } from "../lib/utils";
import {
  answerQuality,
  gameSkills,
  normalizeAnswer,
  practiceQueue,
} from "../lib/practice";
import { CapabilityNotice } from "../components/CapabilityNotice";
import { LetterBoxesInput } from "../components/LetterBoxesInput";
import type {
  Attempt,
  GameType,
  LearningItem,
  PracticeSession,
} from "../types";
import { useTranslation } from "react-i18next";

const gameTypes = new Set<GameType>([
  "smart",
  "flashcards",
  "recall",
  "listening",
  "matching",
  "pronunciation",
]);
type Outcome = {
  score: number;
  userAnswer?: string;
  hintsUsed?: number;
  selfRating?: Attempt["selfRating"];
  result?: Attempt["result"];
  direction?: Attempt["direction"];
  skills?: Attempt["skills"];
};
type ScoreHandler = (outcome: Outcome) => void;

function Feedback({
  score,
  answer,
  onNext,
  disabled = false,
}: {
  score: number;
  answer: string;
  onNext: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn("answer-feedback", score >= 60 ? "correct" : "wrong")}
      role="status"
    >
      <span className="feedback-icon">
        {score >= 60 ? <Check size={24} /> : <X size={24} />}
      </span>
      <div>
        <b>
          {score === 100
            ? t("demoGame.feedback.exact")
            : score >= 60
              ? t("demoGame.feedback.almost")
              : t("demoGame.feedback.tryAgain")}
        </b>
        <strong dir="auto">{answer}</strong>
      </div>
      <button className="button primary" disabled={disabled} onClick={onNext}>
        {t("demoGame.continue")} <ArrowLeft size={18} />
      </button>
    </div>
  );
}

function Flashcard({
  item,
  onScore,
}: {
  item: LearningItem;
  onScore: ScoreHandler;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [reverse, setReverse] = useState(false);
  return (
    <div className="exercise-area">
      <button
        className="button ghost direction-toggle"
        onClick={() => {
          setReverse((value) => !value);
          setRevealed(false);
        }}
      >
        <RotateCcw size={15} />
        {reverse ? t("demoGame.meaningToWord") : t("demoGame.wordToMeaning")}
      </button>
      <div className={cn("flashcard", revealed && "revealed")}>
        <span className="exercise-label">
          {reverse ? t("demoGame.whichWord") : t("game.whatMeaning")}
        </span>
        <button
          className="sound-button"
          aria-label={t("demoGame.playWord")}
          onClick={() => speak(item.source, item.sourceLanguage)}
        >
          <Volume2 size={19} />
        </button>
        <h1 dir="auto">{reverse ? item.translation : item.source}</h1>
        {!reverse && (
          <span className="phonetic" dir="ltr">
            {item.phonetic}
          </span>
        )}
        {!reverse && item.context && (
          <div className="context-quote" dir="auto">
            “{item.context}”
          </div>
        )}
        {revealed ? (
          <div className="card-answer">
            <span>{t("demoGame.answer")}</span>
            <strong dir="auto">
              {reverse ? item.source : item.translation}
            </strong>
          </div>
        ) : (
          <button
            className="button secondary reveal-button"
            onClick={() => setRevealed(true)}
          >
            {t("demoGame.revealAnswer")}
          </button>
        )}
      </div>
      {revealed && (
        <div className="rating-area">
          <p>{t("demoGame.ratingHelp")}</p>
          <div className="rating-buttons">
            {(
              [
                ["again", 0],
                ["hard", 40],
                ["good", 80],
                ["easy", 100],
              ] as const
            ).map(([rating, score]) => (
              <button
                key={rating}
                onClick={() =>
                  onScore({
                    score,
                    selfRating: rating,
                    result: "self_rated",
                    direction: reverse
                      ? "meaning_to_source"
                      : "source_to_meaning",
                    userAnswer: reverse ? item.source : item.translation,
                  })
                }
              >
                <span>{t(`game.ratings.${rating}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TypedExercise({
  item,
  listening,
  onScore,
}: {
  item: LearningItem;
  listening: boolean;
  onScore: ScoreHandler;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [correction, setCorrection] = useState("");
  const [audioError, setAudioError] = useState("");
  const quality =
    submitted === null ? 0 : answerQuality(submitted, item.source);
  const score = hints ? Math.min(quality, 80) : quality;
  const play = () => {
    if (!speak(item.source, item.sourceLanguage))
      setAudioError(t("demoGame.audioUnsupported"));
  };
  const submit = () => {
    if (value.trim() && submitted === null) setSubmitted(value);
  };
  return (
    <div className="exercise-area">
      <div className={cn("exercise-prompt", listening && "listening-prompt")}>
        <span className="exercise-label">
          {listening ? t("demoGame.whatDidYouHear") : t("demoGame.whichWord")}
        </span>
        {listening ? (
          <button
            className="listen-orb"
            aria-label={t("demoGame.playWord")}
            onClick={play}
          >
            <Headphones size={35} />
            <span>{t("demoGame.play")}</span>
          </button>
        ) : (
          <h1 dir="auto">{item.translation}</h1>
        )}
        {audioError && (
          <p className="form-error" role="alert">
            {audioError}
          </p>
        )}
      </div>
      <form
        className="typing-answer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <LetterBoxesInput
          label={t("game.yourAnswer")}
          autoFocus
          disabled={submitted !== null}
          value={value}
          length={Array.from(item.source).length}
          revealedValue={Array.from(item.source)
            .map((letter, index) => (index < hints ? letter : ""))
            .join("")}
          onChange={setValue}
        />
        <button
          type="button"
          disabled={
            submitted !== null || hints >= Array.from(item.source).length
          }
          className="hint-button"
          onClick={() => setHints((count) => count + 1)}
        >
          <Lightbulb size={17} />
          {t("demoGame.hint")}
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={!value.trim() || submitted !== null}
        >
          {t("demoGame.checkAnswer")}
        </button>
      </form>
      {submitted !== null && quality < 100 && (
        <div className="field correction-field">
          <span>{t("demoGame.typeCorrectWord")}</span>
          <LetterBoxesInput
            autoFocus
            label={t("demoGame.typeCorrectWord")}
            value={correction}
            length={Array.from(item.source).length}
            onChange={setCorrection}
          />
        </div>
      )}
      {submitted !== null && (
        <Feedback
          score={score}
          answer={item.source}
          disabled={
            quality < 100 &&
            normalizeAnswer(correction) !== normalizeAnswer(item.source)
          }
          onNext={() =>
            onScore({
              score,
              userAnswer: submitted,
              hintsUsed: hints,
              skills: listening
                ? ["listening", "spelling"]
                : ["recall", "spelling"],
              result:
                quality === 100
                  ? "correct"
                  : quality >= 60
                    ? "partially_correct"
                    : "incorrect",
            })
          }
        />
      )}
    </div>
  );
}

function Recall({
  item,
  allItems,
  onScore,
}: {
  item: LearningItem;
  allItems: LearningItem[];
  onScore: ScoreHandler;
}) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState(false);
  const [selected, setSelected] = useState<LearningItem | null>(null);
  const choices = useMemo(() => {
    const sources = new Set([normalizeAnswer(item.source)]);
    const distractors = shuffle(
      allItems.filter(
        (candidate) =>
          !candidate.deletedAt &&
          candidate.userStatus === "ACTIVE" &&
          candidate.sourceLanguage === item.sourceLanguage &&
          candidate.translationLanguage === item.translationLanguage,
      ),
    )
      .filter((candidate) => {
        const key = normalizeAnswer(candidate.source);
        if (sources.has(key)) return false;
        sources.add(key);
        return true;
      })
      .slice(0, 3);
    return shuffle([item, ...distractors]);
  }, [allItems, item]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        typed ||
        selected ||
        (event.target as HTMLElement).tagName === "INPUT"
      )
        return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < choices.length) setSelected(choices[index]);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [choices, typed, selected]);
  if (typed)
    return <TypedExercise item={item} listening={false} onScore={onScore} />;
  return (
    <div className="exercise-area">
      <button
        className="button ghost direction-toggle"
        onClick={() => setTyped(true)}
      >
        {t("demoGame.preferTyping")} <ChevronLeft size={15} />
      </button>
      <div className="exercise-prompt">
        <span className="exercise-label">
          {t("demoGame.whichWordForMeaning")}
        </span>
        <h1 dir="auto">{item.translation}</h1>
        <p>{t("demoGame.chooseOrNumbers")}</p>
      </div>
      <div className="choice-grid">
        {choices.map((choice, index) => (
          <button
            disabled={!!selected}
            onClick={() => setSelected(choice)}
            className={cn(
              "choice-button",
              selected?.id === choice.id &&
                (choice.id === item.id ? "selected-correct" : "selected-wrong"),
              !!selected && choice.id === item.id && "show-correct",
            )}
            key={choice.id}
          >
            <kbd>{index + 1}</kbd>
            <span dir="auto">{choice.source}</span>
            {selected && choice.id === item.id && <Check size={18} />}
          </button>
        ))}
      </div>
      {selected && (
        <Feedback
          score={selected.id === item.id ? 100 : 0}
          answer={item.source}
          onNext={() =>
            onScore({
              score: selected.id === item.id ? 100 : 0,
              userAnswer: selected.source,
            })
          }
        />
      )}
    </div>
  );
}

function Pronunciation({
  item,
  onScore,
}: {
  item: LearningItem;
  onScore: ScoreHandler;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<
    "idle" | "requesting" | "recording" | "ready"
  >("idle");
  const [error, setError] = useState("");
  const [audio, setAudio] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioRef = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (audioRef.current) URL.revokeObjectURL(audioRef.current);
    };
  }, []);
  const record = async () => {
    setError("");
    setState("requesting");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        !("MediaRecorder" in window)
      ) {
        setState("idle");
        setError(t("demoGame.recordingUnsupported"));
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const recording = new MediaRecorder(media);
      recorder.current = recording;
      const chunks: Blob[] = [];
      recording.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recording.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        if (audioRef.current) URL.revokeObjectURL(audioRef.current);
        const url = URL.createObjectURL(
          new Blob(chunks, { type: recording.mimeType }),
        );
        audioRef.current = url;
        setAudio(url);
        setState("ready");
      };
      recording.start();
      setState("recording");
      timer.current = setTimeout(() => {
        if (recording.state === "recording") recording.stop();
      }, 6000);
    } catch (reason) {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      const name =
        reason && typeof reason === "object" && "name" in reason
          ? reason.name
          : "";
      setState("idle");
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? t("demoGame.microphoneDenied")
          : name === "NotFoundError"
            ? t("demoGame.microphoneMissing")
            : t("demoGame.recordingFailed"),
      );
    }
  };
  return (
    <div className="exercise-area">
      <div className="pronunciation-card">
        <span className="exercise-label">
          {t("demoGame.pronunciationNoScore")}
        </span>
        <button
          className="sound-button large"
          onClick={() => speak(item.source, item.sourceLanguage)}
        >
          <Volume2 size={21} />
          {t("demoGame.playExample")}
        </button>
        <h1 dir="auto">{item.source}</h1>
        <span className="phonetic" dir="ltr">
          {item.phonetic}
        </span>
        <button
          className={cn("record-button", state === "recording" && "recording")}
          disabled={state === "requesting"}
          onClick={() =>
            state === "recording" ? recorder.current?.stop() : void record()
          }
        >
          <Mic2 size={30} />
          <span>
            {state === "recording"
              ? t("demoGame.stopRecording")
              : state === "requesting"
                ? t("demoGame.requestingPermission")
                : t("demoGame.pressAndSpeak")}
          </span>
        </button>
        {audio && (
          <audio
            controls
            src={audio}
            aria-label={t("demoGame.playTemporaryRecording")}
          />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="pronunciation-disclaimer">
          {t("demoGame.pronunciationDisclaimer")}
        </p>
        <small className="privacy-note">{t("demoGame.recordingPrivacy")}</small>
      </div>
      <button
        className="button secondary wide-next"
        disabled={state === "recording" || state === "requesting"}
        onClick={() => onScore({ score: 0, result: "skipped" })}
      >
        {t("demoGame.continueWithoutScore")} <ArrowLeft size={18} />
      </button>
    </div>
  );
}

function Matching({
  items,
  onAttempt,
  onDone,
}: {
  items: LearningItem[];
  onAttempt: (item: LearningItem, outcome: Outcome) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const pool = items;
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [mistake, setMistake] = useState(false);
  const translations = useMemo(() => shuffle(pool), [pool]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const resolvePair = (a: string, b: string) => {
    const source = pool.find((item) => item.id === a)!;
    const chosen = pool.find((item) => item.id === b)!;
    onAttempt(source, {
      score: a === b ? 100 : 0,
      userAnswer: chosen.translation,
    });
    if (a === b) {
      const next = [...matched, a];
      setMatched(next);
      setLeft(null);
      setRight(null);
      if (next.length === pool.length) timer.current = setTimeout(onDone, 500);
    } else {
      setMistake(true);
      timer.current = setTimeout(() => {
        setLeft(null);
        setRight(null);
        setMistake(false);
      }, 600);
    }
  };
  return (
    <div className="exercise-area matching-area">
      <div className="exercise-prompt">
        <span className="exercise-label">{t("demoGame.matchWordMeaning")}</span>
        <h2>{t("demoGame.findPairs")}</h2>
      </div>
      <div className="matching-board">
        <div>
          {pool.map((item) => (
            <button
              aria-pressed={left === item.id}
              key={item.id}
              disabled={matched.includes(item.id) || mistake}
              className={cn(
                left === item.id && "selected",
                matched.includes(item.id) && "matched",
                mistake && left === item.id && "mistake",
              )}
              onClick={() => {
                setLeft(item.id);
                if (right) resolvePair(item.id, right);
              }}
              dir="auto"
            >
              {item.source}
            </button>
          ))}
        </div>
        <div>
          {translations.map((item) => (
            <button
              aria-pressed={right === item.id}
              key={item.id}
              disabled={matched.includes(item.id) || mistake}
              className={cn(
                right === item.id && "selected",
                matched.includes(item.id) && "matched",
                mistake && right === item.id && "mistake",
              )}
              onClick={() => {
                setRight(item.id);
                if (left) resolvePair(left, item.id);
              }}
              dir="auto"
            >
              {item.translation}
            </button>
          ))}
        </div>
      </div>
      <div className="match-counter" role="status">
        <Check size={17} />
        {t("demoGame.pairsProgress", {
          current: matched.length,
          total: pool.length,
        })}
      </div>
    </div>
  );
}

function Session({
  game,
  ids,
  onRestart,
}: {
  game: GameType;
  ids?: string[];
  onRestart: () => void;
}) {
  const { t } = useTranslation();
  const { items, recordAttempt, saveSession } = useApp();
  const navigate = useNavigate();
  const [queue] = useState(() =>
    structuredClone(practiceQueue(items, game, ids)),
  );
  const [choicePool] = useState(() => structuredClone(items));
  const [session] = useState<PracticeSession>(() => ({
    id: crypto.randomUUID(),
    game,
    startedAt: new Date().toISOString(),
    status: "active",
    itemIds: queue.map((item) => item.id),
    xp: 0,
    durationSeconds: 0,
  }));
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<
    Array<{ score: number; xp: number; result?: Attempt["result"] }>
  >([]);
  const [finished, setFinished] = useState(false);
  const sessionRef = useRef(session);
  const saveRef = useRef(saveSession);
  saveRef.current = saveSession;
  const sequence = useRef(0);
  const locked = useRef(false);
  const responseStarted = useRef(Date.now());
  useEffect(() => {
    saveRef.current(sessionRef.current);
    return () => {
      if (sessionRef.current.status === "active")
        saveRef.current({
          ...sessionRef.current,
          status: "abandoned",
          endedAt: new Date().toISOString(),
          durationSeconds: Math.floor(
            (Date.now() - +new Date(sessionRef.current.startedAt)) / 1000,
          ),
        });
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    locked.current = false;
    responseStarted.current = Date.now();
  }, [index]);
  const effectiveGame: GameType =
    game === "smart"
      ? (["flashcards", "recall", "listening"][index % 3] as GameType)
      : game;
  const addAttempt = (item: LearningItem, outcome: Outcome) => {
    const attemptSequence = ++sequence.current;
    const result =
      outcome.result ||
      (outcome.score === 100
        ? "correct"
        : outcome.score >= 60
          ? "partially_correct"
          : "incorrect");
    const xp = recordAttempt(item.id, effectiveGame, outcome.score, {
      id: session.id + ":" + attemptSequence,
      sessionId: session.id,
      sequence: attemptSequence,
      result,
      skills:
        outcome.skills ||
        (outcome.direction === "meaning_to_source"
          ? ["recall"]
          : gameSkills[effectiveGame]),
      direction:
        outcome.direction ||
        (effectiveGame === "recall"
          ? "meaning_to_source"
          : effectiveGame === "listening"
            ? "audio_to_source"
            : "source_to_meaning"),
      userAnswer: outcome.userAnswer,
      expectedAnswer:
        outcome.direction === "meaning_to_source"
          ? item.source
          : effectiveGame === "matching" || effectiveGame === "flashcards"
            ? item.translation
            : item.source,
      hintsUsed: outcome.hintsUsed || 0,
      selfRating: outcome.selfRating,
      responseTimeMs: Date.now() - responseStarted.current,
    });
    sessionRef.current = {
      ...sessionRef.current,
      xp: sessionRef.current.xp + xp,
    };
    if (effectiveGame === "matching") responseStarted.current = Date.now();
    setOutcomes((current) => [
      ...current,
      { score: outcome.score, xp, result },
    ]);
  };
  const finish = () => {
    const final: PracticeSession = {
      ...sessionRef.current,
      status: "completed",
      endedAt: new Date().toISOString(),
      durationSeconds: Math.floor(
        (Date.now() - +new Date(session.startedAt)) / 1000,
      ),
    };
    sessionRef.current = final;
    saveSession(final);
    setFinished(true);
  };
  const next: ScoreHandler = (outcome) => {
    if (locked.current) return;
    locked.current = true;
    addAttempt(queue[index], outcome);
    if (index >= queue.length - 1) finish();
    else setIndex((current) => current + 1);
  };
  if (!queue.length)
    return (
      <div className="empty-session">
        <Sparkles size={42} />
        <h2>{t("demoGame.noActiveWords")}</h2>
        <p>{t("demoGame.noActiveDescription")}</p>
        <Link className="button primary" to="/vocabulary">
          {t("demoGame.toVocabulary")}
        </Link>
      </div>
    );
  if (finished) {
    const scored = outcomes.filter((outcome) => outcome.result !== "skipped");
    const accuracy = scored.length
      ? Math.round(
          (scored.filter((outcome) => outcome.score >= 60).length /
            scored.length) *
            100,
        )
      : null;
    return (
      <div className="session-page session-finish">
        <div className="finish-card">
          <div className="finish-confetti">
            ✦ <span>✦</span> ✦
          </div>
          <div className="trophy-circle">
            <Trophy size={44} />
          </div>
          <p className="eyebrow">{t("demoGame.completedEyebrow")}</p>
          <h1>{t("demoGame.greatWork")}</h1>
          <p>{t("demoGame.savedDescription")}</p>
          <div className="finish-stats">
            <div>
              <strong>{accuracy === null ? "—" : accuracy + "%"}</strong>
              <span>{t("demoGame.successSelfReport")}</span>
            </div>
            <div>
              <strong>{queue.length}</strong>
              <span>{t("demoLearn.words")}</span>
            </div>
            <div>
              <strong>
                +{outcomes.reduce((sum, outcome) => sum + outcome.xp, 0)}
              </strong>
              <span>{t("demoDashboard.metrics.demoXp")}</span>
            </div>
          </div>
          <p>
            {t("demoGame.summary", {
              seconds: sessionRef.current.durationSeconds,
              count: outcomes.length,
            })}
          </p>
          <p className="auth-footnote">{t("demoGame.serverDecisions")}</p>
          <div className="finish-actions">
            <button
              className="button primary"
              onClick={() => navigate("/dashboard")}
            >
              {t("demoGame.toMyDay")} <ChevronLeft size={18} />
            </button>
            <button className="button secondary" onClick={onRestart}>
              <RotateCcw size={17} />
              {t("demoGame.anotherRound")}
            </button>
          </div>
        </div>
      </div>
    );
  }
  const item = queue[index];
  return (
    <div className="session-page page-enter">
      <header className="session-header">
        <button
          className="icon-button"
          onClick={() => navigate("/learn")}
          aria-label={t("demoGame.exitPartial")}
        >
          <X size={21} />
        </button>
        <div className="session-progress">
          <div>
            <b>{t(`demoGame.titles.${game}`)}</b>
            <span>
              {t("demoGame.progress", {
                current: index + 1,
                total: queue.length,
              })}
            </span>
          </div>
          <div
            className="progress-track large"
            role="progressbar"
            aria-label={t("demoGame.progressAria")}
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={queue.length}
          >
            <span style={{ width: (index / queue.length) * 100 + "%" }} />
          </div>
        </div>
        <span className="session-xp">{t("demoGame.demoOnly")}</span>
      </header>
      <main className="session-main">
        <div key={item.id + ":" + effectiveGame}>
          {effectiveGame === "flashcards" && (
            <Flashcard item={item} onScore={next} />
          )}
          {effectiveGame === "recall" && (
            <Recall item={item} allItems={choicePool} onScore={next} />
          )}
          {effectiveGame === "listening" && (
            <TypedExercise item={item} listening onScore={next} />
          )}
          {effectiveGame === "pronunciation" && (
            <Pronunciation item={item} onScore={next} />
          )}
          {effectiveGame === "matching" && (
            <Matching items={queue} onAttempt={addAttempt} onDone={finish} />
          )}
          {effectiveGame !== "matching" && (
            <button
              className="button ghost skip-button"
              onClick={() => next({ score: 0, result: "skipped" })}
            >
              {t("demoGame.skipWithoutScore")}
            </button>
          )}
        </div>
      </main>
      <footer className="session-footer">
        <Clock3 size={15} />
        <span>{t("demoGame.footer")}</span>
      </footer>
    </div>
  );
}

export function GameSessionPage() {
  const { t } = useTranslation();
  const { mode } = useApp();
  const { type = "smart" } = useParams();
  const [params] = useSearchParams();
  const game = (gameTypes.has(type as GameType) ? type : "smart") as GameType;
  const [run, setRun] = useState(0);
  if (mode !== "demo")
    return (
      <CapabilityNotice
        title={t("demoGame.capabilityTitle")}
        milestone={t("demoGame.capabilityMilestone")}
      />
    );
  const ids = params.has("items") ? params.get("items")!.split(",") : undefined;
  return (
    <Session
      key={game + ":" + (params.get("items") || "") + ":" + run}
      game={game}
      ids={ids}
      onRestart={() => setRun((value) => value + 1)}
    />
  );
}
