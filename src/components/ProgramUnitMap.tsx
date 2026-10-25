import { useId, useState, type ComponentProps, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  CornerDownLeft,
  Info,
  List,
  LockKeyhole,
  Map,
  Mic,
  Play,
  Trophy,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { EnglishUnitMap } from "./EnglishUnitMap";
import {
  programMapModel,
  programUnitTitle,
  type ProgramMapStep,
  type ProgramMapModel,
} from "../lib/programMap";
import { homeworkTaskLink } from "../lib/unitLearningPath";
import "./ProgramUnitMap.css";
import { ProgramMapSidebar } from "./ProgramMapSidebar";
import { englishPathLevels } from "../lib/englishPath";
import {
  LearningPathControls,
  ChoiceMenu,
  PathStepChoice,
  type PathChoiceControl,
} from "./LearningPathControls";
import { useUnitPathChoices } from "./UnitPathChoices";
import { Modal } from "./Modal";

type Props = ComponentProps<typeof EnglishUnitMap> & {
  choices?: PathChoiceControl;
  presentation?: {
    model: ProgramMapModel;
    packs: ComponentProps<typeof EnglishUnitMap>["packs"];
    words: { sourceText: string }[];
    canSelect: (id: string) => boolean;
    tools?: ReactNode;
  };
};
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
  presentation,
  choices: providedChoices,
  onPathChanged,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [startId, setStartId] = useState<string>();
  const [completedOpen, setCompletedOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const id = useId();
  const legacyChoices = useUnitPathChoices(path, onPathChanged);
  const choices =
    providedChoices ??
    (legacyChoices
      ? {
          ...legacyChoices,
          onChoice: (skipped: boolean, key?: string) =>
            legacyChoices.onChoice(
              skipped,
              key?.replace(/-(words|meeting|homework)$/u, ":$1"),
            ),
        }
      : undefined);
  const ready = Boolean(presentation || (path && !pathLoading && !pathError));
  const model: ProgramMapModel | undefined =
    presentation?.model ?? (path ? programMapModel(current, path) : undefined);
  const startStep = model?.steps.find((step) => step.id === startId);
  const programPacks =
    presentation?.packs ??
    englishPathLevels(packs).flatMap((level) => level.packs);
  const returnTo = `/english-learning?unit=${current.id}`;
  const originalTitle = programUnitTitle(current.title);
  const localizedTitle =
    originalTitle === "Building Your First Sentences"
      ? t("programMap.firstTitle")
      : originalTitle;
  const title = (step: ProgramMapStep) =>
    step.kind === "activity"
      ? step.title
      : step.kind === "words"
        ? t("programMap.wordStage", {
            from: `\u2066${step.from}`,
            to: `${step.to}\u2069`,
          })
        : step.kind === "meeting"
          ? t(`pathUi.${step.station.station}`)
          : t("unitMap.followUp");
  const action = (
    step: ProgramMapStep | undefined,
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
    if (step.kind === "activity")
      return (
        <button className={className} onClick={step.onOpen}>
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
  const hasSkips = model?.steps.some((step) => step.skipped);
  const remaining = model
    ? model.steps.filter((step) => !step.complete && !step.skipped).length
    : 0;
  const rest = model?.steps.slice(model.prefix.length) ?? [];
  const initialCount = Math.max(
    3,
    rest.findIndex((step) => step.id === model?.active?.id) + 1,
  );
  const visible = futureOpen ? rest : rest.slice(0, initialCount);
  const openStep = (step: ProgramMapStep) => {
    if (!ready || !step.available) return;
    if (step.kind === "activity") step.onOpen();
    else if (step.kind === "words") onWords();
    else
      navigate(
        step.kind === "meeting"
          ? stationUrl(step.station.station)
          : homeworkTaskLink(
              step.station.homework!.id,
              undefined,
              false,
              returnTo,
            ),
      );
  };
  const row = (step: ProgramMapStep) => {
    const active = model?.active?.id === step.id;
    const Icon = step.complete
      ? Check
      : !step.available
        ? LockKeyhole
        : step.kind === "meeting" ||
            (step.kind === "activity" && step.icon === "meeting")
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
          {step.skipped && (
            <small className="pm-skipped">{t("pathChoices.skipped")}</small>
          )}
          <p>
            {step.kind === "activity"
              ? step.description
              : step.complete
                ? t("unitMap.completed")
                : step.kind === "words"
                  ? t("programMap.wordsHelp")
                  : step.kind === "meeting"
                    ? t("programMap.meetingHelp")
                    : t("unitMap.followUpHelp")}
          </p>
          {!step.complete && !step.available && (
            <p className="pm-lock-reason">
              {step.kind === "activity"
                ? (step.lockReason ?? t("unitMap.previousPreparation"))
                : step.kind === "meeting" && step.station.lockReason === "words"
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
              {step.kind === "activity" && step.minutes !== undefined && (
                <span>
                  <Clock3 size={19} />
                  {t("c1.minutes", { count: step.minutes })}
                </span>
              )}
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
        <div className="pm-step-actions">
          {!step.complete &&
            active &&
            step.available &&
            action(step, t("programMap.continue"))}
          {!step.complete && !active && step.available && ready && (
            <button
              className="pm-start-here"
              type="button"
              disabled={choices?.busy}
              onClick={() => setStartId(step.id)}
              aria-label={`${t("mapChoice.startTitle", { count: step.number })}: ${title(step)}`}
            >
              <CornerDownLeft size={17} aria-hidden="true" />
              {t("pathChoices.startHere")}
            </button>
          )}
          {step.complete &&
            step.kind === "activity" &&
            action(step, t("unitMap.repeat"), "pm-review")}
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
                to={homeworkTaskLink(
                  step.station.homework.id,
                  0,
                  true,
                  returnTo,
                )}
              >
                {t("unitMap.repeat")}
              </Link>
            )}
          {ready && choices && (
            <PathStepChoice
              {...choices}
              onStart={
                !active && step.available
                  ? () => setStartId(step.id)
                  : undefined
              }
              item={{
                key: step.id,
                title: title(step),
                complete: step.complete,
                skipped: Boolean(step.skipped),
              }}
            />
          )}
          {ready && !choices && !step.complete && !active && step.available && (
            <ChoiceMenu
              label={`${t("pathChoices.chooseStep")}: ${title(step)}`}
            >
              {(close) => (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setStartId(step.id);
                  }}
                >
                  {t("pathChoices.startHere")}
                </button>
              )}
            </ChoiceMenu>
          )}
        </div>
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
                    : t(
                        hasSkips
                          ? "pathChoices.routeEnd"
                          : "programMap.unitComplete",
                      ),
                )}
                <p className="pm-encouragement">
                  <Trophy size={27} aria-hidden="true" />
                  {t(
                    remaining
                      ? "programMap.remaining"
                      : hasSkips
                        ? "pathChoices.routeEnd"
                        : "programMap.unitComplete",
                    { count: remaining },
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="pm-load" role={pathError ? "alert" : "status"}>
              <p>{pathError || t("common.loadingFromServer")}</p>
              {pathError && (
                <button className="button secondary" onClick={onRetryPath}>
                  {t("common.tryAgain")}
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
          <div className="path-choice-heading">
            <h2 id={`${id}-roadmap`}>
              <Map aria-hidden="true" />
              {t("programMap.roadmap")}
            </h2>
            {ready && model && choices && (
              <LearningPathControls
                {...choices}
                title={localizedTitle}
                items={model.steps.map((step) => ({
                  key: step.id,
                  title: title(step),
                  complete: step.complete,
                  skipped: Boolean(step.skipped),
                }))}
              />
            )}
          </div>
          {choices?.error && <p role="alert">{choices.error}</p>}
          {!ready ? (
            <p role="status">
              {pathError
                ? t("programMap.pathUnavailable")
                : t("common.loadingFromServer")}
            </p>
          ) : !model?.steps.length ? (
            <p>{t("programMap.noStages")}</p>
          ) : (
            <>
              <p className="pm-map-hint">
                <Info size={16} aria-hidden="true" />
                <span className="pm-desktop-hint">
                  {t("mapChoice.desktopHint")}
                </span>
                <span className="pm-touch-hint">
                  {t("mapChoice.touchHint")}
                </span>
              </p>
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
                  {t(
                    model.steps.some((step) => step.skipped)
                      ? "pathChoices.routeEnd"
                      : "programMap.unitComplete",
                  )}
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
          words={presentation?.words}
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
              <option
                key={pack.id}
                value={pack.id}
                disabled={
                  presentation ? !presentation.canSelect(pack.id) : false
                }
              >
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
        {presentation?.tools}
      </nav>
      <Modal
        open={Boolean(startStep)}
        onClose={() => setStartId(undefined)}
        title={t("mapChoice.startTitle", { count: startStep?.number })}
        size="sm"
        className="pm-start-dialog"
      >
        <div className="modal-body">
          <p className="pm-start-title" dir="auto">
            {startStep && title(startStep)}
          </p>
          <p className="pm-start-note">
            <Info size={20} aria-hidden="true" />
            {t("mapChoice.startBody")}
          </p>
          <div className="pm-dialog-actions">
            <button
              type="button"
              className="button secondary"
              data-autofocus
              onClick={() => setStartId(undefined)}
            >
              {t("feedback.cancel")}
            </button>
            <button
              type="button"
              className="button primary"
              disabled={!startStep?.available || choices?.busy}
              onClick={() => {
                if (startStep) openStep(startStep);
                setStartId(undefined);
              }}
            >
              {t("pathChoices.startHere")}
              <CornerDownLeft size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
