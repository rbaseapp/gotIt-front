import { useId, useMemo, useState } from "react";
import { getBilingualLanguageOptions } from "../lib/languages";

type Option = readonly [string, string];

interface LanguageComboboxProps {
  value: string;
  onChange: (code: string) => void;
  options?: ReadonlyArray<Option>;
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function LanguageCombobox({
  value,
  onChange,
  options = getBilingualLanguageOptions(),
  emptyLabel,
  required,
  disabled,
  ariaLabel,
}: LanguageComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const choices = useMemo(() => {
    const all = emptyLabel === undefined ? [...options] : [["", emptyLabel] as const, ...options];
    // Existing regional or custom codes must remain selectable without rewriting them.
    if (value && !all.some(([code]) => code === value)) all.push([value, value]);
    const search = query?.trim().toLocaleLowerCase();
    return search
      ? all.filter(([code, label]) =>
          `${label} ${code}`.toLocaleLowerCase().includes(search),
        )
      : all;
  }, [emptyLabel, options, query, value]);
  const selectedLabel = choices.find(([code]) => code === value)?.[1]
    ?? options.find(([code]) => code === value)?.[1]
    ?? (value || emptyLabel || "");
  const display = query === null ? selectedLabel : query;

  function choose(code: string) {
    onChange(code);
    setQuery(null);
    setOpen(false);
  }

  return (
    <div className="language-combobox">
      <input
        role="combobox"
        type="text"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && choices[active] ? `${id}-option-${active}` : undefined}
        value={display}
        required={required}
        disabled={disabled}
        dir="auto"
        onFocus={(event) => { event.currentTarget.select(); setOpen(true); setActive(Math.max(0, choices.findIndex(([code]) => code === value))); }}
        onBlur={() => { setOpen(false); setQuery(null); }}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setQuery(null); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.max(0, Math.min(choices.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
          } else if (event.key === "Home" && open) { event.preventDefault(); setActive(0); }
          else if (event.key === "End" && open) { event.preventDefault(); setActive(Math.max(0, choices.length - 1)); }
          else if (event.key === "Enter" && open && choices[active]) { event.preventDefault(); choose(choices[active][0]); }
        }}
      />
      {open && (
        <div className="language-combobox-list" id={`${id}-list`} role="listbox">
          {choices.map(([code, label], index) => (
            <div
              id={`${id}-option-${index}`}
              key={code}
              role="option"
              aria-selected={code === value}
              className={index === active ? "active" : ""}
              dir="auto"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(code)}
            >
              <span>{label}</span>
              {code && <small dir="ltr">{code}</small>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
