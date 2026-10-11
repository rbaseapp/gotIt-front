import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EarOff, Headphones, Lightbulb, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { useFocusSession } from "../hooks/useFocusSession";
import type { StudyCard } from "../lib/product";
import { listeningLetters, solved } from "../lib/focusPractice";
import { LetterBoxesInput } from "../components/LetterBoxesInput";

type Engine = ReturnType<typeof useFocusSession>;

/** Letters guide the interaction using authorized study data. Only the server
 * grades the completed attempt, including assistance, revision and XP rules. */
export function FocusListeningGame({
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
  const { state, active, busy, pending } = engine;
  const exercise = active!;
  const value = state!;
  const outcome = value.outcomes.find(
    (entry) => entry.exerciseId === exercise.id,
  );
  const errors = value.letterErrors?.[exercise.id] ?? 0;
  const expected = card.sourceText.normalize("NFC");
  const compact = expected.replace(/\s/gu, "");
  const bank = listeningLetters(card, exercise.id);
  const silent = engine.listeningSilent;
  const [wrong, setWrong] = useState(false);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputArea = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const revealed = errors >= 3;
  const blocked =
    busy || !!pending || !!outcome || revealed || submitting.current;
  const answerLetters = [...value.answer.replace(/\s/gu, "")];
  const used = new Set<number>();
  for (const letter of answerLetters) {
    const index = bank.findIndex(
      (candidate, index) =>
        !used.has(index) &&
        candidate.toLocaleLowerCase() === letter.toLocaleLowerCase(),
    );
    if (index >= 0) used.add(index);
  }
  const format = (letters: string[]) => {
    let index = 0;
    return [...expected]
      .flatMap((character) =>
        /\s/u.test(character)
          ? index && index < letters.length
            ? [character]
            : []
          : index < letters.length
            ? [letters[index++]]
            : [],
      )
      .join("");
  };
  const play = async (slow = false) => {
    setPlaying(true);
    await engine.play(exercise, slow);
    setPlaying(false);
  };
  const write = async (raw: string) => {
    if (blocked) return;
    const chars = [...raw.normalize("NFC").replace(/\s/gu, "")];
    const old = answerLetters;
    // Existing accepted letters cannot be replaced by a paste/edit silently.
    if (chars.length < old.length) {
      engine.update((state) => ({
        ...state,
        answer: format(old.slice(0, chars.length)),
      }));
      return;
    }
    let accepted = [...old];
    for (const letter of chars.slice(old.length)) {
      if (
        letter.toLocaleLowerCase() !==
        [...compact][accepted.length]?.toLocaleLowerCase()
      ) {
        const count = errors + 1;
        setWrong(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setWrong(false), 650);
        engine.update((state) => ({
          ...state,
          answer: format(accepted),
          hintIds: [...new Set([...state.hintIds, exercise.id])],
          letterErrors: { ...state.letterErrors, [exercise.id]: count },
        }));
        if (count >= 2 && !silent) void play(true);
        if (count >= 3) {
          submitting.current = true;
          engine.markDifficult(card.learningItemId, true);
          await engine.submit(exercise, {
            answerText: format([...accepted, letter]),
          });
          submitting.current = false;
        }
        inputArea.current?.querySelector<HTMLInputElement>("input")?.focus();
        return;
      }
      accepted = [...accepted, letter];
    }
    const answer = format(accepted);
    engine.update((state) => ({ ...state, answer }));
    if (accepted.length === [...compact].length) {
      submitting.current = true;
      const receipt = await engine.submit(exercise, { answerText: answer });
      submitting.current = false;
      if (receipt && receipt.attempt.result !== "incorrect" && !silent)
        void play();
    }
    inputArea.current?.querySelector<HTMLInputElement>("input")?.focus();
  };
  const message = revealed
    ? "listenReveal"
    : wrong
      ? errors === 2
        ? "listenLastTry"
        : "listenOops"
      : outcome && solved(outcome)
        ? "listenSuccess"
        : playing
          ? "listenTogether"
          : value.answer
            ? "listenWrite"
            : "listenCue";
  return (
    <main className="fplay fg-listen-game">
      <div className="head">
        <h1>
          <Headphones size={26} />
          {t(silent ? "focusGames.writePrompt" : "focusGames.listenPrompt")}
        </h1>
        <button className="hpill ghost" disabled={blocked} onClick={hint}>
          <Lightbulb size={20} />
          {t("focusGames.hint")}
        </button>
      </div>
      <section
        className={`stage ${wrong ? "fg-shake" : ""} ${outcome && solved(outcome) ? "ans fg-letter-win" : ""}`}
        aria-label={t("focusGames.game")}
      >
        <div className="prow">
          {silent ? (
            <div className="noaud">
              <span className="nl">{t("focusGames.writeTranslation")}</span>
              <span className="nw" dir="auto">
                {card.translationText}
              </span>
            </div>
          ) : (
            <div className={`player ${playing ? "playing" : "cue"}`}>
              <button
                className="playbtn"
                aria-label={t("focusGames.play")}
                onClick={() => void play()}
              >
                <Volume2 size={30} />
              </button>
              <div className="wave" aria-hidden="true">
                {Array.from({ length: 28 }, (_, index) => (
                  <i
                    key={index}
                    style={{ height: `${12 + ((index * 17 + 9) % 38)}px` }}
                  />
                ))}
              </div>
              <button
                className="slowbtn"
                aria-label={t("focusGames.slow")}
                onClick={() => void play(true)}
              >
                {t("focusGames.slowLabel")}
              </button>
            </div>
          )}
          <div className="gmochi">
            <span className="gsay" role="status">
              {t(`focusGames.${message}`)}
            </span>
            <img
              src={`/assets/focus-games/${revealed || wrong ? "ca7eb57e214f95982b1ec7c97db2ba06.png" : outcome && solved(outcome) ? "bde805db24f53a66deb4ebb27c828b6d.png" : "8e5757cae684c7eacfb7443c14cdd330.png"}`}
              alt=""
            />
          </div>
        </div>
        <div className="fg-listen-hint" role="status">
          {value.hintIds.includes(exercise.id)
            ? card.translationText
            : "\u00a0"}
        </div>
        <div ref={inputArea}>
          <LetterBoxesInput
            value={revealed ? expected : value.answer}
            length={[...compact].length}
            wordLengths={expected
              .trim()
              .split(/\s+/u)
              .map((word) => [...word].length)}
            onChange={(answer) => void write(answer)}
            onRemoveLetter={(index) =>
              void write(answerLetters.slice(0, index).join(""))
            }
            label={t("focusGames.answerLabel")}
            language={card.sourceLanguageCode}
            disabled={blocked}
            autoFocus
          />
        </div>
        <div className="meta">
          <span
            className="lives"
            aria-label={t("focusGames.tries", {
              count: Math.max(0, 3 - errors),
            })}
          >
            <span className="ll">{t("focusGames.mistakes")}</span>
            {[0, 1].map((index) => (
              <i key={index} className={index < errors ? "gone" : ""} />
            ))}
          </span>
          <span className="typehint">{t("focusGames.keyboardHelp")}</span>
        </div>
        <div className="tiles fg-letter-tray" dir="ltr">
          {bank.map((letter, index) =>
            used.has(index) ? null : (
              <button
                type="button"
                className={`tile ${wrong ? "fg-letter-bounce" : ""}`}
                key={index}
                disabled={blocked}
                onClick={() => void write(value.answer + letter)}
                style={{ "--i": index } as CSSProperties}
              >
                {letter}
              </button>
            ),
          )}
        </div>
        <div className="fg-inline-feedback" role="status">
          {outcome
            ? feedback
            : revealed
              ? t("focusGames.savedReview")
              : "\u00a0"}
        </div>
      </section>
      <button
        className="skip"
        disabled={busy || !!pending}
        onClick={() => {
          engine.setListeningSilent((current) => !current);
          engine.stopAudio();
        }}
      >
        <EarOff size={19} />
        {t(silent ? "focusGames.backToAudio" : "focusGames.cannotListen")}
      </button>
    </main>
  );
}
