import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PathArtwork } from "./PathArtwork";
import { englishPathLevels } from "../lib/englishPath";
import type { WordPack } from "../lib/product";

type Station = NonNullable<WordPack["teacherStations"]>[number];
export function EnglishUnitMap({
  current,
  packs,
  nextStation,
  completedStations,
  completedActivities,
  onSelect,
  onWords,
  onAll,
  onActivities,
  stationUrl,
  detailsUrl,
}: {
  current: WordPack;
  packs: WordPack[];
  nextStation?: Station;
  completedStations: Set<string | undefined>;
  completedActivities: number;
  onSelect: (pack: WordPack) => void;
  onWords: () => void;
  onAll: (level?: string) => void;
  onActivities: () => void;
  stationUrl: (station: string) => string;
  detailsUrl: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const levels = englishPathLevels(packs);
  const level = levels.find(({ level }) => level === current.track.levelCode)!;
  const completed = current.progress.completed ?? current.progress.mastered;
  const next = level.packs.find(
    (pack) => pack.moduleNumber > current.moduleNumber,
  );
  const upcoming = (current.teacherStations ?? []).filter(
    (step) =>
      step.station !== nextStation?.station &&
      !completedStations.has(step.station),
  );
  return (
    <>
      <div className="unit-map-selectors">
        <label className="field path-level-select">
          <span>{t("pathUi.chooseLevel")}</span>
          <select
            value={current.track.levelCode}
            onChange={(event) => {
              const selected = levels.find(
                (item) => item.level === event.target.value,
              );
              const pack =
                selected?.packs.find(
                  (pack) =>
                    (pack.progress.completed ?? pack.progress.mastered) <
                    pack.wordCount,
                ) ?? selected?.packs[0];
              if (pack) onSelect(pack);
            }}
          >
            {levels.map((item) => (
              <option
                key={item.level}
                value={item.level}
                disabled={!item.packs.length}
              >
                {t(`pathUi.levelNames.${item.level}`)} ·{" "}
                {t("pathUi.unitCount", { count: item.packs.length })}
              </option>
            ))}
          </select>
          <PathArtwork name="map-ChevronDown" />
        </label>
        <button
          className="button secondary"
          onClick={() => onAll(current.track.levelCode)}
        >
          {t("structuredUi.allUnits")}
        </button>
      </div>
      <section className="unit-roadmap-card" data-figma-desktop="43:2557">
        <header className="unit-roadmap-heading">
          <h2 dir="auto">{current.title}</h2>
          <button
            className="path-disclosure"
            aria-expanded={expanded}
            aria-label={t("pathUi.toggleUnit")}
            onClick={() => setExpanded((value) => !value)}
          >
            <PathArtwork name="map-ChevronDown1" circle="map-Circle" />
          </button>
        </header>
        {expanded && (
          <>
            <div className="unit-roadmap-progress">
              <progress
                max={current.wordCount || 1}
                value={completed}
                aria-label={t("pathUi.completedWords", {
                  count: completed,
                  total: current.wordCount,
                })}
              />
              <span>
                {t("pathUi.completedWords", {
                  count: completed,
                  total: current.wordCount,
                })}
              </span>
            </div>
            <div
              className={`unit-teacher-station${nextStation ? "" : " unit-word-station"}`}
            >
              <span className="unit-station-icon">
                <PathArtwork
                  name={nextStation ? "map-Mic" : "map-BookOpen1"}
                  circle={nextStation ? "map-Circle1" : "map-Circle4"}
                />
              </span>
              <div className="unit-station-copy">
                <p className="eyebrow">
                  {nextStation
                    ? t("pathUi.nextMinutes", {
                        count: nextStation.durationMinutes,
                      })
                    : t("pathUi.nextStep")}
                </p>
                <h3>
                  {nextStation
                    ? t(`pathUi.${nextStation.station}`)
                    : t("pathUi.firstWords")}
                </h3>
                <p>
                  {nextStation
                    ? t("structuredUi.supportedHelp")
                    : t("pathUi.firstWordsHelp")}
                </p>
                <small>
                  {nextStation
                    ? t("structuredUi.answerHelp")
                    : t("pathUi.wordPace")}
                </small>
              </div>
              {nextStation ? (
                <Link
                  className="button primary"
                  to={stationUrl(nextStation.station)}
                >
                  {t("structuredUi.withTeacher")}
                </Link>
              ) : (
                <button className="button primary" onClick={onWords}>
                  {t("pathUi.learnWords")}
                </button>
              )}
              <div className="unit-station-links">
                <Link className="button ghost" to={detailsUrl}>
                  {t("structuredUi.stationDetails")}
                </Link>
                <button className="button ghost" onClick={onWords}>
                  {t("structuredUi.words")}
                </button>
              </div>
            </div>
            {completedActivities > 0 && (
              <button
                className="path-completed button secondary"
                onClick={onActivities}
              >
                <PathArtwork name="map-Check" circle="map-Circle2" />
                <span>
                  {t("pathUi.completedActivities", {
                    count: completedActivities,
                  })}
                </span>
                <PathArtwork name="map-ChevronDown2" circle="map-Circle3" />
              </button>
            )}
            <h3 className="unit-upcoming-heading">{t("pathUi.upcoming")}</h3>
            <div className="unit-upcoming">
              <button className="unit-upcoming-row" onClick={onWords}>
                <PathArtwork name="map-BookOpen1" circle="map-Circle4" />
                <span>
                <strong>{t("pathUi.continueWords")}</strong>
                  <small>{t("pathUi.moreWordsHelp")}</small>
                </span>
                <PathArtwork
                  name="map-GlyphChevronRight"
                  circle="map-Circle5"
                />
              </button>
              {upcoming.map((step) => (
                <Link
                  className="unit-upcoming-row"
                  key={step.station}
                  to={step.available ? stationUrl(step.station) : detailsUrl}
                >
                  <PathArtwork name="map-Mic1" circle="map-Circle6" />
                  <span>
                    <strong>{t(`pathUi.${step.station}`)}</strong>
                    <small>
                      {t("pathUi.meetingThreshold", {
                        count: step.requiredWords,
                        minutes: step.durationMinutes,
                      })}
                    </small>
                  </span>
                  <PathArtwork
                    name="map-GlyphChevronRight"
                    circle="map-Circle5"
                  />
                </Link>
              ))}
              {!upcoming.length && (
                <Link className="unit-upcoming-row" to={detailsUrl}>
                  <PathArtwork name="map-Mic1" circle="map-Circle6" />
                  <span>
                    <strong>{t("pathUi.review")}</strong>
                    <small>{t("pathUi.meetingsHelp")}</small>
                  </span>
                  <PathArtwork
                    name="map-GlyphChevronRight"
                    circle="map-Circle5"
                  />
                </Link>
              )}
            </div>
            <button
              className="button secondary unit-future"
              onClick={() => onAll(current.track.levelCode)}
            >
              <span>
                <strong>{t("structuredUi.nextUnits")}</strong>
                {next && <small dir="auto">{next.title}</small>}
              </span>
              <span className="unit-future-link">
                {t("pathUi.allUnits")} <PathArtwork name="map-ChevronLeft" />
              </span>
              <PathArtwork name="map-ChevronDown3" circle="map-Circle5" />
            </button>
          </>
        )}
      </section>
    </>
  );
}
