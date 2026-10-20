import { Check, Circle, Flag, Map, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WordPack } from "../lib/product";
import type { UnitLearningPath } from "../lib/unitLearningPath";
import type { ProgramMapModel } from "../lib/programMap";
type Props = {
  current: WordPack;
  path?: UnitLearningPath;
  pathLoading: boolean;
  pathError: string;
  ready: boolean;
  model?: ProgramMapModel;
  words?: { sourceText: string }[];
  onWords: () => void;
};
export function ProgramMapSidebar({
  current,
  path,
  pathLoading,
  pathError,
  ready,
  model,
  onWords,
  words: suppliedWords,
}: Props) {
  const { t } = useTranslation();
  const remaining = model ? model.steps.length - model.completed : 0;
  const words = suppliedWords?.slice(0, 6) ?? path?.words.slice(0, 6) ?? [];
  return (
    <aside className="pm-sidebar">
      <section className="pm-card pm-keywords">
        <h2>
          <Map aria-hidden="true" />
          {t("programMap.keywords")}
        </h2>
        <p>{t("programMap.keywordsHelp")}</p>
        {ready && words.length ? (
          <div className="pm-word-grid">
            {words.map((word, index) => (
              <button
                key={`${word.sourceText}-${index}`}
                lang={current.track.sourceLanguageCode}
                dir="auto"
                onClick={onWords}
              >
                {word.sourceText}
              </button>
            ))}
          </div>
        ) : (
          <p role="status">
            {pathLoading
              ? t("common.loadingFromServer")
              : pathError
                ? t("programMap.pathUnavailable")
                : t("unitMap.noStageWords")}
          </p>
        )}
      </section>
      <section className="pm-card pm-goal">
        <h2>
          <Flag aria-hidden="true" />
          {t("programMap.nextGoal")}
        </h2>
        <div className="pm-goal-summary">
          <div>
            <strong>{t("programMap.untilComplete")}</strong>
            <p>
              {ready
                ? t("programMap.remainingShort", { count: remaining })
                : t(
                    pathError
                      ? "programMap.pathUnavailable"
                      : "common.loadingFromServer",
                  )}
            </p>
          </div>
          <div className="pm-goal-ring">
            <Circle className="pm-ring-track" aria-hidden="true" />
            <Circle
              className="pm-ring-value"
              aria-hidden="true"
              strokeDasharray={`${((ready ? (model?.percent ?? 0) : 0) * Math.PI) / 5} ${20 * Math.PI}`}
            />
            {ready && (
              <progress
                max={model?.steps.length || 1}
                value={ready ? (model?.completed ?? 0) : 0}
                aria-label={t("programMap.progressLabel")}
              />
            )}
            <Trophy size={33} aria-hidden="true" />
          </div>
        </div>
        <ul>
          <li>
            <Check />
            {t("programMap.goalWords")}
          </li>
          <li>
            <Check />
            {t("programMap.goalTeacher")}
          </li>
          <li>
            <Check />
            {t("programMap.goalPractice")}
          </li>
        </ul>
      </section>
    </aside>
  );
}
