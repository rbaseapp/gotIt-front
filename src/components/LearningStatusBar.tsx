import { Flame, Globe2, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLanguageOptions } from "../lib/languages";
import "./LearningStatusBar.css";

type LearningStatusBarProps = {
  variant: "dashboard" | "practice" | "mywords";
  goal?: {
    type: "items" | "minutes" | "attempts";
    current: number;
    value: number;
  };
  streakDays?: number;
  language: {
    value: string;
    options: readonly string[];
    translationCode: string;
    disabled?: boolean;
    onChange: (code: string) => void;
  };
};

/** Controlled UI only: pages retain request, language-scope and navigation ownership. */
export function LearningStatusBar({
  variant,
  goal,
  streakDays,
  language,
}: LearningStatusBarProps) {
  const { t, i18n } = useTranslation();
  const names = new Map(getLanguageOptions(i18n.resolvedLanguage || "en"));
  const languageName = (code: string) => names.get(code) || code;
  const unit = goal
    ? t(`settings.${goal.type === "items" ? "uniqueWords" : goal.type}`)
    : "";
  const options = [...new Set(language.options)].filter(Boolean);
  const isWords = variant === "mywords";
  return (
    <div className="learning-status-bar" data-variant={variant}>
      <div className="learning-status-inner">
        {goal && (
          <span className="learning-status-chip">
            {variant === "dashboard" && <Target size={16} aria-hidden="true" />}
            <span>
              {variant === "dashboard" ? (
                t("newDashboard.goal", {
                  current: goal.current,
                  value: goal.value,
                  unit,
                })
              ) : (
                <>
                  <b
                    className={isWords ? undefined : "en"}
                    dir={isWords ? undefined : "ltr"}
                  >
                    {isWords ? goal.current : `${goal.current} / ${goal.value}`}
                  </b>
                  {isWords && ` / ${goal.value}`}{" "}
                  {isWords
                    ? t(`myWords.${goal.type}`)
                    : t("practiceDesign.today", { unit })}
                </>
              )}
            </span>
            <progress
              className="learning-status-progress"
              max={Math.max(1, goal.value)}
              value={Math.max(
                0,
                Math.min(goal.current, Math.max(1, goal.value)),
              )}
              aria-label={t("dashboard.dailyGoal")}
              aria-valuetext={`${goal.current} / ${goal.value} ${unit}`}
            />
          </span>
        )}
        {streakDays !== undefined && (
          <span className="learning-status-chip learning-status-streak">
            <Flame
              className="learning-status-flame"
              size={isWords ? 20 : 16}
              fill={variant === "dashboard" ? "none" : "currentColor"}
              aria-hidden="true"
            />
            <span>
              {isWords ? (
                <>
                  <b>{streakDays}</b> {t("myWords.streak")}
                </>
              ) : (
                t("newDashboard.streak", { count: streakDays })
              )}
            </span>
          </span>
        )}
        <div className="learning-status-language">
          <Globe2
            size={isWords ? 20 : variant === "dashboard" ? 17 : 18}
            aria-hidden="true"
          />
          <label>
            {!isWords && (
              <span>
                {languageName(language.translationCode)}{" "}
                {i18n.dir() === "rtl" ? "←" : "→"}
              </span>
            )}
            <select
              aria-label={t("vocabulary.sourceLanguage")}
              value={language.value}
              disabled={language.disabled}
              onChange={(event) => language.onChange(event.target.value)}
            >
              {options.map((code) => (
                <option key={code} value={code}>
                  {languageName(code)}
                  {isWords && ` — ${languageName(language.translationCode)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
