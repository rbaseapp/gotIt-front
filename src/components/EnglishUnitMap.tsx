import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { Check, ChevronDown, LockKeyhole, SquarePen } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PathArtwork } from "./PathArtwork";
import { englishPathLevels } from "../lib/englishPath";
import type { WordPack } from "../lib/product";
import { errorMessage } from "../lib/product";
import { courseApi, type Homework } from "../lib/courses";
import {
  homeworkTaskLink,
  type UnitLearningPath,
} from "../lib/unitLearningPath";

type Station = NonNullable<WordPack["teacherStations"]>[number];
export function EnglishUnitMap({
  current,
  packs,
  nextStation,
  completedActivities,
  onSelect,
  onWords,
  onAll,
  onActivities,
  stationUrl,
  path,
  pathLoading,
  pathError,
  onRetryPath,
}: {
  current: WordPack;
  packs: WordPack[];
  nextStation?: Station;
  completedActivities: number;
  onSelect: (pack: WordPack) => void;
  onWords: () => void;
  onAll: (level?: string) => void;
  onActivities: () => void;
  stationUrl: (station: string) => string;
  path?: UnitLearningPath;
  pathLoading: boolean;
  pathError: string;
  onRetryPath: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const id = useId();
  const practiceStation = path?.stations.find(
    (step) =>
      step.station === path.nextAction.station &&
      path.nextAction.kind === "homework",
  );
  const rowStation =
    practiceStation ??
    path?.stations.find((step) => !step.meetingCompleted) ??
    path?.stations.at(-1);
  const remoteHomework = rowStation?.homework;
  const [preparedHomework, setPreparedHomework] = useState<Homework>();
  const [preparingPractice, setPreparingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const preparation = useRef<{ key: string; eventId: string } | undefined>(
    undefined,
  );
  const preparationLock = useRef(false);
  const assignmentId = remoteHomework?.id;
  const assignmentRevision = remoteHomework?.revision;
  const homework =
    preparedHomework &&
    remoteHomework &&
    preparedHomework.id === remoteHomework.id &&
    preparedHomework.revision >= remoteHomework.revision
      ? preparedHomework
      : remoteHomework;
  const preparePractice = async () => {
    if (
      !assignmentId ||
      assignmentRevision === undefined ||
      preparationLock.current
    )
      return;
    preparationLock.current = true;
    const key = `${assignmentId}:${assignmentRevision}`;
    if (preparation.current?.key !== key)
      preparation.current = { key, eventId: crypto.randomUUID() };
    setPreparingPractice(true);
    setPracticeError("");
    try {
      const result = await courseApi.homeworkCommand(assignmentId, "prepare", {
        revision: assignmentRevision,
        eventId: preparation.current.eventId,
      });
      setPreparedHomework(result.homework);
    } catch (error) {
      setPracticeError(errorMessage(error));
    } finally {
      preparationLock.current = false;
      setPreparingPractice(false);
    }
  };
  const prepareOnOpen = useEffectEvent(() => {
    void preparePractice();
  });
  useEffect(() => {
    if (
      meetingOpen &&
      !pathLoading &&
      !pathError &&
      rowStation?.meetingCompleted &&
      homework &&
      (homework.status === "pending" || homework.needsRefresh)
    )
      prepareOnOpen();
  }, [
    meetingOpen,
    rowStation?.meetingCompleted,
    homework,
    pathLoading,
    pathError,
  ]);
  const returnTo = `/english-learning?unit=${current.id}`;
  const nextTask = homework?.tasks.findIndex((task) => !task.done) ?? -1;
  const practiceLink = practiceStation?.homework
    ? homeworkTaskLink(practiceStation.homework.id, undefined, false, returnTo)
    : undefined;
  const ready = Boolean(path && !pathLoading && !pathError);
  const levels = englishPathLevels(packs);
  const level = levels.find(({ level }) => level === current.track.levelCode)!;
  const completed = current.progress.completed ?? current.progress.mastered;
  const next = level.packs.find(
    (pack) => pack.moduleNumber > current.moduleNumber,
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
              className={`unit-teacher-station${nextStation || practiceStation ? "" : " unit-word-station"}`}
            >
              <span className="unit-station-icon">
                <PathArtwork
                  name={nextStation ? "map-Mic" : "map-BookOpen1"}
                  circle={nextStation ? "map-Circle1" : "map-Circle4"}
                />
              </span>
              <div className="unit-station-copy">
                <p className="eyebrow">
                  {practiceStation
                    ? t("unitMap.practiceMinutes", {
                        count: practiceStation.homework?.estimatedMinutes ?? 3,
                      })
                    : nextStation
                      ? t("pathUi.nextMinutes", {
                          count: nextStation.durationMinutes,
                        })
                      : t("pathUi.nextStep")}
                </p>
                <h3>
                  {practiceStation ? (
                    t("unitMap.followUp")
                  ) : nextStation && ready ? (
                    <Link to={stationUrl(nextStation.station)}>
                      {t(`pathUi.${nextStation.station}`)}
                    </Link>
                  ) : (
                    t("pathUi.firstWords")
                  )}
                </h3>
                <p>
                  {practiceStation
                    ? t("unitMap.followUpHelp")
                    : nextStation
                      ? t("structuredUi.supportedHelp")
                      : t("pathUi.firstWordsHelp")}
                </p>
                <small>
                  {practiceStation
                    ? t("unitMap.meetingComplete")
                    : nextStation
                      ? t("structuredUi.answerHelp")
                      : t("pathUi.wordPace")}
                </small>
              </div>
              {practiceLink ? (
                <Link className="button primary" to={practiceLink}>
                  {t("unitMap.continuePractice")}
                </Link>
              ) : practiceStation ? (
                <button className="button primary" disabled>
                  {t("unitMap.continuePractice")}
                </button>
              ) : nextStation && ready ? (
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
            {pathError && (
              <p role="alert" className="unit-path-error">
                {pathError}{" "}
                <button className="button ghost" onClick={onRetryPath}>
                  {t("common.retry")}
                </button>
              </p>
            )}
            <div className="unit-upcoming">
              <div className="unit-map-activity">
                <div className="unit-upcoming-row">
                  <PathArtwork name="map-BookOpen1" circle="map-Circle4" />
                  <span className="unit-activity-copy">
                    <strong>{t("pathUi.continueWords")}</strong>
                    <small>{t("pathUi.moreWordsHelp")}</small>
                  </span>
                  <button
                    className="button secondary unit-entry"
                    onClick={onWords}
                  >
                    {t("unitMap.enterPractice")}
                  </button>
                  <button
                    className="unit-detail-toggle"
                    aria-expanded={wordsOpen}
                    aria-controls={`${id}-words`}
                    aria-label={t("unitMap.toggleWords")}
                    onClick={() => setWordsOpen((value) => !value)}
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
                {wordsOpen && (
                  <div id={`${id}-words`} className="unit-activity-detail">
                    {pathLoading ? (
                      <p role="status">{t("common.loading")}</p>
                    ) : (
                      <>
                        <p className="unit-detail-caption">
                          {t("unitMap.currentWords", {
                            count: path?.words.length ?? 0,
                          })}
                        </p>
                        <ul className="unit-stage-words">
                          {path?.words.map((word, index) => (
                            <li key={`${word.sourceText}-${index}`}>
                              <strong
                                lang={current.track.sourceLanguageCode}
                                dir="auto"
                              >
                                {word.sourceText}
                              </strong>
                              <span
                                lang={current.track.translationLanguageCode}
                                dir="auto"
                              >
                                {word.translationText}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {!path?.words.length && !pathError && (
                          <p>{t("unitMap.noStageWords")}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="unit-map-activity">
                <div className="unit-upcoming-row">
                  <PathArtwork name="map-Mic1" circle="map-Circle6" />
                  <span className="unit-activity-copy">
                    <strong>
                      {rowStation
                        ? t(`pathUi.${rowStation.station}`)
                        : t("pathUi.review")}
                    </strong>
                    <small>
                      {rowStation?.meetingCompleted
                        ? t("unitMap.meetingComplete")
                        : t("unitMap.meetingMinutes", {
                            count: rowStation?.durationMinutes ?? 10,
                          })}
                    </small>
                    <small>
                      {rowStation?.meetingCompleted
                        ? t("unitMap.followUpHelp")
                        : rowStation?.lockReason === "previous_preparation"
                          ? t("unitMap.previousPreparation")
                          : !rowStation?.available
                            ? t("unitMap.wordsRequired", {
                                count: Math.max(
                                  0,
                                  (rowStation?.requiredWords ?? 0) -
                                    (current.progress.introduced ?? 0),
                                ),
                              })
                            : t("unitMap.practiceAfterMeeting")}
                    </small>
                  </span>
                  {rowStation?.available && !pathLoading && !pathError ? (
                    <Link
                      className="button secondary unit-entry"
                      to={stationUrl(rowStation.station)}
                    >
                      {t(
                        rowStation.meetingCompleted
                          ? "unitMap.repeatMeeting"
                          : "unitMap.enterMeeting",
                      )}
                    </Link>
                  ) : (
                    <button className="button secondary unit-entry" disabled>
                      {t("unitMap.enterMeeting")}
                    </button>
                  )}
                  <button
                    className="unit-detail-toggle"
                    aria-expanded={meetingOpen}
                    aria-controls={`${id}-meeting`}
                    aria-label={t("unitMap.toggleExercises")}
                    onClick={() => setMeetingOpen((value) => !value)}
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
                {meetingOpen && (
                  <div id={`${id}-meeting`} className="unit-activity-detail">
                    <p className="unit-detail-caption">
                      {t("unitMap.meetingExercises")}
                    </p>
                    {!ready ? (
                      <p role="status">{pathError || t("common.loading")}</p>
                    ) : !rowStation?.meetingCompleted ? (
                      <p className="unit-practice-gate">
                        <LockKeyhole size={20} aria-hidden="true" />
                        {t("unitMap.practiceAfterMeeting")}
                      </p>
                    ) : !homework ? (
                      <p>{t("unitMap.noAssignment")}</p>
                    ) : preparingPractice ? (
                      <p role="status">{t("courses.preparingHomework")}</p>
                    ) : practiceError ? (
                      <div role="alert">
                        <p>{practiceError}</p>
                        <button
                          className="button secondary unit-entry"
                          onClick={() => void preparePractice()}
                        >
                          {t("common.retry")}
                        </button>
                      </div>
                    ) : !homework.tasks.length ? (
                      <Link
                        className="button secondary unit-entry"
                        to={homeworkTaskLink(
                          homework.id,
                          undefined,
                          false,
                          returnTo,
                        )}
                      >
                        {t("unitMap.preparePractice")}
                      </Link>
                    ) : (
                      <ul className="unit-follow-up-list">
                        {homework.tasks.map((task, index) => {
                          const available = index === nextTask;
                          return (
                            <li
                              key={index}
                              className={
                                available
                                  ? "is-available"
                                  : task.done
                                    ? "is-completed"
                                    : "is-locked"
                              }
                            >
                              {task.done ? (
                                <Check size={21} aria-hidden="true" />
                              ) : available ? (
                                <SquarePen size={21} aria-hidden="true" />
                              ) : (
                                <LockKeyhole size={21} aria-hidden="true" />
                              )}
                              <span className="unit-exercise-copy">
                                <strong dir="auto">{task.objective}</strong>
                                <small>
                                  {t(
                                    task.done
                                      ? "unitMap.completed"
                                      : available
                                        ? "unitMap.available"
                                        : "unitMap.locked",
                                  )}
                                </small>
                              </span>
                              {task.done || available ? (
                                <Link
                                  className={`button ${task.done ? "secondary" : "primary"} unit-task-entry`}
                                  to={homeworkTaskLink(
                                    homework.id,
                                    index,
                                    task.done,
                                    returnTo,
                                  )}
                                >
                                  {t(
                                    task.done
                                      ? "unitMap.repeat"
                                      : "unitMap.enterPractice",
                                  )}
                                </Link>
                              ) : (
                                <span className="unit-locked-label">
                                  {t("unitMap.previousExercise")}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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
