import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Undo2, Volume2 } from "lucide-react";
import { OnboardingFrame } from "./OnboardingFrame";
import { PlacementSession, seededRandom } from "../../lib/placement/engine";
import { canSpeak, speak } from "../../lib/placement/speech";
import type {
  Card,
  Literacy,
  PlacementBank,
  PlacementResult,
  Probe,
  Skill,
  VerifyItem,
} from "../../lib/placement/types";
import {
  priorFor,
  type OnboardingState,
  type PocketPhase,
} from "../../lib/onboarding/state";

type Props = {
  bank: PlacementBank;
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  onDone: (result: PlacementResult) => void;
  onBack: () => void;
};

/** Pictures for the reading check: the written word, then three pictures to pick from. */
const LITERACY_ITEMS = [
  { word: "cat", pictures: ["🐱", "🐶", "🌞"], answer: "🐱" },
  { word: "sun", pictures: ["🏠", "🌞", "🍎"], answer: "🌞" },
  { word: "book", pictures: ["📖", "🍎", "🐶"], answer: "📖" },
];

const EXPECTED_CARDS = 22;
const HURRY_MS = 250;

export function PocketTest({ bank, state, update, onDone, onBack }: Props) {
  const { t } = useTranslation();
  const session = useMemo(
    () =>
      PlacementSession.restore(
        bank,
        {
          prior: priorFor(state.focus),
          mode: state.focus === "words" ? "quick" : "full",
          rng: seededRandom((state.startedAt % 1_000_000) + state.log.length),
        },
        state.log.length ? state.log : state.landing,
      ),
    // The session is rebuilt only from the saved log when this screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bank],
  );
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<PocketPhase>(
    state.phase === "verify" ||
      state.phase === "probes" ||
      state.phase === "done"
      ? "cards"
      : state.phase,
  );
  const [card, setCard] = useState<Card | null>(null);
  const shownAt = useRef(0);
  const [version, setVersion] = useState(0);
  const [hurry, setHurry] = useState(false);
  const [popped, setPopped] = useState(0);
  const [literacy, setLiteracy] = useState<Literacy | null>(state.literacy);
  const [verify, setVerify] = useState<VerifyItem[]>([]);
  const [probe, setProbe] = useState<{ item: Probe; skill: Skill } | null>(
    null,
  );
  const probeCount = useRef({ reading: 0, listening: 0 });

  const finish = useCallback(
    (kind: Literacy) => {
      const result = session.result({
        literacy: kind,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
      update({ log: [...session.log], phase: "done", literacy: kind, result });
      onDone(result);
    },
    [onDone, session, update],
  );

  const known = session.log.filter(
    (o) => o.t === "card" && o.real && o.yes,
  ).length;

  /* ----- move to the next card, or the next phase ----- */
  const advance = useCallback(() => {
    const next = session.nextCard();
    if (next) {
      setCard(next);
      shownAt.current = performance.now();
      return;
    }
    setCard(null);
    const items = session.verifyItems(4);
    if (items.length >= 2) {
      setVerify(items);
      setPhase("verify");
      update({ log: [...session.log], phase: "verify" });
    } else startProbes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, update]);

  function startProbes() {
    const first = session.nextProbe("reading");
    if (!first) return finish(literacy ?? "reader");
    setProbe({ item: first, skill: "reading" });
    setPhase("probes");
  }

  useEffect(() => {
    if (phase === "cards" && !card) advance();
  }, [phase, card, advance, version]);

  const answerCard = (yes: boolean) => {
    if (!card) return;
    const ms = performance.now() - shownAt.current;
    if (ms < HURRY_MS) {
      setHurry(true);
      window.setTimeout(() => setHurry(false), 1800);
      return;
    }
    session.answerCard(card, yes, Math.round(ms));
    if (yes && card.kind === "word") setPopped((n) => n + 1);
    update({ log: [...session.log], phase: "cards" });
    setCard(null);
    setVersion((n) => n + 1);
    const answered = session.log.filter((o) => o.t === "card" && o.real);
    if (
      literacy === null &&
      answered.length >= 8 &&
      !answered.some((o) => o.t === "card" && o.yes)
    ) {
      setPhase("literacy");
      update({ phase: "literacy", log: [...session.log] });
    }
  };

  const undo = () => {
    if (session.undoCard()) {
      setCard(null);
      setVersion((n) => n + 1);
      update({ log: [...session.log] });
    }
  };

  /* keyboard: the arrow pointing at a button picks it (the "know" button comes first) */
  useEffect(() => {
    if (phase !== "cards") return;
    const rtl = document.documentElement.dir === "rtl";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) answerCard(true);
      else if (event.key === (rtl ? "ArrowLeft" : "ArrowRight"))
        answerCard(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const swipe = useRef<number | null>(null);

  /* ----- screens ----- */
  if (phase === "intro")
    return (
      <OnboardingFrame
        step="pocket"
        title={t("start.pocket.introTitle")}
        body={t("start.pocket.introBody")}
        onBack={onBack}
        primary={
          <button
            className="ob-btn"
            onClick={() => {
              const next: PocketPhase =
                state.focus === "scratch" ? "literacy" : "cards";
              setPhase(next);
              update({ phase: next });
            }}
          >
            {t("start.pocket.begin")}
          </button>
        }
      >
        <div className="pocket-card" aria-hidden="true">
          <p className="pocket-word">apple</p>
          <div className="pocket-answers">
            <span className="ob-btn">{t("start.pocket.know")}</span>
            <span className="ob-btn ghost">{t("start.pocket.unknown")}</span>
          </div>
        </div>
      </OnboardingFrame>
    );

  if (phase === "literacy")
    return (
      <LiteracyGate
        onBack={onBack}
        onResult={(kind) => {
          setLiteracy(kind);
          if (kind === "starting") finish("starting");
          else {
            update({ literacy: kind, phase: "cards" });
            setPhase("cards");
          }
        }}
      />
    );

  if (phase === "verify")
    return (
      <VerifyStage
        items={verify}
        onDone={(answers) => {
          verify.forEach((item, i) =>
            session.answerVerify(item, answers[i] ?? null, 4000),
          );
          update({ log: [...session.log] });
          startProbes();
        }}
      />
    );

  if (phase === "probes" && probe)
    return (
      <ProbeStage
        key={probe.item.id}
        probe={probe.item}
        skill={probe.skill}
        onSkip={() => finish(literacy ?? "reader")}
        onAnswer={(picked) => {
          session.answerProbe(probe.item, probe.skill, picked, 8000);
          probeCount.current[probe.skill] += 1;
          update({ log: [...session.log] });
          const wantReading = probeCount.current.reading < 2;
          const wantListening = probeCount.current.listening < 1 && canSpeak();
          const nextSkill: Skill | null =
            probe.skill === "reading" && wantReading
              ? "reading"
              : wantListening
                ? "listening"
                : null;
          const nextItem = nextSkill ? session.nextProbe(nextSkill) : null;
          if (nextSkill && nextItem)
            setProbe({ item: nextItem, skill: nextSkill });
          else finish(literacy ?? "reader");
        }}
      />
    );

  // cards
  const left = Math.max(0, EXPECTED_CARDS - session.cards);
  const progress =
    left > 16 ? "long" : left > 8 ? "minute" : left > 3 ? "half" : "almost";
  return (
    <OnboardingFrame
      step="pocket"
      title={t("start.pocket.introTitle")}
      onBack={onBack}
      primary={null}
      secondary={
        session.cards > 0 ? (
          <button className="ob-link" onClick={undo}>
            <Undo2 size={14} aria-hidden="true" /> {t("start.pocket.undo")}
          </button>
        ) : undefined
      }
    >
      <div className="pocket-meter" aria-live="polite">
        <span
          className="pocket-bag"
          data-pop={popped ? "" : undefined}
          key={popped}
        >
          🎒 {t("start.pocket.inPocket")} <b>{known}</b>
        </span>
        <span className="ob-note">
          {t(`start.pocket.progress.${progress}`)}
        </span>
      </div>
      <div
        className="pocket-card"
        data-fake={card?.kind === "pseudo" || undefined}
        onPointerDown={(e) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) < 90) return;
          const rtl = document.documentElement.dir === "rtl";
          answerCard(rtl ? dx > 0 : dx < 0);
        }}
      >
        {card && (
          <>
            {canSpeak() && (
              <button
                className="pocket-hear"
                aria-label={t("start.pocket.hear")}
                onClick={() => speak(card.text)}
              >
                <Volume2 size={20} />
              </button>
            )}
            <p className="pocket-word" lang="en" dir="ltr" key={card.text}>
              {card.text}
            </p>
            <div className="pocket-answers">
              <button className="ob-btn" onClick={() => answerCard(true)}>
                <Check size={18} aria-hidden="true" />
                {t("start.pocket.know")}
              </button>
              <button
                className="ob-btn ghost"
                onClick={() => answerCard(false)}
              >
                {t("start.pocket.unknown")}
              </button>
            </div>
          </>
        )}
      </div>
      {hurry && (
        <p className="ob-note" role="status">
          {t("start.pocket.slowDown")}
        </p>
      )}
      {session.cards >= 1 && session.cards < 5 && state.focus !== "scratch" && (
        <button
          className="ob-link"
          style={{ alignSelf: "center" }}
          onClick={() => {
            setLiteracy(null);
            setPhase("literacy");
            update({ phase: "literacy" });
          }}
        >
          {t("start.pocket.skipAll")}
        </button>
      )}
    </OnboardingFrame>
  );
}

/* ---------------------------------------------------------------- */

function LiteracyGate({
  onResult,
  onBack,
}: {
  onResult: (kind: Literacy) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<"ask" | "check">("ask");
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const items = useMemo(
    () =>
      LITERACY_ITEMS.map((item) => ({
        ...item,
        pictures: [...item.pictures].sort(() => Math.random() - 0.5),
      })),
    [],
  );
  if (stage === "ask")
    return (
      <OnboardingFrame
        step="pocket"
        title={t("start.literacy.title")}
        body={t("start.literacy.body")}
        onBack={onBack}
      >
        <div className="pocket-card">
          <p className="pocket-word" lang="en" dir="ltr">
            🐱 cat
          </p>
          <div className="ob-chips" style={{ justifyContent: "center" }}>
            <button className="ob-btn" onClick={() => setStage("check")}>
              {t("start.literacy.yes")}
            </button>
            <button className="ob-btn ghost" onClick={() => setStage("check")}>
              {t("start.literacy.some")}
            </button>
            <button
              className="ob-btn ghost"
              onClick={() => onResult("starting")}
            >
              {t("start.literacy.no")}
            </button>
          </div>
        </div>
      </OnboardingFrame>
    );
  const item = items[index]!;
  const choose = (picture: string) => {
    const score = right + (picture === item.answer ? 1 : 0);
    if (index + 1 < 2) {
      setRight(score);
      setIndex(index + 1);
    } else
      onResult(score >= 2 ? "reader" : score === 1 ? "developing" : "starting");
  };
  return (
    <OnboardingFrame
      step="pocket"
      title={t("start.literacy.checkTitle")}
      body={t("start.literacy.checkBody")}
      onBack={onBack}
    >
      <div className="pocket-card" key={index}>
        <p className="pocket-word" lang="en" dir="ltr">
          {item.word}
        </p>
        <div className="pocket-emoji-row">
          {item.pictures.map((picture) => (
            <button key={picture} onClick={() => choose(picture)}>
              <span className="pocket-emoji">{picture}</span>
            </button>
          ))}
        </div>
      </div>
    </OnboardingFrame>
  );
}

function VerifyStage({
  items,
  onDone,
}: {
  items: VerifyItem[];
  onDone: (answers: Array<number | null>) => void;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const answers = useRef<Array<number | null>>([]);
  const item = items[index]!;
  const choose = (picked: number | null) => {
    answers.current[index] = picked;
    if (index + 1 < items.length) setIndex(index + 1);
    else onDone(answers.current);
  };
  return (
    <OnboardingFrame
      step="pocket"
      title={t("start.pocket.verifyTitle")}
      body={t("start.pocket.verifyBody")}
    >
      <div className="pocket-card" key={index}>
        <p className="pocket-word" lang="en" dir="ltr">
          {item.text}
        </p>
        <p className="ob-note">
          {t("start.pocket.verifyQuestion", { word: item.text })}
        </p>
        <div className="pocket-options">
          {item.options.map((option, i) => (
            <button
              key={option}
              className="pocket-option"
              onClick={() => choose(i)}
            >
              {option}
            </button>
          ))}
          <button className="ob-link" onClick={() => choose(null)}>
            {t("start.pocket.notSure")}
          </button>
        </div>
      </div>
    </OnboardingFrame>
  );
}

function ProbeStage({
  probe,
  skill,
  onAnswer,
  onSkip,
}: {
  probe: Probe;
  skill: Skill;
  onAnswer: (picked: number | null) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [played, setPlayed] = useState(false);
  const listening = skill === "listening";
  useEffect(() => {
    if (listening && probe.audio) setPlayed(speak(probe.audio));
  }, [listening, probe]);
  return (
    <OnboardingFrame
      step="pocket"
      title={t("start.pocket.probeTitle")}
      body={t(
        listening ? "start.pocket.probeListen" : "start.pocket.probeRead",
      )}
    >
      <div className="pocket-card">
        {listening ? (
          <button
            className="ob-btn ghost"
            onClick={() => probe.audio && speak(probe.audio, 0.85)}
          >
            <Volume2 size={18} aria-hidden="true" />
            {played ? t("start.pocket.playAgain") : t("start.pocket.play")}
          </button>
        ) : (
          <p className="pocket-passage" lang="en">
            {probe.text}
          </p>
        )}
        <p className="ob-big">{probe.q}</p>
        <div className="pocket-options">
          {probe.options.map((option, i) => (
            <button
              key={option}
              className="pocket-option"
              onClick={() => onAnswer(i)}
            >
              {option}
            </button>
          ))}
          {listening && (
            <button className="ob-link" onClick={onSkip}>
              {t("start.pocket.noSound")}
            </button>
          )}
        </div>
      </div>
    </OnboardingFrame>
  );
}
