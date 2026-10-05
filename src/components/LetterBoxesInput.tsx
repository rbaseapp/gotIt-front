import { useRef } from "react";
import { Delete, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { letterKeyboard } from "../lib/letterKeyboard";

type LetterBoxesInputProps = {
  value: string;
  length: number;
  wordLengths?: number[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  autoFocus?: boolean;
  revealedValue?: string;
  language?: string;
  showLetters?: boolean;
};

export function LetterBoxesInput({
  value,
  length,
  wordLengths,
  onChange,
  label,
  disabled = false,
  autoFocus = false,
  revealedValue = "",
  language,
  showLetters = false,
}: LetterBoxesInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardLetters = showLetters ? letterKeyboard(language) : [];
  const grouped = Boolean(wordLengths?.length);
  const visibleLength = grouped
    ? wordLengths!.reduce((total, wordLength) => total + wordLength, 0)
    : length;
  const letters = Array.from(grouped ? value.replace(/\s/gu, "") : value).slice(
    0,
    visibleLength,
  );
  const revealedLetters = Array.from(
    grouped ? revealedValue.replace(/\s/gu, "") : revealedValue,
  );
  const groups = grouped ? wordLengths! : [length];

  const formatValue = (rawValue: string) => {
    if (!grouped) return Array.from(rawValue).slice(0, length).join("");

    const characters = Array.from(rawValue.replace(/\s/gu, "")).slice(
      0,
      visibleLength,
    );
    const words: string[] = [];
    let characterIndex = 0;
    for (const wordLength of groups) {
      const word = characters
        .slice(characterIndex, characterIndex + wordLength)
        .join("");
      if (!word) break;
      words.push(word);
      characterIndex += wordLength;
    }
    return words.join(" ");
  };

  return (
    <div
      className="letter-answer"
      dir={
        language?.startsWith("he") || language?.startsWith("ar") ? "rtl" : "ltr"
      }
      lang={language}
    >
      <div
        className="letter-box-input-wrap"
        dir={
          language?.startsWith("he") || language?.startsWith("ar")
            ? "rtl"
            : "ltr"
        }
        onClick={() => inputRef.current?.focus()}
      >
        <div className="letter-boxes" aria-hidden="true">
          {groups.map((wordLength, groupIndex) => {
            const groupOffset = groups
              .slice(0, groupIndex)
              .reduce((total, previousLength) => total + previousLength, 0);
            return (
              <span className="letter-box-word" key={groupIndex}>
                {Array.from({ length: wordLength }, (_, wordIndex) => {
                  const index = groupOffset + wordIndex;
                  const entered = letters[index] ?? "";
                  const revealed = entered
                    ? ""
                    : (revealedLetters[index] ?? "");
                  return (
                    <span
                      className={`letter-box${entered ? " filled" : ""}${
                        revealed ? " revealed" : ""
                      }${index === letters.length && !disabled ? " active" : ""}`}
                      key={wordIndex}
                    >
                      {entered || revealed}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
        <input
          ref={inputRef}
          className="letter-box-input"
          aria-label={label}
          autoFocus={autoFocus}
          autoComplete="off"
          disabled={disabled}
          dir={
            language?.startsWith("he") || language?.startsWith("ar")
              ? "rtl"
              : "ltr"
          }
          inputMode="text"
          maxLength={grouped ? visibleLength + groups.length - 1 : length}
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(formatValue(event.target.value))}
        />
      </div>
      {keyboardLetters.length > 0 && (
        <div
          className="letter-keyboard"
          role="group"
          aria-label={t("ux.letterKeyboard")}
        >
          <p className="letter-keyboard-hint">
            <Keyboard size={16} aria-hidden="true" />
            {t("ux.letterKeyboardHelp")}
          </p>
          <div className="letter-tiles">
            {keyboardLetters.map((letter) => (
              <button
                type="button"
                className="letter-tile"
                key={letter}
                disabled={disabled || letters.length >= visibleLength}
                onClick={() => onChange(formatValue(value + letter))}
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="letter-keyboard-actions">
            <button
              type="button"
              className="button secondary"
              disabled={disabled || !value}
              aria-label={t("ux.deleteLetter")}
              onClick={() =>
                onChange(
                  formatValue(
                    Array.from(grouped ? value.replace(/\s/gu, "") : value)
                      .slice(0, -1)
                      .join(""),
                  ),
                )
              }
            >
              <Delete size={18} aria-hidden="true" />
              {t("ux.deleteLetter")}
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={disabled || !value}
              onClick={() => onChange("")}
            >
              {t("ux.clearAnswer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
