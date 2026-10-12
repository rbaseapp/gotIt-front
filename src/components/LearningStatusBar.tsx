import { useContext } from "react";
import { createPortal } from "react-dom";
import { LearningStatusTarget } from "../context/LearningStatusTarget";
import { Flame, Globe2, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLanguageOptions } from "../lib/languages";
import "./LearningStatusBar.css";

type LearningStatusBarProps = {
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
  const target = useContext(LearningStatusTarget);
  const bar = (
    <div className="learning-status-bar">
      <div className="learning-status-inner">
        {goal && (
          <span className="learning-status-chip">
            <Target size={16} aria-hidden="true" />
            <span>
              {t("newDashboard.goal", {
                current: goal.current,
                value: goal.value,
                unit,
              })}
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
              size={16}
              aria-hidden="true"
            />
            <span>{t("newDashboard.streak", { count: streakDays })}</span>
          </span>
        )}
        <div className="learning-status-language">
          <Globe2 size={17} aria-hidden="true" />
          <label>
            <span>
              {languageName(language.translationCode)}{" "}
              {i18n.dir() === "rtl" ? "←" : "→"}
            </span>
            <select
              aria-label={t("vocabulary.sourceLanguage")}
              value={language.value}
              disabled={language.disabled}
              onChange={(event) => language.onChange(event.target.value)}
            >
              {options.map((code) => (
                <option key={code} value={code}>
                  {languageName(code)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
  return target ? createPortal(bar, target) : bar;
}
