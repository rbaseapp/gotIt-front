import { useState } from "react";
import { useTranslation } from "react-i18next";
import { completedEnglishUnit, englishPathLevels } from "../lib/englishPath";
import type { WordPack } from "../lib/product";
import { PathArtwork } from "./PathArtwork";

export function UnitLevels({
  packs,
  current,
  onOpen,
  onWords,
  initialLevel,
}: {
  packs: WordPack[];
  current?: WordPack;
  onOpen: (pack: WordPack) => void;
  onWords: (pack: WordPack) => void;
  initialLevel?: string;
}) {
  const { t } = useTranslation();
  const levels = englishPathLevels(packs);
  const [level, setLevel] = useState(
    initialLevel ?? current?.track.levelCode ?? "beginner",
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const visible = levels.find((item) => item.level === level)?.packs ?? [];
  const featured =
    visible.find((pack) => pack.id === selectedId) ??
    visible.find((pack) => pack.id === current?.id) ??
    visible.find((pack) => !completedEnglishUnit(pack)) ??
    visible[0];
  const upcoming = featured?.teacherStations?.find((step) => step.available);
  return (
    <div className="path-levels" data-figma-desktop="43:3083">
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
            onClick={() => {
              setLevel(value);
              setSelectedId(undefined);
            }}
          >
            <PathArtwork
              name={
                index === 0
                  ? "levels-BookOpen1"
                  : index === 1
                    ? "levels-MessageCircle1"
                    : "levels-Globe"
              }
              circle={index === 0 ? "levels-Circle" : "levels-Circle1"}
            />
            <span>
              <strong>{t(`pathUi.levelNames.${value}`)}</strong>
              <small>
                {t("pathUi.unitCount", { count: packs.length })} ·{" "}
                {t(
                  value === current?.track.levelCode
                    ? "pathUi.continueHere"
                    : "pathUi.canBrowse",
                )}
              </small>
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
        <PathArtwork name="levels-Search" />
      </label>
      <div className="path-level-layout">
        <section className="ux-card path-level-list">
          <h2>
            {t("pathUi.unitsInLevel", {
              level: t(`pathUi.levelNames.${level}`),
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
                  className={`path-unit-row${pack.id === featured?.id ? " current" : ""}`}
                  aria-pressed={pack.id === featured?.id}
                  aria-current={pack.id === current?.id ? "step" : undefined}
                  onClick={() => setSelectedId(pack.id)}
                >
                  <PathArtwork
                    name={
                      completedEnglishUnit(pack)
                        ? "levels-Check"
                        : pack.id === featured?.id
                          ? "levels-BookOpen2"
                          : "levels-ChevronLeft1"
                    }
                    circle={
                      completedEnglishUnit(pack) || pack.id === featured?.id
                        ? "levels-Circle2"
                        : "levels-Circle3"
                    }
                  />
                  <span>
                    <strong dir="auto">{pack.title}</strong>
                    <small>
                      {t("pathUi.practicedWords", {
                        count:
                          pack.progress.completed ?? pack.progress.mastered,
                        total: pack.wordCount,
                      })}
                    </small>
                  </span>
                  <span
                    className={`pill ${completedEnglishUnit(pack) || pack.id === current?.id ? "mint" : "lavender"}`}
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
          <p className="path-scroll-hint">
            {t("pathUi.scrollUnits", { count: visible.length })}
          </p>
        </section>
        {featured && (
          <aside className="ux-card path-level-featured">
            <span className="pill mint">
              {t(
                featured.id === current?.id
                  ? "pathUi.continueHere"
                  : "pathUi.canBrowse",
              )}
            </span>
            <p className="path-featured-number">
              {t("englishPath.unit", { number: featured.moduleNumber })}
            </p>
            <h2 dir="auto">
              {featured.title.replace(/^(?:יחידה|Unit)\s+\d+\s*[:·]\s*/iu, "")}
            </h2>
            <p>
              {t("pathUi.practicedWords", {
                count:
                  featured.progress.completed ?? featured.progress.mastered,
                total: featured.wordCount,
              })}
            </p>
            <progress
              max={featured.wordCount || 1}
              value={featured.progress.completed ?? featured.progress.mastered}
              aria-label={t("pathUi.practicedWords", {
                count:
                  featured.progress.completed ?? featured.progress.mastered,
                total: featured.wordCount,
              })}
            />
            <div className="path-level-meeting">
              <PathArtwork name="levels-Mic" />
              <strong>{t("accountUi.teacherMeeting")}</strong>
              <p>
                {upcoming
                  ? t("pathUi.nextMinutes", { count: upcoming.durationMinutes })
                  : t("pathUi.meetingAfterWords")}
              </p>
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
