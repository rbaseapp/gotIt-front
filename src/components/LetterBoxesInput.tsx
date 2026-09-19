import { useRef } from "react";

type LetterBoxesInputProps = {
  value: string;
  length: number;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  autoFocus?: boolean;
  revealedValue?: string;
};

export function LetterBoxesInput({
  value,
  length,
  onChange,
  label,
  disabled = false,
  autoFocus = false,
  revealedValue = "",
}: LetterBoxesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const letters = Array.from(value).slice(0, length);
  const revealedLetters = Array.from(revealedValue);

  return (
    <div
      className="letter-box-input-wrap"
      dir="auto"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="letter-boxes" aria-hidden="true">
        {Array.from({ length }, (_, index) => {
          const entered = letters[index] ?? "";
          const revealed = entered ? "" : (revealedLetters[index] ?? "");
          return (
            <span
              className={`letter-box${entered ? " filled" : ""}${
                revealed ? " revealed" : ""
              }${index === letters.length && !disabled ? " active" : ""}`}
              key={index}
            >
              {entered || revealed}
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
        dir="auto"
        inputMode="text"
        maxLength={length}
        spellCheck={false}
        value={value}
        onChange={(event) =>
          onChange(Array.from(event.target.value).slice(0, length).join(""))
        }
      />
    </div>
  );
}
