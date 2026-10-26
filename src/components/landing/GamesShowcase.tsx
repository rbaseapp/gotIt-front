import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, Lightbulb, Star, Volume2, X } from "lucide-react";

type Mode = "flashcards" | "matching" | "drag_drop";
const MODES: Mode[] = ["flashcards", "matching", "drag_drop"];
const ART: Record<Mode, string> = {
  flashcards: "e28750e6768b5cd33105d9344bdbad43.webp",
  matching: "a67fd6c3d45b63c8f34e39a5dea8f8ed.png",
  drag_drop: "7ff4938f80f89b8a21791ae3d201a5f4.png",
};
/** Same words and he/en pairs the real practice sessions show. */
const PAIRS: [string, string][] = [
  ["neighbor", "שכן"],
  ["compromise", "פשרה"],
  ["equal", "שווה"],
];

/**
 * A small playable copy of the practice sessions: same look as the app's
 * game screens (progress bar, XP chip, tactile tiles, Moochi), three modes.
 */
export function GamesShowcase() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("flashcards");
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(0);
  const select = (next: Mode) => {
    setMode(next);
    setRound((r) => r + 1);
    setDone(0);
  };
  return (
    <div className="l2-games">
      <div
        className="l2-game-tabs"
        role="tablist"
        aria-label={t("landingV2.how.games.tabs")}
      >
        {MODES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => select(m)}
          >
            {t(`landingV2.how.games.mode.${m}`)}
          </button>
        ))}
      </div>
      <div className="l2-game" data-mode={mode}>
        <header className="l2-game-bar">
          <span className="l2-game-x" aria-hidden="true">
            <X size={16} />
          </span>
          <div className="l2-game-track" aria-hidden="true">
            <span style={{ width: `${(done / 3) * 100}%` }} />
          </div>
          <b className="l2-game-count">{Math.min(done + 1, 3)}/3</b>
          <span className="l2-game-xp">
            <Star size={13} aria-hidden="true" /> {done * 10} XP
          </span>
        </header>
        {mode === "flashcards" ? (
          <Flashcards key={round} onDone={setDone} />
        ) : mode === "matching" ? (
          <Matching key={round} onDone={setDone} />
        ) : (
          <FillGap key={round} onDone={setDone} />
        )}
      </div>
    </div>
  );
}

function Flashcards({ onDone }: { onDone: (n: number) => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const finished = index >= PAIRS.length;
  const next = () => {
    setShown(false);
    setIndex(index + 1);
    onDone(index + 1);
  };
  if (finished) return <Finished text={t("landingV2.how.games.finished")} />;
  const [en, he] = PAIRS[index]!;
  return (
    <div className="l2-game-body">
      <Prompt mode="flashcards" text={t("landingV2.how.games.flashPrompt")} />
      <div className="l2-flash-deck">
        <div className="l2-flash-card">
          <span className="l2-game-say" aria-hidden="true">
            <Volume2 size={16} />
          </span>
          <b dir="ltr" lang="en">
            {en}
          </b>
          {shown ? <i>{he}</i> : null}
        </div>
      </div>
      {!shown ? (
        <button className="l2-game-btn" onClick={() => setShown(true)}>
          {t("landingV2.how.games.show")}
        </button>
      ) : (
        <div className="l2-game-row">
          <button className="l2-game-btn" onClick={next}>
            {t("landingV2.how.games.know")}
          </button>
          <button className="l2-game-btn ghost" onClick={next}>
            {t("landingV2.how.games.again")}
          </button>
        </div>
      )}
    </div>
  );
}

function Matching({ onDone }: { onDone: (n: number) => void }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  // Hebrew column in another order, like the real game.
  const he = [PAIRS[2]!, PAIRS[0]!, PAIRS[1]!];
  const pickEn = (en: string) => {
    if (matched.includes(en)) return;
    setPicked(en);
    setWrong(null);
  };
  const pickHe = (word: string) => {
    if (!picked) return;
    const ok = PAIRS.find((p) => p[0] === picked)?.[1] === word;
    if (ok) {
      const next = [...matched, picked];
      setMatched(next);
      onDone(next.length);
      setPicked(null);
    } else {
      setWrong(word);
      window.setTimeout(() => setWrong(null), 450);
    }
  };
  if (matched.length === PAIRS.length)
    return <Finished text={t("landingV2.how.games.finished")} />;
  return (
    <div className="l2-game-body">
      <Prompt mode="matching" text={t("landingV2.how.games.matchPrompt")} />
      <div className="l2-match">
        <ul>
          {PAIRS.map(([en]) => (
            <li key={en}>
              <button
                dir="ltr"
                lang="en"
                data-on={picked === en || undefined}
                data-done={matched.includes(en) || undefined}
                onClick={() => pickEn(en)}
              >
                <Volume2 size={14} aria-hidden="true" />
                {en}
              </button>
            </li>
          ))}
        </ul>
        <ul>
          {he.map(([en, word]) => (
            <li key={word}>
              <button
                data-done={matched.includes(en) || undefined}
                data-wrong={wrong === word || undefined}
                onClick={() => pickHe(word)}
              >
                {word}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="l2-game-hint">
        <Lightbulb size={14} aria-hidden="true" />{" "}
        {t("landingV2.how.games.matchHint")}
      </p>
    </div>
  );
}

function FillGap({ onDone }: { onDone: (n: number) => void }) {
  const { t } = useTranslation();
  const [filled, setFilled] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const tiles = ["equal", "neighbor", "compromise"];
  const choose = (word: string) => {
    if (word === "neighbor") {
      setFilled(true);
      onDone(3);
    } else {
      setWrong(word);
      window.setTimeout(() => setWrong(null), 450);
    }
  };
  if (filled) return <Finished text={t("landingV2.how.games.finished")} />;
  return (
    <div className="l2-game-body">
      <Prompt mode="drag_drop" text={t("landingV2.how.games.gapPrompt")} />
      <div className="l2-gap-card">
        <span className="l2-game-say" aria-hidden="true">
          <Volume2 size={16} />
        </span>
        <p>
          <b>שכן</b>
          <span className="l2-gap">?</span>
        </p>
        <small>{t("landingV2.how.games.gapHint")}</small>
      </div>
      <div className="l2-tray">
        {tiles.map((word, i) => (
          <button
            key={word}
            className={`l2-tile c${i}`}
            data-wrong={wrong === word || undefined}
            dir="ltr"
            lang="en"
            onClick={() => choose(word)}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}

function Finished({ text }: { text: string }) {
  return (
    <div className="l2-game-body l2-game-done" role="status">
      <Flame size={30} aria-hidden="true" />
      <h4>{text}</h4>
    </div>
  );
}

function Prompt({ mode, text }: { mode: Mode; text: string }) {
  return (
    <h4>
      <img
        src={`/assets/focus-games/${ART[mode]}`}
        alt=""
        draggable={false}
        loading="lazy"
      />
      {text}
    </h4>
  );
}
