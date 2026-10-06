import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  MessageCircle,
  Globe,
  Check,
  ChevronLeft,
  Search,
} from "lucide-react";
import { completedEnglishUnit, englishPathLevels } from "../lib/englishPath";
import type { WordPack } from "../lib/product";

export function UnitLevels({
  packs,
  current,
  onOpen,
  onWords,
  compact = false,
}: {
  packs: WordPack[];
  current?: WordPack;
  onOpen: (pack: WordPack) => void;
  onWords: (pack: WordPack) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const levels = englishPathLevels(packs);
  const [chosenLevel, setChosenLevel] = useState<{
    unitId?: string;
    value: string;
  }>();
  const level =
    chosenLevel && chosenLevel.unitId === current?.id
      ? chosenLevel.value
      : (current?.track.levelCode ?? "beginner");
  const [query, setQuery] = useState("");
  const visible = levels.find((item) => item.level === level)?.packs ?? [];
  const featured =
    visible.find((pack) => pack.id === current?.id) ??
    visible.find((pack) => !completedEnglishUnit(pack)) ??
    visible[0];
  return (
    <div
      className={`path-levels${compact ? " path-levels-compact" : ""}`}
      data-figma-desktop="43:3083"
    >
      <div
        className="path-level-tabs"
        role="group"
        aria-label={t("structuredUi.allUnits")}
      >
        {levels.map(({ level: value, packs }, index) => (
          <button
            key={value}
            className={value === level ? "active" : ""}
            aria-pressed={value === level}
            onClick={() => setChosenLevel({ unitId: current?.id, value })}
          >
            <span
              className={`ux-icon ${value === level ? "mint" : "lavender"}`}
            >
              {index === 0 ? (
                <BookOpen />
              ) : index === 1 ? (
                <MessageCircle />
              ) : (
                <Globe />
              )}
            </span>
            <span>
              <strong>{t(`englishPath.levels.${value}`)}</strong>
              <small>{t("pathUi.unitCount", { count: packs.length })}</small>
            </span>
          </button>
        ))}
      </div>
      <label className="path-unit-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("pathUi.searchUnits")}
          aria-label={t("pathUi.searchUnits")}
        />
        <Search size={24} />
      </label>
      <div className="path-level-layout">
        <section className="ux-card path-level-list">
          <h2>
            {t("pathUi.unitsInLevel", {
              level: t(`englishPath.levels.${level}`),
            })}
          </h2>
          <p>{t("pathUi.browseFuture")}</p>
          <div className="path-level-scroll">
            {visible
              .filter((pack) =>
                pack.title
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              )
              .map((pack) => (
                <button
                  key={pack.id}
                  className={`path-unit-row${pack.id === current?.id ? " current" : ""}`}
                  aria-current={pack.id === current?.id ? "step" : undefined}
                  onClick={() => onOpen(pack)}
                >
                  <span className="ux-icon mint">
                    {completedEnglishUnit(pack) ? (
                      <Check />
                    ) : pack.id === current?.id ? (
                      <BookOpen />
                    ) : (
                      <ChevronLeft />
                    )}
                  </span>
                  <span>
                    <strong dir="auto">{pack.title}</strong>
                    <small>
                      {t("englishPath.unitProgress", {
                        mastered:
                          pack.progress.completed ?? pack.progress.mastered,
                        total: pack.wordCount,
                      })}
                    </small>
                  </span>
                  <span
                    className={`pill ${completedEnglishUnit(pack) ? "mint" : "lavender"}`}
                  >
                    {t(
                      completedEnglishUnit(pack)
                        ? "englishPath.completed"
                        : pack.id === current?.id
                          ? "courses.youAreHere"
                          : "pathUi.canBrowse",
                    )}
                  </span>
                </button>
              ))}
          </div>
        </section>
        {featured && !compact && (
          <aside className="ux-card path-level-featured">
            <span className="pill mint">
              {t(
                featured.id === current?.id
                  ? "courses.youAreHere"
                  : "pathUi.canBrowse",
              )}
            </span>
            <p>{t("englishPath.unit", { number: featured.moduleNumber })}</p>
            <h2 dir="auto">{featured.title}</h2>
            <p>
              {t("englishPath.unitProgress", {
                mastered:
                  featured.progress.completed ?? featured.progress.mastered,
                total: featured.wordCount,
              })}
            </p>
            <progress
              max={featured.wordCount}
              value={featured.progress.completed ?? featured.progress.mastered}
            />
            <div className="path-level-meeting">
              <MicLabel />
              <p>{t("pathUi.meetingAfterWords")}</p>
            </div>
            <button className="button primary" onClick={() => onOpen(featured)}>
              {t("pathUi.continueUnit")}
            </button>
            <button className="button ghost" onClick={() => onWords(featured)}>
              {t("structuredUi.words")}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
function MicLabel() {
  const { t } = useTranslation();
  return <strong>{t("accountUi.teacherMeeting")}</strong>;
}
