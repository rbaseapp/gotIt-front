import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Headphones, Mic, Pause, Save, Volume2 } from "lucide-react";
import { RemoteState } from "../components/RemoteState";
import { CurriculumPicture } from "../components/CurriculumPicture";
import { useResource } from "../lib/useResource";
import {
  curriculumApi,
  type CurriculumAttempt,
  type CurriculumArticle,
  type CurriculumUnit,
  type CurriculumTeacher,
  type PhonicsSession,
} from "../lib/structuredEnglish";
import { errorMessage } from "../lib/product";
import { chooseProgram } from "../lib/learningNavigation";
import { useApp } from "../context/AppContext";
import { recordVoice } from "../lib/voice";
import { ProgramUnitMap } from "../components/ProgramUnitMap";
import { UnitLevels } from "../components/UnitLevels";
import { UnitWordBrowser } from "../components/UnitWordBrowser";
import { PathArtwork } from "../components/PathArtwork";
import {
  curriculumDisplayPacks,
  curriculumDisplayEntries,
  curriculumRoadmap,
} from "../lib/structuredEnglishPresentation";
import "../courses.css";

const bands = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];
const games = ["recognition", "matching", "recall", "listening", "context"];
type Operation = { key: string; id: string; revision?: number };

export function StructuredEnglishPage() {
  const { t } = useTranslation(),
    { user } = useApp();
  const resource = useResource(useCallback(() => curriculumApi.get(), []));
  const data = resource.data;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view =
      params.get("view") ??
      (params.get("all") === "1" ? "levels" : params.get("tab")) ??
      "map",
    unitId =
      params.get("unit") === "C1E"
        ? view === "words"
          ? "C1E"
          : (data?.currentUnit ?? "P01")
        : (data?.units.find((item) => item.id === params.get("unit"))?.id ??
          data?.currentUnit ??
          "P01");
  const [unit, setUnit] = useState<CurriculumUnit>();
  const [teacher, setTeacher] = useState<CurriculumTeacher>();
  const [phonics, setPhonics] = useState<PhonicsSession>();
  const [article, setArticle] = useState<CurriculumArticle>();
  const [unseen, setUnseen] = useState<{
    id: string;
    title: string;
    passage: string;
    previouslyAttempted: boolean;
  }>();
  const [attempt, setAttempt] = useState<CurriculumAttempt>();
  const [answer, setAnswer] = useState(""),
    [hint, setHint] = useState(""),
    [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [minutes, setMinutes] = useState(20),
    [literacy, setLiteracy] = useState<
      "starting" | "developing" | "independent"
    >("starting");
  const [placementBand, setPlacementBand] = useState("A1");
  const [wordBatch, setWordBatch] = useState(0);
  const [recording, setRecording] = useState(false),
    [transcription, setTranscription] = useState<{
      id: string;
      text: string;
    }>();
  const operation = useRef<Operation | null>(null),
    audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingAbort = useRef<AbortController | null>(null),
    releaseRecording = useRef<AbortController | null>(null);
  const focusRef = useRef<HTMLHeadingElement>(null);
  const lessonId = params.get("lesson") ?? `${unitId}-L1`,
    phonicsId = params.get("phonics") ?? "F01";
  const activityId =
    view === "attempt" && attempt
      ? `attempt:${attempt.id}`
      : view === "teacher"
        ? `teacher:${lessonId}`
        : view === "phonics"
          ? `phonics:${phonicsId}`
          : view === "text"
            ? `text:${unitId}`
            : view === "unseen" && params.get("unseen")
              ? `unseen:${params.get("unseen")}`
              : view === "article" && params.get("article")
                ? `article:${params.get("article")}`
                : `unit:${unitId}`;
  const eventFor = (key: string) => {
    if (operation.current?.key !== key)
      operation.current = { key, id: crypto.randomUUID() };
    return operation.current.id;
  };
  const commandFor = async (key: string) => {
    const eventId = eventFor(key);
    const revision = operation.current!.revision ?? (await refreshRevision());
    operation.current!.revision = revision;
    return { eventId, revision };
  };
  const go = (next: Record<string, string>) => {
    if (next.unit && next.unit !== unitId) setWordBatch(0);
    setFeedback("");
    setHint("");
    setAnswer("");
    setTranscription(undefined);
    setError("");
    setParams(next);
  };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      operation.current = null;
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const fresh = async () => {
    await resource.reload();
  };
  const refreshRevision = async () => (await curriculumApi.get()).revision;
  useEffect(() => {
    chooseProgram("english-zero-c1", user, "en");
  }, [user]);
  useEffect(() => {
    focusRef.current?.focus();
  }, [view, attempt?.cursor, teacher?.cursor]);
  useEffect(
    () => () => {
      recordingAbort.current?.abort();
      audioRef.current?.pause();
    },
    [],
  );
  useEffect(() => {
    if (!data?.enrolled) return;
    let disposed = false;
    const pulse = () => {
      if (!disposed && document.visibilityState === "visible" && !busy)
        void curriculumApi.heartbeat(activityId).catch(() => {});
    };
    pulse();
    const timer = window.setInterval(pulse, 20000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [data?.enrolled, activityId, busy]);
  useEffect(() => {
    if (!data?.enrolled || !["map", "words", "text"].includes(view)) return;
    let active = true;
    void curriculumApi
      .unit(unitId)
      .then((value) => {
        if (active) setUnit(value.unit);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [data?.enrolled, unitId, view, data?.revision]);
  useEffect(() => {
    if (!data?.enrolled) return;
    let active = true;
    const accept =
      <T,>(setter: (value: T) => void) =>
      (value: T) => {
        if (active) setter(value);
      };
    let load: Promise<unknown> | undefined;
    if (view === "teacher")
      load = curriculumApi.teacher(lessonId).then((value) => {
        if (active) {
          setTeacher(value);
          setAnswer(data.drafts[`teacher:${lessonId}`] ?? "");
        }
      });
    if (view === "phonics")
      load = curriculumApi.phonics(phonicsId).then((value) => {
        if (active) setPhonics(value.session);
      });
    if (view === "article" && params.get("article"))
      load = curriculumApi
        .article(params.get("article")!)
        .then(accept(setArticle));
    if (view === "unseen" && params.get("unseen"))
      load = curriculumApi
        .unseen(params.get("unseen")!)
        .then(accept(setUnseen));
    if (view === "attempt" && params.get("attempt"))
      load = curriculumApi.attempt(params.get("attempt")!).then((value) => {
        if (active) {
          setAttempt(value);
          setAnswer(data.drafts[value.activityId] ?? "");
        }
      });
    void load?.catch((reason) => {
      if (active) setError(errorMessage(reason));
    });
    return () => {
      active = false;
    };
  }, [data?.enrolled, view, lessonId, phonicsId, params, data?.drafts]);
  const play = async (value: { contentType: string; audioBase64: string }) => {
    audioRef.current?.pause();
    const bytes = Uint8Array.from(atob(value.audioBase64), (char) =>
      char.charCodeAt(0),
    );
    const url = URL.createObjectURL(
      new Blob([bytes], { type: value.contentType }),
    );
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
  };
  const start = (id: string) =>
    run(async () => {
      const { revision, eventId } = await commandFor(`start:${id}`);
      const next = await curriculumApi.start(revision, id, eventId);
      setAttempt(next);
      go({ view: "attempt", attempt: next.id, unit: unitId });
      await fresh();
    });
  const submit = (choiceId?: string) =>
    run(async () => {
      if (!attempt?.question) return;
      const key = JSON.stringify([
        "answer",
        attempt.id,
        attempt.cursor,
        answer,
        choiceId,
        transcription?.id,
      ]);
      const { revision, eventId } = await commandFor(key);
      const next = await curriculumApi.answer(
        revision,
        attempt.id,
        attempt.cursor,
        answer,
        choiceId,
        transcription?.text === answer ? transcription.id : undefined,
        eventId,
      );
      setAttempt(next);
      setAnswer("");
      setTranscription(undefined);
      setHint("");
      await fresh();
    });
  const record = async () => {
    if (recording) {
      releaseRecording.current?.abort();
      return;
    }
    if (!attempt?.question || busy) return;
    setError("");
    setRecording(true);
    const controller = new AbortController(),
      release = new AbortController();
    recordingAbort.current = controller;
    releaseRecording.current = release;
    try {
      const wav = await recordVoice(
        controller.signal,
        release.signal,
        90,
        true,
      );
      setRecording(false);
      setBusy(true);
      const result = await curriculumApi.transcribe(
        attempt.id,
        attempt.cursor,
        wav,
      );
      setTranscription(result);
      setAnswer(result.text);
      setFeedback(result.note);
    } catch (reason) {
      if (!controller.signal.aborted) setError(errorMessage(reason));
    } finally {
      setRecording(false);
      setBusy(false);
    }
  };
  const showDone = (id: string) => Boolean(data?.completed[id]);
  const selectedUnit = data?.units.find((item) => item.id === unitId);
  const saveDraft = () =>
    run(async () => {
      if (!attempt) return;
      const { revision, eventId } = await commandFor(
        `draft:${attempt.id}:${answer}`,
      );
      await curriculumApi.save(revision, attempt.activityId, answer, eventId);
      setFeedback(t("c1.saved"));
      await fresh();
    });
  const continuePath = () => {
    const next = data?.nextAction;
    if (!next) return;
    if (next.kind === "practice") {
      void start(next.id);
      return;
    }
    if (next.kind === "attempt") {
      go({ view: "attempt", attempt: next.id, unit: unitId });
      return;
    }
    if (next.kind === "teacher") {
      go({ view: "teacher", lesson: next.id, unit: data!.currentUnit });
      return;
    }
    if (next.kind === "phonics") {
      go({ view: "phonics", phonics: next.id, unit: data!.currentUnit });
      return;
    }
    if (next.kind === "unseen") {
      go({ view: "unseen", unseen: next.id, unit: data!.currentUnit });
      return;
    }
    if (next.kind === "words") {
      go({ view: "words", unit: next.id });
      setWordBatch(next.batch ?? 0);
      return;
    }
  };
  const settings = (enrolled = false) => (
    <div className="unit-lesson-preferences">
      <label>
        {t("c1.dailyTime")}
        <select
          value={enrolled ? (data?.settings?.minutes ?? minutes) : minutes}
          onChange={(event) => {
            const value = Number(event.target.value);
            setMinutes(value);
            if (enrolled)
              void run(async () => {
                await curriculumApi.enroll(value, data!.settings!.literacy);
                await fresh();
              });
          }}
        >
          {[10, 20, 30, 45, 60].map((value) => (
            <option key={value} value={value}>
              {t("c1.minutes", { count: value })}
            </option>
          ))}
        </select>
      </label>
      {!enrolled && (
        <label>
          {t("c1.readingStartingPoint")}
          <select
            value={literacy}
            onChange={(event) =>
              setLiteracy(event.target.value as typeof literacy)
            }
          >
            {(["starting", "developing", "independent"] as const).map(
              (value) => (
                <option key={value} value={value}>
                  {t(`c1.literacy.${value}`)}
                </option>
              ),
            )}
          </select>
        </label>
      )}
    </div>
  );
  const displayPacks = data ? curriculumDisplayPacks(data) : [];
  const displayPack = displayPacks.find((pack) => pack.id === unitId);
  const displayEntries = unit ? curriculumDisplayEntries(unit) : [];
  const suppliedContent = useMemo(
    () => ({
      knownLabel: t("c1.introduceWord"),
      knownHelp: t("c1.wordInstructions"),
    }),
    [t],
  );
  const openActivity = (id: string, batch?: number) => {
    const [kind, target, game] = id.split(":");
    if (kind === "words" && !game) {
      go({ view: "words", unit: target });
      setWordBatch(batch ?? 0);
    } else if (kind === "teacher") {
      const minutes = data?.settings?.minutes ?? 20;
      navigate(
        `/private-lesson?curriculum=${encodeURIComponent(target)}&language=en&minutes=${minutes === 10 ? 5 : minutes === 20 ? 10 : minutes === 45 ? 15 : 20}&return=${encodeURIComponent(`/english-learning?unit=${unitId}`)}`,
      );
    } else if (["phonics", "unseen", "text"].includes(kind)) {
      go({
        view: kind,
        unit: unitId,
        [kind === "text" ? "unit" : kind]: target,
      });
    } else void start(id);
  };
  const mapReady = data?.enrolled && unit?.id === unitId && displayPack;
  const showMap = view === "map" && data?.enrolled;
  const mapModel =
    data && unit
      ? curriculumRoadmap(
          data,
          unit,
          (key, values) => String(t(key, values)),
          openActivity,
        )
      : undefined;
  const displayTitle =
    view === "map"
      ? t("structuredUi.mapTitle")
      : view === "levels"
        ? t("structuredUi.allUnits")
        : view === "activities"
          ? t("structuredUi.activities")
          : view === "words"
            ? t("structuredUi.words")
            : view === "attempt"
              ? t("courses.homework")
              : view === "teacher"
                ? t("c1.teacher")
                : view === "settings"
                  ? t("lessonPrep.preferences")
                  : t(`c1.tabs.${view}`, { defaultValue: t("c1.unitReading") });
  return (
    <div
      className={
        view === "attempt"
          ? "course-page homework-page"
          : `english-path-page live-page page-enter path-view-${view}${showMap ? " dev-program-map" : ""}`
      }
      dir="rtl"
      aria-busy={busy}
    >
      {view === "attempt" && (
        <header className="course-page-heading">
          <div>
            <p className="eyebrow">{t("courses.homework")}</p>
            <h1>{selectedUnit?.title}</h1>
          </div>
          <button
            className="course-text-link"
            onClick={() => go({ view: "map", unit: unitId })}
          >
            {t("pathUi.backToMap")}
          </button>
        </header>
      )}
      {!showMap && view !== "attempt" && (
        <header className="path-page-header">
          <button
            className="button ghost path-back"
            onClick={() => go({ view: "map", unit: unitId })}
          >
            <PathArtwork name="levels-ChevronLeft" />
            {t("pathUi.backToMap")}
          </button>
          <Link className="button secondary path-program" to="/courses">
            {t("pathUi.programTitle")}
            <PathArtwork name="map-ChevronDown" />
          </Link>
          <h1>{displayTitle}</h1>
          <p dir="auto">{selectedUnit?.title ?? unit?.title}</p>
          {view === "words" && unit && (
            <button
              className="button primary path-practice"
              disabled={busy || !unit.games.some((game) => game.eligible > 0)}
              onClick={() =>
                void start(
                  `words:${unitId}:${(data?.nextAction?.kind === "words" && data.nextAction.id === unitId ? data.nextAction.game : undefined) ?? unit.games.find((game) => game.eligible > 0)?.mode ?? "recognition"}`,
                )
              }
            >
              {t("dashboard.smartPractice")}
            </button>
          )}
        </header>
      )}
      <RemoteState
        loading={resource.loading && !data}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {error && (
        <div className="course-error" role="alert">
          {error}
          <button className="button ghost" onClick={() => void run(fresh)}>
            {t("common.tryAgain")}
          </button>
        </div>
      )}
      {busy && (
        <p className="course-note" role="status">
          {t("c1.working")}
        </p>
      )}
      {feedback && (
        <p className="homework-feedback correct" role="status">
          {feedback}
        </p>
      )}
      {data && !data.enrolled && (
        <section className="ux-card">
          <h2>{data.program.title}</h2>
          <p>{t("c1.welcomeBody")}</p>
          {settings()}
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await curriculumApi.enroll(
                  minutes,
                  literacy,
                  eventFor(`enroll:${minutes}:${literacy}`),
                );
                await fresh();
              })
            }
          >
            {t("c1.begin")}
          </button>
        </section>
      )}
      {data?.enrolled && (
        <>
          {["words", "activities"].includes(view) && (
            <nav
              className="unit-map-tabs"
              aria-label={t("structuredUi.sections")}
            >
              {["map", "words", "activities"].map((name) => (
                <button
                  key={name}
                  className={view === name ? "active" : ""}
                  aria-current={view === name ? "page" : undefined}
                  disabled={busy || recording}
                  onClick={() => go({ view: name, unit: unitId })}
                >
                  <BookOpen size={22} />
                  {t(`structuredUi.${name}`)}
                </button>
              ))}
            </nav>
          )}
          {showMap &&
            (!mapReady || !mapModel ? (
              <RemoteState
                loading={!error}
                error={error}
                retry={() => void fresh()}
              />
            ) : (
              <ProgramUnitMap
                key={unitId}
                current={displayPack}
                packs={displayPacks}
                completedActivities={mapModel.completed}
                pathLoading={false}
                pathError=""
                onRetryPath={() => void fresh()}
                onSelect={(pack) => go({ view: "map", unit: pack.id })}
                onWords={() => go({ view: "words", unit: unitId })}
                onAll={() => go({ view: "levels", unit: unitId })}
                onActivities={() => go({ view: "activities", unit: unitId })}
                stationUrl={() => ""}
                presentation={{
                  model: mapModel,
                  packs: displayPacks,
                  words: unit.words.map((word) => ({ sourceText: word.en })),
                  canSelect: (id) =>
                    Boolean(
                      data.units.find((item) => item.id === id)?.unlocked,
                    ),
                  tools: (
                    <>
                      <button
                        onClick={() => go({ view: "placement", unit: unitId })}
                      >
                        {t("c1.tabs.placement")}
                      </button>
                      <button
                        onClick={() => go({ view: "settings", unit: unitId })}
                      >
                        {t("lessonPrep.preferences")}
                      </button>
                      <button
                        onClick={() => go({ view: "sources", unit: unitId })}
                      >
                        {t("c1.tabs.sources")}
                      </button>
                    </>
                  ),
                }}
              />
            ))}
          {view === "levels" && (
            <UnitLevels
              packs={displayPacks}
              current={displayPack}
              onOpen={(pack) => go({ view: "map", unit: pack.id })}
              onWords={(pack) => go({ view: "words", unit: pack.id })}
              canOpen={(pack) =>
                Boolean(
                  data.units.find((item) => item.id === pack.id)?.unlocked,
                )
              }
            />
          )}
          {view === "settings" && (
            <section className="ux-card unit-lesson-preferences">
              {settings(true)}
              <p>
                {data.dailyPlan
                  .map(
                    (part) =>
                      `${t(`c1.plan.${part.kind}`)} ${t("c1.minutes", { count: part.minutes })}`,
                  )
                  .join(" · ")}
              </p>
            </section>
          )}
          {view === "activities" && (
            <div className="unit-browser unit-activity-browser">
              <section className="unit-activity-list ux-card">
                <h2>{t("structuredUi.activities")}</h2>
                {Object.entries(data.activeAttempts).map(([activity, id]) => (
                  <button
                    className="unit-activity-row"
                    key={id}
                    onClick={() =>
                      go({ view: "attempt", attempt: id, unit: unitId })
                    }
                  >
                    <span>
                      <strong>{t("c1.resume")}</strong>
                      <small>
                        {data.units.find((item) => activity.includes(item.id))
                          ?.title ?? t("c1.practice")}
                      </small>
                    </span>
                  </button>
                ))}
                {data.nextAction && (
                  <button
                    className="button primary"
                    onClick={continuePath}
                    disabled={busy}
                  >
                    {t("c1.nextActivity")}
                  </button>
                )}
                <button
                  className="button secondary"
                  disabled={busy || !data.review.due}
                  onClick={() => void start("review:due")}
                >
                  {t("c1.reviewDue", { count: data.review.due })}
                </button>
              </section>
              <aside className="unit-activity-detail ux-card">
                <h2>{t("c1.unitReading")}</h2>
                <p>
                  {t("c1.readingCadence", {
                    targets: data.reading.remainingTargets,
                    minutes: data.reading.remainingMinutes,
                  })}
                </p>
                <button
                  className="button primary"
                  disabled={busy || !data.reading.eligible}
                  onClick={() =>
                    void run(async () => {
                      const { revision, eventId } = await commandFor("article");
                      const result = await curriculumApi.generateArticle(
                        revision,
                        eventId,
                      );
                      setArticle(result);
                      go({ view: "article", article: result.id, unit: unitId });
                      await fresh();
                    })
                  }
                >
                  {t("c1.newReading")}
                </button>
                {data.articleJob && (
                  <button
                    className="button secondary"
                    onClick={() =>
                      go({
                        view: "article",
                        article: data.articleJob!,
                        unit: unitId,
                      })
                    }
                  >
                    {t("c1.openReading")}
                  </button>
                )}
              </aside>
            </div>
          )}
          {view === "words" && unit?.id === unitId && (
            <>
              <UnitWordBrowser
                key={`${unit.id}:${wordBatch}`}
                packId={unit.id}
                entries={displayEntries.slice(wordBatch * 6, wordBatch * 6 + 6)}
                language="en"
                supportLanguage="he"
                busy={busy}
                suppliedContent={suppliedContent}
                onKnown={(entry) =>
                  void run(async () => {
                    const { revision, eventId } = await commandFor(
                      `expose:${entry.id}`,
                    );
                    await curriculumApi.expose(revision, [entry.id], eventId);
                    await fresh();
                  })
                }
              />
              <div className="path-word-tools">
                <button
                  className="button ghost"
                  disabled={wordBatch === 0}
                  onClick={() => setWordBatch((value) => value - 1)}
                >
                  {t("c1.previousGroup")}
                </button>
                <span>
                  {wordBatch + 1} / {Math.ceil(unit.words.length / 6)}
                </span>
                <button
                  className="button ghost"
                  disabled={(wordBatch + 1) * 6 >= unit.words.length}
                  onClick={() => setWordBatch((value) => value + 1)}
                >
                  {t("c1.nextGroup")}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const ids = unit.words
                        .slice(wordBatch * 6, wordBatch * 6 + 6)
                        .map((word) => word.id);
                      const { revision, eventId } = await commandFor(
                        `expose:${ids.join(",")}`,
                      );
                      await curriculumApi.expose(revision, ids, eventId);
                      await fresh();
                    })
                  }
                >
                  {t("c1.introduceGroup")}
                </button>
                {games.map((game) => (
                  <button
                    key={game}
                    className="button secondary"
                    disabled={
                      busy ||
                      !unit.games.find((item) => item.mode === game)?.eligible
                    }
                    onClick={() => void start(`words:${unitId}:${game}`)}
                  >
                    {t(`c1.games.${game}`)}{" "}
                    <span>
                      {unit.games.find((item) => item.mode === game)
                        ?.practised ?? 0}{" "}
                      / {unit.words.filter((word) => word.evidence).length}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "teacher" && teacher?.id === lessonId && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {teacher.title}
              </h2>
              <p>
                {teacher.cursor + 1} / {teacher.total} {t("c1.splitLesson")}
              </p>
              {!teacher.complete && (
                <Link
                  className="button secondary"
                  to={`/private-lesson?curriculum=${lessonId}&language=en&minutes=${data.settings?.minutes === 10 ? 5 : data.settings?.minutes === 20 ? 10 : data.settings?.minutes === 45 ? 15 : 20}&return=${encodeURIComponent(`/english-learning?view=teacher&lesson=${lessonId}&unit=${unitId}`)}`}
                >
                  <Mic size={18} />
                  {t("c1.voiceTeacher")}
                </Link>
              )}
              {teacher.complete ? (
                <p className="course-note">{t("c1.lessonComplete")}</p>
              ) : (
                teacher.phase && (
                  <>
                    <p className="course-note">{teacher.phase.instruction}</p>
                    {teacher.phase.english && (
                      <p className="unit-sentence" lang="en" dir="ltr">
                        {teacher.phase.english}
                      </p>
                    )}
                    {teacher.phase.contrast && (
                      <p className="unit-sentence" lang="en" dir="ltr">
                        {teacher.phase.contrast}
                      </p>
                    )}
                    {teacher.phase.turns?.map((turn, index) => (
                      <div className="course-chat-bubble assistant" key={index}>
                        <p lang="en" dir="ltr">
                          {turn.text_en}
                        </p>
                        <small>{turn.text_he}</small>
                      </div>
                    ))}
                    {teacher.phase.support && (
                      <details>
                        <summary>{t("c1.support")}</summary>
                        {teacher.phase.support.map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </details>
                    )}
                    {teacher.phase.passage && (
                      <p className="unit-sentence" lang="en" dir="ltr">
                        {teacher.phase.passage}
                      </p>
                    )}
                    {teacher.phase.task && <p>{teacher.phase.task}</p>}
                    <label className="field">
                      {t("c1.answerOrAsk")}
                      <textarea
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        rows={4}
                        dir="auto"
                      />
                    </label>
                    <div className="homework-support-actions">
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const text = answer.trim() || t("c1.understood");
                            const { revision, eventId } = await commandFor(
                              `teacher:${lessonId}:${teacher.cursor}:${text}`,
                            );
                            const result = await curriculumApi.teacherTurn(
                              revision,
                              lessonId,
                              text,
                              eventId,
                            );
                            setFeedback(result.feedback);
                            setAnswer("");
                            setTeacher(await curriculumApi.teacher(lessonId));
                            await fresh();
                          })
                        }
                      >
                        {t("c1.sendContinue")}
                      </button>
                      <button
                        className="button ghost"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await curriculumApi.save(
                              await refreshRevision(),
                              `teacher:${lessonId}`,
                              answer,
                            );
                            setFeedback(t("c1.saved"));
                            await fresh();
                          })
                        }
                      >
                        <Save size={18} />
                        {t("c1.savePause")}
                      </button>
                    </div>
                  </>
                )
              )}
              <button
                className="button secondary"
                disabled={busy || !showDone(`teacher:${lessonId}`)}
                onClick={() => void start(`post:${lessonId}`)}
              >
                {t("c1.postlesson")}
              </button>
            </section>
          )}
          {view === "phonics" && (
            <div className="unit-browser">
              <nav
                className="unit-browser-list ux-card"
                aria-label={t("c1.tabs.phonics")}
              >
                {data.phonics.map((item) => (
                  <button
                    className={`button ${item.id === phonicsId ? "primary" : "ghost"}`}
                    key={item.id}
                    disabled={!item.unlocked || busy}
                    onClick={() =>
                      go({ view: "phonics", phonics: item.id, unit: unitId })
                    }
                  >
                    {item.id} {item.title}{" "}
                    {showDone(`phonics:${item.id}`) && ""}
                  </button>
                ))}
              </nav>
              {phonics?.id === phonicsId && (
                <section className="homework-task-card">
                  <h2 ref={focusRef} tabIndex={-1}>
                    {phonics.title}
                  </h2>
                  <div className="homework-choices">
                    {phonics.mappings.map((mapping, index) => (
                      <button
                        className="button secondary"
                        key={`${mapping.grapheme}:${index}`}
                        disabled={busy}
                        onClick={() =>
                          void run(async () =>
                            play(
                              await curriculumApi.teachingAudio(
                                "phonics",
                                phonics.id,
                                index,
                              ),
                            ),
                          )
                        }
                      >
                        <strong lang="en" dir="ltr">
                          {mapping.grapheme}
                        </strong>
                        <span dir="ltr">{mapping.phoneme}</span>
                        <Volume2 size={18} />
                      </button>
                    ))}
                  </div>
                  {phonics.script.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                  <p className="unit-sentence" lang="en" dir="ltr">
                    {phonics.sentence}
                  </p>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () =>
                        play(
                          await curriculumApi.teachingAudio(
                            "phonics",
                            phonics.id,
                            phonics.mappings.length,
                          ),
                        ),
                      )
                    }
                  >
                    <Headphones size={18} />
                    {t("c1.listenModel")}
                  </button>
                  <div className="homework-support-actions">
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void start(`phonics:${phonics.id}`)}
                    >
                      {t("c1.phonicsPractice")}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}
          {view === "text" && unit?.id === unitId && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {unit.title}
              </h2>
              <p className="unit-sentence" dir="ltr" lang="en">
                {unit.passage}
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void start(`text:${unitId}`)}
              >
                {t("c1.comprehension")}
              </button>
            </section>
          )}
          {view === "unseen" && unseen?.id === params.get("unseen") && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {unseen.title}
              </h2>
              <p>
                {unseen.previouslyAttempted
                  ? t("c1.parallelForm")
                  : t("c1.freshText")}
              </p>
              {!unseen.previouslyAttempted && (
                <p className="unit-sentence" dir="ltr" lang="en">
                  {unseen.passage}
                </p>
              )}
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void start(`unseen:${unseen.id}`)}
              >
                {t("c1.comprehension")}
              </button>
            </section>
          )}
          {view === "article" && article?.id === params.get("article") && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {article.title ?? t("c1.newReading")}
              </h2>
              <p role="status">{t(`c1.articleStatus.${article.status}`)}</p>
              {article.text && (
                <>
                  <p>
                    {t(
                      article.mode === "independent"
                        ? "c1.independentReading"
                        : "c1.guidedReading",
                    )}
                  </p>
                  <p className="unit-sentence" dir="ltr" lang="en">
                    {article.text}
                  </p>
                  <details>
                    <summary>{t("c1.supportWords")}</summary>
                    <p dir="ltr" lang="en">
                      {article.supportWords.join("  ")}
                    </p>
                  </details>
                  <div className="homework-support-actions">
                    {Array.from(
                      { length: article.attempt?.question?.audioParts ?? 0 },
                      (_, part) => (
                        <button
                          className="button secondary"
                          key={part}
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await play(
                                await curriculumApi.audio(
                                  article.id,
                                  article.attempt!.cursor,
                                  part,
                                ),
                              );
                              setArticle({ ...article, mode: "guided" });
                            })
                          }
                        >
                          <Headphones size={18} />
                          {t("c1.listen")} {part + 1}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => {
                      setAttempt(article.attempt!);
                      go({
                        view: "attempt",
                        attempt: article.id,
                        unit: unitId,
                      });
                    }}
                  >
                    {t("c1.comprehension")}
                  </button>
                </>
              )}
              {article.status === "generating" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      setArticle(await curriculumApi.article(article.id)),
                    )
                  }
                >
                  {t("common.tryAgain")}
                </button>
              )}
            </section>
          )}
          {view === "attempt" && attempt?.id === params.get("attempt") && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {t("c1.practice")} {Math.min(attempt.cursor + 1, attempt.total)}{" "}
                / {attempt.total}
              </h2>
              <progress
                value={attempt.cursor}
                max={attempt.total}
                aria-label={t("c1.progress")}
              />
              {attempt.feedback && (
                <div
                  className={`homework-feedback ${attempt.feedback.correct ? "correct" : "repair"}`}
                  role="status"
                >
                  <strong>
                    {attempt.feedback.correct
                      ? t("c1.answerAccepted")
                      : t("c1.repair")}
                  </strong>
                  <p>{attempt.feedback.feedback}</p>
                  {attempt.feedback.answer && (
                    <p lang="en" dir="ltr">
                      {attempt.feedback.answer}
                    </p>
                  )}
                  <small>
                    {attempt.feedback.independent
                      ? t("c1.independentAttempt")
                      : t("c1.supportedAttempt")}
                  </small>
                </div>
              )}
              {attempt.result ? (
                <>
                  <h3>
                    {attempt.result.complete
                      ? t("c1.activityComplete")
                      : t("c1.morePractice")}
                  </h3>
                  <p>{Math.round(attempt.result.score * 100)}%</p>
                  <button
                    className="button primary"
                    onClick={() => go({ view: "map", unit: unitId })}
                  >
                    {t("c1.returnMap")}
                  </button>
                  <button
                    className="button ghost"
                    disabled={busy}
                    onClick={() => void start(attempt.activityId)}
                  >
                    {t("c1.repeat")}
                  </button>
                </>
              ) : (
                attempt.question && (
                  <>
                    {attempt.question.passage && (
                      <p className="unit-sentence" lang="en" dir="ltr">
                        {attempt.question.passage}
                      </p>
                    )}
                    <h3>{attempt.question.prompt}</h3>
                    {attempt.question.text && (
                      <p dir="ltr" lang="en">
                        {attempt.question.text}
                      </p>
                    )}
                    {attempt.question.picture && (
                      <CurriculumPicture
                        picture={attempt.question.picture}
                        label={t("c1.newScene")}
                      />
                    )}
                    {attempt.question.hasAudio && attempt.question.passage && (
                      <p>{t("c1.readingAudioSupport")}</p>
                    )}
                    {attempt.question.hasAudio && (
                      <div className="homework-support-actions">
                        {Array.from(
                          { length: attempt.question.audioParts },
                          (_, part) => (
                            <button
                              key={part}
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () =>
                                  play(
                                    await curriculumApi.audio(
                                      attempt.id,
                                      attempt.cursor,
                                      part,
                                    ),
                                  ),
                                )
                              }
                            >
                              <Volume2 size={18} />
                              {t("c1.listen")}{" "}
                              {attempt.question!.audioParts > 1
                                ? `${part + 1} / ${attempt.question!.audioParts}`
                                : ""}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                    {hint && (
                      <p className="homework-hint" role="status">
                        {hint}
                      </p>
                    )}
                    {attempt.question.choices ? (
                      <div className="homework-choices">
                        {attempt.question.choices.map((choice) => (
                          <button
                            className="button secondary"
                            key={choice.id}
                            disabled={busy}
                            onClick={() => void submit(choice.id)}
                          >
                            {choice.picture && (
                              <CurriculumPicture
                                picture={choice.picture}
                                label={choice.text}
                              />
                            )}
                            <span>{choice.text}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        <label className="field">
                          {t("c1.answer")}
                          <textarea
                            value={answer}
                            dir="auto"
                            rows={
                              attempt.question.kind.includes("writing") ? 10 : 4
                            }
                            onChange={(event) => {
                              setAnswer(event.target.value);
                              if (transcription?.text !== event.target.value)
                                setTranscription(undefined);
                            }}
                          />
                        </label>
                        <div className="homework-support-actions">
                          <button
                            className="button primary"
                            disabled={busy || recording || !answer.trim()}
                            onClick={() => void submit()}
                          >
                            {t("c1.checkAnswer")}
                          </button>
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() => void record()}
                          >
                            {recording ? (
                              <Pause size={18} />
                            ) : (
                              <Mic size={18} />
                            )}{" "}
                            {t(recording ? "c1.stopRecording" : "c1.record")}
                          </button>
                          <button
                            className="button ghost"
                            disabled={busy || recording}
                            onClick={() => void saveDraft()}
                          >
                            <Save size={18} />
                            {t("c1.savePause")}
                          </button>
                        </div>
                      </>
                    )}
                    <button
                      className="button ghost"
                      disabled={busy || recording}
                      onClick={() =>
                        void run(async () => {
                          const { revision, eventId } = await commandFor(
                            `hint:${attempt.id}:${attempt.cursor}`,
                          );
                          const result = await curriculumApi.hint(
                            revision,
                            attempt.id,
                            attempt.cursor,
                            eventId,
                          );
                          setHint(result.hint);
                          await fresh();
                        })
                      }
                    >
                      {t("c1.hint")}
                    </button>
                  </>
                )
              )}
            </section>
          )}
          {view === "placement" && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {t("c1.tabs.placement")}
              </h2>
              <p>{t("c1.placementBody")}</p>
              <label className="field">
                {t("c1.testBand")}
                <select
                  value={placementBand}
                  onChange={(event) => setPlacementBand(event.target.value)}
                >
                  {bands.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <div className="homework-support-actions">
                {[
                  "decoding",
                  "vocabulary",
                  "listening",
                  "speaking",
                  "reading",
                  "writing",
                ].map((skill) => (
                  <button
                    className="button secondary"
                    key={skill}
                    disabled={busy}
                    onClick={() =>
                      void start(`placement:${placementBand}:${skill}`)
                    }
                  >
                    {t(`c1.skills.${skill}`)}{" "}
                    {data.placement[skill] &&
                      `${data.placement[skill].band}  ${Math.round(data.placement[skill].score * 100)}%`}
                  </button>
                ))}
              </div>
            </section>
          )}
          {view === "sources" && (
            <section className="homework-task-card">
              <h2 ref={focusRef} tabIndex={-1}>
                {t("c1.tabs.sources")}
              </h2>
              <p>{data.program.researchStatus}</p>
              <p>{data.program.attribution}</p>
              <p>{t("c1.researchLimits")}</p>
              <ul>
                {data.evidence.map((item, index) => {
                  const evidence = item as Record<string, unknown>;
                  return (
                    <li key={index}>
                      <a
                        href={String(evidence.url ?? "")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {String(
                          evidence.title ??
                            evidence.title_he ??
                            evidence.id ??
                            "",
                        )}
                      </a>
                      <p>
                        {String(
                          evidence.limitation_he ??
                            evidence.limitations_he ??
                            evidence.caveat_he ??
                            "",
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p>{t("c1.elective", { count: data.elective.count })}</p>
              <button
                className="button secondary"
                disabled={!data.elective.unlocked}
                onClick={() => go({ view: "words", unit: "C1E" })}
              >
                {t("c1.studyWords")}
              </button>
              <a
                href="https://learnenglish.britishcouncil.org/free-resources/reading/c1"
                target="_blank"
                rel="noreferrer"
              >
                British Council C1 reading
              </a>
            </section>
          )}
        </>
      )}
    </div>
  );
}
