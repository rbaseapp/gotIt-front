import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronRight,
  Clock3,
  HeartHandshake,
  Lightbulb,
  MessageCircle,
  ScanFace,
  Star,
  Sparkles,
} from "lucide-react";
import { LanguageCombobox } from "./LanguageCombobox";
import { LanguageFlag } from "./LanguageFlag";
import { RemoteState } from "./RemoteState";
import { getLanguageOptions } from "../lib/languages";
import books from "../assets/program-chooser/books.png";
import mohi from "../assets/program-chooser/mohi.png";
import "../program-chooser.css";

type Props = {
  target: string;
  support: string;
  onTarget: (value: string) => void;
  onSupport: (value: string) => void;
  busy: boolean;
  loading: boolean;
  error: string;
  available: boolean;
  onRetry: () => void;
  onPrepared: () => void;
  onBack: () => void;
};

function LanguageField({
  value,
  label,
  disabled,
  onChange,
}: {
  value: string;
  label: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const options = getLanguageOptions("en").map(
    ([code]) =>
      [
        code,
        new Intl.DisplayNames([code], { type: "language" }).of(code) || code,
      ] as const,
  );
  return (
    <label className="pc-language">
      <span>{label}</span>
      <div className="pc-language-control">
        <LanguageFlag code={value} />
        <LanguageCombobox
          value={value}
          onChange={onChange}
          disabled={disabled}
          ariaLabel={label}
          options={options}
        />
        <ChevronDown size={22} aria-hidden="true" />
      </div>
    </label>
  );
}

function Feature({
  icon,
  children,
  tone = "mint",
}: {
  icon: ReactNode;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <li>
      <span className={`pc-feature-icon pc-${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function ProgramChooser(props: Props) {
  const { t } = useTranslation();
  const { target, support, busy, loading, error, available } = props;
  return (
    <div className="pc-page">
      <header className="pc-heading">
        <h1>
          <Sparkles aria-hidden="true" />
          {t("programChooser.title")}
          <Sparkles aria-hidden="true" />
        </h1>
        <p>{t("programChooser.subtitle")}</p>
      </header>
      <section
        className="pc-languages"
        aria-label={t("programChooser.languages")}
      >
        <LanguageField
          value={target}
          onChange={props.onTarget}
          disabled={busy}
          label={t("programChooser.target")}
        />
        <LanguageField
          value={support}
          onChange={props.onSupport}
          disabled={busy}
          label={t("programChooser.support")}
        />
      </section>
      <div className="pc-options">
        <article
          className="pc-card pc-personal"
          aria-labelledby="pc-personal-title"
        >
          <div className="pc-art pc-personal-art" aria-hidden="true">
            <img src={mohi} alt="" width="640" height="260" />
            <span className="pc-chip pc-chip-goal">
              {t("programChooser.goal")}
            </span>
            <span className="pc-chip pc-chip-interests">
              {t("programChooser.interests")}
            </span>
            <span className="pc-chip pc-chip-level">
              {t("programChooser.level")}
            </span>
            <span className="pc-chip pc-chip-time">
              {t("programChooser.time")}
            </span>
          </div>
          <h2 id="pc-personal-title">{t("programChooser.personalTitle")}</h2>
          <p className="pc-description">
            {t("programChooser.personalDescription")}
          </p>
          <ul className="pc-features">
            <Feature icon={<HeartHandshake />}>
              {t("programChooser.adapts")}
            </Feature>
            <Feature icon={<MessageCircle />} tone="blue">
              {t("programChooser.includes")}
            </Feature>
            <Feature icon={<ScanFace />} tone="purple">
              {t("programChooser.tailored")}
            </Feature>
          </ul>
          <Link
            className="pc-cta pc-yellow"
            aria-disabled={busy || undefined}
            tabIndex={busy ? -1 : undefined}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
            to={`/courses?new=1&language=${encodeURIComponent(target)}&support=${encodeURIComponent(support)}`}
          >
            {t("programChooser.personalAction")}
            <ChevronRight aria-hidden="true" />
          </Link>
        </article>
        <article
          className="pc-card pc-foundation"
          aria-labelledby="pc-foundation-title"
          aria-busy={busy || loading}
        >
          <span className="pc-recommended">
            <Star size={20} fill="currentColor" aria-hidden="true" />
            {t("programChooser.recommended")}
          </span>
          <div className="pc-art" aria-hidden="true">
            <img src={books} alt="" width="640" height="260" />
          </div>
          <h2 id="pc-foundation-title">
            {t("programChooser.foundationTitle")}
          </h2>
          <p className="pc-description">
            {t("programChooser.foundationDescription", {
              language:
                getLanguageOptions(t("programChooser.languageNameLocale")).find(
                  ([code]) => code === target,
                )?.[1] ?? target,
            })}
          </p>
          <ul className="pc-features">
            <Feature icon={<Clock3 />}>{t("programChooser.instant")}</Feature>
            <Feature icon={<ChartNoAxesColumnIncreasing />}>
              {t("programChooser.progress")}
            </Feature>
            <Feature icon={<BookOpen />}>
              {t("programChooser.structured")}
            </Feature>
          </ul>
          <div className="pc-catalog-state" aria-live="polite">
            <RemoteState
              loading={loading}
              error={error}
              retry={props.onRetry}
            />
            {!loading && !error && !available && (
              <p role="status">{t("pathUi.pairUnavailable")}</p>
            )}
          </div>
          <button
            className="pc-cta pc-green"
            disabled={busy || loading || Boolean(error) || !available}
            onClick={props.onPrepared}
          >
            {t(
              busy
                ? "common.loadingFromServer"
                : "programChooser.foundationAction",
            )}
            <ChevronRight aria-hidden="true" />
          </button>
        </article>
      </div>
      <p className="pc-help">
        <Lightbulb size={27} aria-hidden="true" />
        {t("programChooser.help")}
      </p>
      <button className="pc-back" disabled={busy} onClick={props.onBack}>
        {t("common.back")}
      </button>
    </div>
  );
}
