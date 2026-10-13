import { useId, useState, type ComponentProps, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  List,
  LockKeyhole,
  Map,
  Mic,
  Play,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { EnglishUnitMap } from "./EnglishUnitMap";
import {
  programMapModel,
  programUnitTitle,
  type MapStep,
} from "../lib/programMap";
import { homeworkTaskLink } from "../lib/unitLearningPath";
import "./ProgramUnitMap.css";
import { ProgramMapSidebar } from "./ProgramMapSidebar";
import { englishPathLevels } from "../lib/englishPath";

type Props = ComponentProps<typeof EnglishUnitMap>;
export function ProgramUnitMap({
  current,
  packs,
  path,
  pathLoading,
  pathError,
  onRetryPath,
  onWords,
  onAll,
  onActivities,
  onSelect,
  stationUrl,
}: Props) {
  const { t } = useTranslation();
  const [completedOpen, setCompletedOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const id = useId();
  const ready = path && !pathLoading && !pathError;
  const model = path ? programMapModel(current, path) : undefined;
  const programPacks = englishPathLevels(packs).flatMap((level) => level.packs);
  const returnTo = `/english-learning?unit=${current.id}`;
  const originalTitle = programUnitTitle(current.title);
  const localizedTitle =
    originalTitle === "Building Your First Sentences"
      ? t("programMap.firstTitle")
      : originalTitle;
  const title = (step: MapStep) =>
    step.kind === "words"
      ? t("programMap.wordStage", {
          from: `\u2066${step.from}`,
          to: `${step.to}\u2069`,
        })
      : step.kind === "meeting"
        ? t(`pathUi.${step.station.station}`)
        : t("unitMap.followUp");
  const action = (
    step: MapStep | undefined,
    label: string,
    className = "pm-action",
  ): ReactNode => {
    const content = (
      <>
        <Play size={23} fill="currentColor" aria-hidden="true" />
        <span>{label}</span>
      </>
    );
    if (!ready || !step?.available)
      return (
        <button className={className} disabled>
          {content}
        </button>
      );
    if (step.kind === "words")
      return (
        <button className={className} onClick={onWords}>
          {content}
        </button>
      );
    return (
      <Link
        className={className}
        to={
          step.kind === "meeting"
            ? stationUrl(step.station.station)
            : homeworkTaskLink(
                step.station.homework!.id,
                undefined,
                false,
                returnTo,
              )
        }
      >
        {content}
      </Link>
    );
  };
  const remaining = model ? model.steps.length - model.completed : 0;
  const rest = model?.steps.slice(model.prefix.length) ?? [];
  const initialCount = Math.max(
    3,
    rest.findIndex((step) => step.id === model?.active?.id) + 1,
  );
  const visible = futureOpen ? rest : rest.slice(0, initialCount);
  const row = (step: MapStep) => {
    const active = model?.active?.id === step.id;
    const Icon = step.complete
      ? Check
      : !step.available
        ? LockKeyhole
        : step.kind === "meeting"
          ? Mic
          : BookOpen;
    return (
      <li
        key={step.id}
        value={step.number}
        className={`pm-step ${active ? "is-current" : step.complete ? "is-complete" : "is-future"}`}
        aria-current={active ? "step" : undefined}
      >
        <span
          className="pm-step-marker"
          aria-label={t("programMap.step", { count: step.number })}
        >
          {step.complete ? <Check size={23} aria-hidden="true" /> : step.number}
        </span>
        <span className="pm-step-icon">
          <Icon size={26} aria-hidden="true" />
        </span>
        <div className="pm-step-copy">
          <h3>{title(step)}</h3>
          <p>
            {step.complete
              ? t("unitMap.completed")
              : step.kind === "words"
                ? t("programMap.wordsHelp")
                : step.kind === "meeting"
                  ? t("programMap.meetingHelp")
                  : t("unitMap.followUpHelp")}
          </p>
          {!step.complete && !step.available && (
            <p className="pm-lock-reason">
              {step.kind === "meeting" && step.station.lockReason === "words"
                ? t("unitMap.wordsRequired", {
                    count: Math.max(
                      0,
                      step.station.requiredWords - (model?.introduced ?? 0),
                    ),
                  })
                : t(
                    step.kind === "homework"
                      ? step.station.meetingCompleted
                        ? "unitMap.noAssignment"
                        : "unitMap.practiceAfterMeeting"
                      : "unitMap.previousPreparation",
                  )}
            </p>
          )}
          {active && (
            <div className="pm-step-meta">
              {step.kind === "meeting" && (
                <span>
                  <Clock3 size={19} />
                  {t("unitMap.meetingMinutes", {
                    count: step.station.durationMinutes,
                  })}
                </span>
              )}
              {step.kind === "homework" && step.station.homework && (
                <>
                  {step.station.homework.estimatedMinutes !== null &&
                    step.station.homework.estimatedMinutes > 0 && (
                      <span>
                        <Clock3 size={19} />
                        {t("unitMap.practiceMinutes", {
                          count: step.station.homework.estimatedMinutes,
                        })}
                      </span>
                    )}
                  {step.station.homework.taskCount > 0 && (
                    <span>
                      <List size={19} />
                      {t("programMap.exercises", {
                        count: step.station.homework.taskCount,
                      })}
                    </span>
                  )}
                </>
              )}
              {step.kind === "words" && (
                <span>
                  <BookOpen size={19} />
                  {t("programMap.wordCount", {
                    count: step.to - step.from + 1,
                  })}
                </span>
              )}
            </div>
          )}
        </div>
        {active && action(step, t("programMap.continue"))}
        {step.complete && step.kind === "meeting" && ready && (
          <Link className="pm-review" to={stationUrl(step.station.station)}>
            {t("unitMap.repeatMeeting")}
          </Link>
        )}
        {step.complete &&
          step.kind === "homework" &&
          step.station.homework &&
          ready && (
            <Link
              className="pm-review"
              to={homeworkTaskLink(step.station.homework.id, 0, true, returnTo)}
            >
              {t("unitMap.repeat")}
            </Link>
          )}
      </li>
    );
  };
  return (
    <div className="program-unit-map">
      <section className="pm-hero" aria-labelledby={`${id}-title`}>
        <div className="pm-hero-copy">
          <h1 id={`${id}-title`} dir="auto">
            {t("programMap.unit", { count: current.moduleNumber })}:{" "}
            {localizedTitle}
          </h1>
          {localizedTitle !== originalTitle && (
            <p
              className="pm-original-title"
              lang={current.track.sourceLanguageCode}
              dir="auto"
            >
              {originalTitle}
            </p>
          )}
          <p className="pm-description" dir="auto">
            {current.description}
          </p>
          {ready && model ? (
            <>
              <div className="pm-progress">
                <span>
                  {t("programMap.progress", {
                    count: model.completed,
                    total: model.steps.length,
                  })}
                </span>
                <progress
                  max={model.steps.length || 1}
                  value={model.completed}
                  aria-label={t("programMap.progressLabel")}
                />
                <strong>{model.percent}%</strong>
              </div>
              <div className="pm-hero-bottom">
                {action(
                  model.active,
                  model.active
                    ? t("programMap.continueStep", {
                        count: model.active.number,
                      })
                    : t("programMap.unitComplete"),
                )}
                <p className="pm-encouragement">
                  <Trophy size={27} aria-hidden="true" />
                  {t(
                    remaining
                      ? "programMap.remaining"
                      : "programMap.unitComplete",
                    { count: remaining },
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="pm-load" role={pathError ? "alert" : "status"}>
              <p>{pathError || t("common.loading")}</p>
              {pathError && (
                <button className="button secondary" onClick={onRetryPath}>
                  {t("common.retry")}
                </button>
              )}
            </div>
          )}
        </div>
        <img
          className="pm-hero-art"
          src="/assets/program-map/hero.webp"
          alt=""
          width="1774"
          height="887"
          fetchPriority="high"
        />
      </section>
      <div className="pm-layout">
        <section
          className="pm-card pm-roadmap"
          aria-labelledby={`${id}-roadmap`}
        >
          <h2 id={`${id}-roadmap`}>
            <Map aria-hidden="true" />
            {t("programMap.roadmap")}
          </h2>
          {!ready ? (
            <p role="status">
              {pathError
                ? t("programMap.pathUnavailable")
                : t("common.loading")}
            </p>
          ) : !model?.steps.length ? (
            <p>{t("programMap.noStages")}</p>
          ) : (
            <>
              {model.prefix.length > 0 && (
                <div className="pm-completed-group">
                  <button
                    className="pm-completed-toggle"
                    aria-expanded={completedOpen}
                    aria-controls={`${id}-completed`}
                    onClick={() => setCompletedOpen(!completedOpen)}
                  >
                    <span className="pm-completed-check">
                      <Check size={24} />
                    </span>
                    <span className="pm-completed-range" dir="ltr">
                      {model.prefix.length === 1
                        ? "1"
                        : `1–${model.prefix.length}`}
                    </span>
                    <span>
                      <strong>
                        {t("programMap.completedStages", {
                          count: model.prefix.length,
                        })}
                      </strong>
                      <small>{t("programMap.completedHelp")}</small>
                    </span>
                    <ChevronDown className={completedOpen ? "is-open" : ""} />
                  </button>
                  {completedOpen && (
                    <ol className="pm-steps" id={`${id}-completed`}>
                      {model.prefix.map(row)}
                    </ol>
                  )}
                </div>
              )}
              <ol className="pm-steps" id={`${id}-future`}>
                {visible.map(row)}
              </ol>
              {rest.length > initialCount && (
                <button
                  className="pm-more"
                  aria-expanded={futureOpen}
                  aria-controls={`${id}-future`}
                  onClick={() => setFutureOpen(!futureOpen)}
                >
                  <List size={22} />
                  {t(
                    futureOpen ? "programMap.showLess" : "programMap.showMore",
                    { count: rest.length - initialCount },
                  )}
                  <ChevronDown className={futureOpen ? "is-open" : ""} />
                </button>
              )}
              {model.active === undefined && (
                <p role="status" className="pm-finished">
                  <Trophy />
                  {t("programMap.unitComplete")}
                </p>
              )}
            </>
          )}
        </section>
        <ProgramMapSidebar
          current={current}
          path={path}
          pathLoading={pathLoading}
          pathError={pathError}
          ready={Boolean(ready)}
          model={model}
          onWords={onWords}
        />
      </div>
      <nav className="pm-tools" aria-label={t("structuredUi.sections")}>
        <Link to="/courses">{t("pathUi.programTitle")}</Link>
        <label>
          {t("programMap.selectUnit")}
          <select
            value={current.id}
            onChange={(event) => {
              const pack = programPacks.find(
                (p) => p.id === event.target.value,
              );
              if (pack) onSelect(pack);
            }}
          >
            {programPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.title}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => onAll(current.track.levelCode)}>
          {t("structuredUi.allUnits")}
        </button>
        <button onClick={onWords}>{t("structuredUi.words")}</button>
        <button onClick={onActivities}>{t("structuredUi.activities")}</button>
      </nav>
    </div>
  );
}
