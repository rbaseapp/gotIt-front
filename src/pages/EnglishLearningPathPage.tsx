import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BookOpen, CheckCircle2, Eye, Play, Mic2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import { useFeedback } from "../components/Feedback";
import { useSubscription } from "../context/SubscriptionContext";
import { completedEnglishUnit, englishPathLevels } from "../lib/englishPath";
import {
  errorMessage,
  product,
  wordPackAddReceiptSchema,
  wordPackKnownReceiptSchema,
  wordPackDetailSchema,
  wordPacksSchema,
  type WordPack,
  type WordPackEntry,
  page,
  sessionSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { listPrivateLessons } from "../lib/privateLesson";
import { learningReturn } from "../lib/learningNavigation";

type Preview = { pack: WordPack; entries: WordPackEntry[] };
function UnitWordsSurface(p: {
  asPage: boolean;
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (p.asPage)
    return p.open ? (
      <section className="unit-word-surface">
        <h2 dir="auto">{p.title}</h2>
        {p.children}
      </section>
    ) : null;
  return (
    <Modal
      open={p.open}
      className="english-path-word-modal"
      onClose={p.onClose}
      title={p.title}
      size="lg"
    >
      {p.children}
    </Modal>
  );
}

export function EnglishLearningPathPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useFeedback();
  const { hasEntitlement } = useSubscription();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const practiceReturn = learningReturn(
    params.get("return"),
    "/english-learning",
  );
  const tab = params.get("tab") || "map";
  const [showLevels, setShowLevels] = useState(params.get("all") === "1");
  const resource = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const levels = useMemo(
    () => englishPathLevels(resource.data?.packs ?? []),
    [resource.data],
  );
  const detailRequest = useRef(0);
  const autoOpened = useRef<string | undefined>(undefined);
  const [preview, setPreview] = useState<Preview>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const available = levels.some(({ packs }) => packs.length);
  const next = levels
    .flatMap(({ packs }) => packs)
    .find((pack) => !completedEnglishUnit(pack));
  const current =
    levels
      .flatMap(({ packs }) => packs)
      .find((pack) => pack.id === params.get("unit")) ??
    next ??
    levels.flatMap(({ packs }) => packs).at(-1);
  const unitLessons = useResource(
    useCallback(
      () =>
        current && tab === "activities"
          ? listPrivateLessons(50, undefined, current.id)
          : Promise.resolve([]),
      [current, tab],
    ),
  );
  const unitPractice = useResource(
    useCallback(
      () =>
        current && tab === "activities"
          ? product(
              page(sessionSchema),
              `practice/sessions?limit=50&packId=${current.id}`,
            )
          : Promise.resolve({ items: [], nextCursor: null, totalCount: 0 }),
      [current, tab],
    ),
  );
  const unitUrl = (pack: WordPack, station = "supported") =>
    `/private-lesson?pack=${pack.id}&language=${encodeURIComponent(pack.track.sourceLanguageCode)}&station=${station}&return=${encodeURIComponent(`/english-learning?unit=${pack.id}`)}`;
  const changeTab = (value: string) => {
    const query = new URLSearchParams(params);
    query.set("tab", value);
    if (current) query.set("unit", current.id);
    setParams(query);
  };

  const openUnit = useCallback(
    async (pack: WordPack) => {
      const request = ++detailRequest.current;
      setPreview(undefined);
      setDetailLoading(true);
      try {
        const detail = await product(
          wordPackDetailSchema,
          `word-packs/${pack.id}`,
        );
        if (request !== detailRequest.current) return;
        setSelectedIds([]);
        setPreview({ pack: detail.pack, entries: detail.entries });
      } catch (reason) {
        toast(errorMessage(reason), { tone: "error" });
      } finally {
        if (request === detailRequest.current) setDetailLoading(false);
      }
    },
    [toast],
  );
  useEffect(() => {
    if (tab !== "words" || !current) {
      autoOpened.current = undefined;
      return;
    }
    if (autoOpened.current === current.id) return;
    autoOpened.current = current.id;
    void openUnit(current);
  }, [tab, current, openUnit]);

  const setKnown = async (
    pack: WordPack,
    entryIds: string[],
    known: boolean,
    clearSelection = false,
  ) => {
    if (!hasEntitlement("vocabulary.write")) {
      navigate("/billing");
      return;
    }
    setBusy(true);
    try {
      await product(
        wordPackKnownReceiptSchema,
        `word-packs/${pack.id}/known`,
        "PUT",
        { entryIds, known },
      );
      await resource.reload();
      if (preview?.pack.id === pack.id) {
        const detail = await product(
          wordPackDetailSchema,
          `word-packs/${pack.id}`,
        );
        setPreview({ pack: detail.pack, entries: detail.entries });
      }
      if (clearSelection) {
        setSelectedIds([]);
        toast(
          t(
            known ? "englishPath.selectedKnown" : "englishPath.selectedUnknown",
          ),
          {
            tone: "success",
          },
        );
      }
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const setUnitKnown = async (pack: WordPack) => {
    if (!hasEntitlement("vocabulary.write")) {
      navigate("/billing");
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await product(
        wordPackDetailSchema,
        `word-packs/${pack.id}`,
      );
      await setKnown(
        pack,
        detail.entries.map(({ id }) => id),
        detail.entries.some((entry) => !entry.known),
      );
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setDetailLoading(false);
    }
  };

  const startUnit = async () => {
    if (!preview) return;
    if (!hasEntitlement("vocabulary.write")) {
      navigate("/billing");
      return;
    }
    const { pack, entries } = preview;
    const toLearn = entries.filter((entry) => !entry.known);
    if (!toLearn.length) {
      setPreview(undefined);
      return;
    }
    setBusy(true);
    try {
      await product(
        wordPackAddReceiptSchema,
        `word-packs/${pack.id}/add`,
        "POST",
        {
          entryIds: toLearn.map(({ id }) => id),
        },
      );
      setPreview(undefined);
      await resource.reload();
      navigate(
        `/learn/smart?pack=${pack.id}&language=${encodeURIComponent(pack.track.sourceLanguageCode)}&return=${encodeURIComponent(practiceReturn)}`,
      );
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const addSelected = async () => {
    if (!preview || !selectedIds.length) return;
    if (!hasEntitlement("vocabulary.write")) {
      navigate("/billing");
      return;
    }
    const { pack, entries } = preview;
    const selected = new Set(selectedIds);
    const included = entries.filter(
      (entry) => entry.learningItemId && !entry.excludedAt,
    );
    const entryIds = entries
      .filter(
        (entry) =>
          selected.has(entry.id) ||
          included.some((item) => item.id === entry.id),
      )
      .map((entry) => entry.id);
    setBusy(true);
    try {
      await product(
        wordPackAddReceiptSchema,
        `word-packs/${pack.id}/add`,
        "POST",
        { entryIds },
      );
      const detail = await product(
        wordPackDetailSchema,
        `word-packs/${pack.id}`,
      );
      setPreview({ pack: detail.pack, entries: detail.entries });
      setSelectedIds([]);
      await resource.reload();
      toast(t("englishPath.selectedAdded"), { tone: "success" });
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const selectedEntries =
    preview?.entries.filter((entry) => selectedIds.includes(entry.id)) ?? [];
  const selectedToAdd = selectedEntries.some(
    (entry) => !entry.learningItemId || entry.excludedAt,
  );
  const selectedToMarkKnown = selectedEntries.some((entry) => !entry.known);
  const selectedToUnmarkKnown = selectedEntries.some((entry) => entry.known);

  return (
    <div className="english-path-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("englishPath.eyebrow")}</p>
          <h1>{t("structuredUi.mapTitle")}</h1>
          <Link className="button secondary" to="/courses">
            {t("englishPath.title")}
          </Link>
        </div>
      </section>
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {!resource.loading && !resource.error && !available && (
        <section className="live-panel" role="status">
          <h2>{t("englishPath.unavailableTitle")}</h2>
          <p>{t("englishPath.unavailableDescription")}</p>
        </section>
      )}
      {available && (
        <>
          <nav
            className="unit-map-tabs"
            aria-label={t("structuredUi.sections")}
          >
            {["map", "words", "activities"].map((value) => (
              <button
                type="button"
                key={value}
                aria-current={tab === value ? "page" : undefined}
                className={tab === value ? "active" : ""}
                onClick={() => changeTab(value)}
              >
                {t(`structuredUi.${value}`)}
              </button>
            ))}
          </nav>
          <div className="unit-map-selectors">
            <label className="field">
              <span>{t("structuredUi.currentUnit")}</span>
              <select
                value={current?.id ?? ""}
                onChange={(event) => {
                  const query = new URLSearchParams(params);
                  query.set("unit", event.target.value);
                  setParams(query);
                }}
              >
                {levels
                  .filter((level) => level.packs.length)
                  .map((level) => (
                    <optgroup
                      key={level.level}
                      label={t(`englishPath.levels.${level.level}`)}
                    >
                      {level.packs.map((pack) => (
                        <option value={pack.id} key={pack.id}>
                          {pack.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="button secondary"
              aria-expanded={showLevels}
              onClick={() => setShowLevels((value) => !value)}
            >
              {t("structuredUi.allUnits")}
            </button>
          </div>
          {current && tab === "map" && (
            <section
              className="unit-roadmap-card"
              data-figma-desktop="43:2557"
              data-figma-mobile="44:5230"
            >
              <h2 dir="auto">{current.title}</h2>
              <div className="unit-roadmap-progress">
                <progress
                  max={current.wordCount || 1}
                  value={
                    current.progress.completed ?? current.progress.mastered
                  }
                />
                <span>
                  {t("englishPath.unitProgress", {
                    mastered:
                      current.progress.completed ?? current.progress.mastered,
                    total: current.wordCount,
                  })}
                </span>
              </div>
              <div className="unit-teacher-station">
                <span className="unit-station-icon">
                  <Mic2 size={30} />
                </span>
                <div>
                  <p className="eyebrow">{t("structuredUi.optionalStation")}</p>
                  <h3>{t("structuredUi.supported")}</h3>
                  <p>{t("structuredUi.supportedHelp")}</p>
                  <small>{t("structuredUi.answerHelp")}</small>
                </div>
                <Link className="button primary" to={unitUrl(current)}>
                  {t("structuredUi.withTeacher")}
                </Link>
                <div className="unit-station-links">
                  <button
                    className="button ghost"
                    onClick={() => changeTab("words")}
                  >
                    {t("structuredUi.words")}
                  </button>
                  <details>
                    <summary>{t("structuredUi.stationDetails")}</summary>
                    <p>{t("structuredUi.readinessHelp")}</p>
                    <p>{t("privateLesson.minutesChargePolicy")}</p>
                  </details>
                </div>
              </div>
              <h3 className="unit-upcoming-heading">
                {t("structuredUi.inThisUnit")}
              </h3>
              <div className="unit-upcoming">
                <button
                  className="unit-upcoming-row"
                  onClick={() =>
                    current.installed
                      ? navigate(
                          `/learn/session/smart?pack=${current.id}&return=${encodeURIComponent(`/english-learning?unit=${current.id}`)}`,
                        )
                      : void openUnit(current)
                  }
                >
                  <BookOpen size={28} />
                  <span>
                    <strong>{t("structuredUi.wordsAndSentences")}</strong>
                    <small>{t("structuredUi.wordsAndSentencesHelp")}</small>
                  </span>
                </button>
                <Link
                  className="unit-upcoming-row"
                  to={unitUrl(current, "review")}
                >
                  <Mic2 size={28} />
                  <span>
                    <strong>{t("structuredUi.review")}</strong>
                    <small>{t("structuredUi.reviewHelp")}</small>
                  </span>
                </Link>
              </div>
              <button
                className="button secondary unit-future"
                onClick={() => setShowLevels((value) => !value)}
              >
                {t("structuredUi.nextUnits")}
              </button>
            </section>
          )}
          {current && tab === "words" && !preview && (
            <button
              className="button primary"
              disabled={detailLoading}
              onClick={() => void openUnit(current)}
            >
              {t("structuredUi.words")}
            </button>
          )}
          {current && tab === "activities" && (
            <section className="unit-activities">
              <h2 dir="auto">{current.title}</h2>
              <RemoteState
                loading={unitLessons.loading || unitPractice.loading}
                error={unitLessons.error || unitPractice.error}
                retry={() => {
                  void unitLessons.reload();
                  void unitPractice.reload();
                }}
              />
              {unitLessons.data?.map((lesson) => (
                <article className="ux-card" key={lesson.id}>
                  <Mic2 size={24} />
                  <div>
                    <h3>
                      {t(
                        lesson.wordPack?.station === "review"
                          ? "structuredUi.review"
                          : "structuredUi.supported",
                      )}
                    </h3>
                    <p dir="auto">
                      {lesson.report?.summary ||
                        t("privateLesson.historyPending")}
                    </p>
                    <time dateTime={lesson.startedAt}>
                      {new Date(lesson.startedAt).toLocaleString(
                        i18n.resolvedLanguage,
                      )}
                    </time>
                  </div>
                  <Link
                    className="button secondary"
                    to={`/private-lesson?lesson=${lesson.id}&pack=${current.id}`}
                  >
                    {t("structuredUi.lessonSummary")}
                  </Link>
                </article>
              ))}
              {unitPractice.data?.items.map((session) => (
                <article className="ux-card" key={session.id}>
                  <BookOpen size={24} />
                  <div>
                    <h3>
                      {t(`labels.${session.sessionType}`, {
                        defaultValue: session.sessionType,
                      })}
                    </h3>
                    <p>
                      {t("structuredUi.practiceResult", {
                        correct: session.correctCount,
                        total: session.attemptCount,
                      })}
                    </p>
                    <time dateTime={session.startedAt}>
                      {new Date(session.startedAt).toLocaleString(
                        i18n.resolvedLanguage,
                      )}
                    </time>
                  </div>
                  <Link
                    className="button secondary"
                    to={`/learn/session/${session.sessionType === "smart_review" ? "smart" : session.sessionType}?resume=${session.id}&language=${encodeURIComponent(current.track.sourceLanguageCode)}&pack=${current.id}&return=${encodeURIComponent(`/english-learning?unit=${current.id}&tab=activities`)}`}
                  >
                    {t("structuredUi.practiceDetails")}
                  </Link>
                </article>
              ))}
              {!unitLessons.loading &&
                !unitPractice.loading &&
                !unitLessons.data?.length &&
                !unitPractice.data?.items.length && (
                  <p>{t("structuredUi.noActivities")}</p>
                )}
              {(unitPractice.data?.nextCursor ||
                unitPractice.data?.totalCount === 50 ||
                unitLessons.data?.length === 50) && (
                <Link
                  className="button ghost"
                  to={`/history?pack=${current.id}`}
                >
                  {t("ux.history")}
                </Link>
              )}
            </section>
          )}
          {next && showLevels && (
            <section
              className="english-path-next live-panel"
              aria-labelledby="english-path-next-heading"
            >
              <div>
                <p className="eyebrow">{t("englishPath.nextLabel")}</p>
                <h2 id="english-path-next-heading">
                  {t(`englishPath.levels.${next.track.levelCode}`)} ·{" "}
                  {next.title}
                </h2>
                <p>{t("englishPath.unitSize", { count: next.wordCount })}</p>
              </div>
              {next.installed ? (
                <Link
                  className="button primary"
                  to={`/learn/session/smart?pack=${next.id}&return=%2Fenglish-learning`}
                >
                  <Play size={17} /> {t("englishPath.continue")}
                </Link>
              ) : (
                <button
                  className="button primary"
                  type="button"
                  disabled={detailLoading}
                  onClick={() => void openUnit(next)}
                >
                  <BookOpen size={17} /> {t("englishPath.start")}
                </button>
              )}
            </section>
          )}
          {showLevels &&
            levels
              .filter(({ packs }) => packs.length)
              .map(({ level, packs }) => {
                const completed = packs.reduce(
                  (total, pack) =>
                    total + (pack.progress.completed ?? pack.progress.mastered),
                  0,
                );
                const count = packs.reduce(
                  (total, pack) => total + pack.wordCount,
                  0,
                );
                return (
                  <details
                    className="english-path-level"
                    key={level}
                    open={
                      level === (next?.track.levelCode ?? levels[0]?.level) ||
                      undefined
                    }
                    aria-labelledby={`english-path-${level}`}
                  >
                    <summary className="english-path-level-heading">
                      <div>
                        <p className="eyebrow">
                          {t("englishPath.levelNumber", {
                            number:
                              levels.findIndex((item) => item.level === level) +
                              1,
                          })}
                        </p>
                        <h2 id={`english-path-${level}`}>
                          {t(`englishPath.levels.${level}`)}
                        </h2>
                        <p>{t(`englishPath.levelDescriptions.${level}`)}</p>
                      </div>
                      <span>
                        {t("englishPath.levelProgress", {
                          mastered: completed,
                          total: count,
                        })}
                      </span>
                    </summary>
                    <progress
                      max={count || 1}
                      value={completed}
                      aria-label={t("englishPath.levelProgress", {
                        mastered: completed,
                        total: count,
                      })}
                    />
                    <div className="english-path-unit-grid">
                      {packs.map((pack) => {
                        const completed = completedEnglishUnit(pack);
                        return (
                          <article
                            className={`english-path-unit${completed ? " completed" : ""}`}
                            key={pack.id}
                          >
                            <div className="english-path-unit-top">
                              <span>
                                {t("englishPath.unit", {
                                  number: pack.moduleNumber,
                                })}
                              </span>
                              {completed && (
                                <CheckCircle2
                                  size={20}
                                  aria-label={t("englishPath.completed")}
                                />
                              )}
                            </div>
                            <span className="english-path-unit-level">
                              {t(`englishPath.levels.${level}`)}
                            </span>
                            <h3 className="english-path-unit-name">
                              {pack.title.replace(/^יחידה\s+\d+:\s*/u, "")}
                            </h3>
                            <strong>
                              {t("englishPath.unitSize", {
                                count: pack.wordCount,
                              })}
                            </strong>
                            <span>
                              {t("englishPath.unitProgress", {
                                mastered:
                                  pack.progress.completed ??
                                  pack.progress.mastered,
                                total: pack.wordCount,
                              })}
                            </span>
                            <progress
                              max={pack.wordCount || 1}
                              value={
                                pack.progress.completed ??
                                pack.progress.mastered
                              }
                              aria-label={t("englishPath.unitProgress", {
                                mastered:
                                  pack.progress.completed ??
                                  pack.progress.mastered,
                                total: pack.wordCount,
                              })}
                            />
                            {(pack.progress.known ?? 0) > 0 && (
                              <span>
                                {t("englishPath.knownCount", {
                                  count: pack.progress.known,
                                })}
                              </span>
                            )}
                            <div className="english-path-unit-actions">
                              <button
                                type="button"
                                className="button secondary"
                                disabled={busy || detailLoading}
                                onClick={() => void setUnitKnown(pack)}
                              >
                                {t(
                                  (pack.progress.known ?? 0) === pack.wordCount
                                    ? "englishPath.unmarkUnitKnown"
                                    : "englishPath.markUnitKnown",
                                )}
                              </button>
                              <button
                                type="button"
                                className="button ghost"
                                disabled={detailLoading}
                                onClick={() => void openUnit(pack)}
                              >
                                <Eye size={16} /> {t("englishPath.preview")}
                              </button>
                              {pack.installed && (
                                <Link
                                  className="button secondary"
                                  to={`/learn?pack=${pack.id}&return=%2Fenglish-learning`}
                                >
                                  <Play size={16} /> {t("englishPath.practice")}
                                </Link>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
          <div className="english-path-next-links ux-inline-actions">
            <Link
              className="button secondary"
              to="/private-lesson?language=en&practice=free"
            >
              {t("ux.freeChat")}
            </Link>
            <Link className="button ghost" to="/history">
              {t("ux.history")}
            </Link>
            <Link className="button ghost" to="/courses">
              {t("ux.allPrograms")}
            </Link>
          </div>
          <details className="ux-card">
            <summary>{t("ux.learningDetails")}</summary>
            <p>{t("ux.knownHelp")}</p>
            <p>{t("ux.lessonAvailability")}</p>
          </details>
        </>
      )}
      <UnitWordsSurface
        asPage={tab === "words"}
        open={Boolean(preview)}
        onClose={() => !busy && setPreview(undefined)}
        title={
          preview
            ? `${t(`englishPath.levels.${preview.pack.track.levelCode}`)} · ${preview.pack.title}`
            : t("englishPath.title")
        }
      >
        {preview && (
          <>
            <div className="modal-body pack-word-dialog">
              <p>
                {t("englishPath.previewDescription", {
                  count: preview.entries.length,
                })}
              </p>
              <div className="pack-selection-summary">
                <p>
                  {t("englishPath.selectedCount", {
                    count: selectedIds.length,
                  })}
                </p>
                <div className="live-options">
                  <button
                    type="button"
                    className="button ghost"
                    disabled={busy}
                    onClick={() =>
                      setSelectedIds(preview.entries.map((entry) => entry.id))
                    }
                  >
                    {t("englishPath.selectAll")}
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    disabled={busy || !selectedIds.length}
                    onClick={() => setSelectedIds([])}
                  >
                    {t("englishPath.clearSelection")}
                  </button>
                </div>
              </div>
              <div className="pack-word-list">
                {preview.entries.map((entry) => (
                  <div
                    className={`pack-word-row english-path-word-row${entry.known ? " known" : ""}`}
                    key={entry.id}
                  >
                    <input
                      type="checkbox"
                      aria-label={t("englishPath.selectWord", {
                        word: entry.sourceText,
                      })}
                      checked={selectedIds.includes(entry.id)}
                      disabled={busy}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, entry.id]
                            : current.filter((id) => id !== entry.id),
                        )
                      }
                    />
                    <span>
                      <b dir="auto">{entry.sourceText}</b>
                      <span dir="auto">{entry.translationText}</span>
                    </span>
                    <button
                      type="button"
                      className="button ghost"
                      disabled={busy}
                      onClick={() =>
                        void setKnown(preview.pack, [entry.id], !entry.known)
                      }
                    >
                      {t(
                        entry.known
                          ? "englishPath.unmarkKnown"
                          : "englishPath.markKnown",
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy || !selectedToAdd}
                onClick={() => void addSelected()}
              >
                {t("englishPath.addSelected", { count: selectedIds.length })}
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy || !selectedToMarkKnown}
                onClick={() =>
                  void setKnown(preview.pack, selectedIds, true, true)
                }
              >
                {t("englishPath.markSelectedKnown")}
              </button>
              <button
                type="button"
                className="button ghost"
                disabled={busy || !selectedToUnmarkKnown}
                onClick={() =>
                  void setKnown(preview.pack, selectedIds, false, true)
                }
              >
                {t("englishPath.unmarkSelectedKnown")}
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={() => setPreview(undefined)}
              >
                {t("common.close")}
              </button>
              {preview.entries.some((entry) => !entry.known) &&
                (!preview.pack.installed ||
                  preview.entries.some(
                    (entry) =>
                      !entry.known &&
                      (!entry.learningItemId || entry.excludedAt),
                  )) && (
                  <button
                    type="button"
                    className="button primary"
                    disabled={
                      busy || preview.entries.length !== preview.pack.wordCount
                    }
                    onClick={() => void startUnit()}
                  >
                    {t("englishPath.addAndPractice")}
                  </button>
                )}
              {preview.pack.installed &&
                preview.entries.some((entry) => !entry.known) &&
                preview.entries.every(
                  (entry) =>
                    entry.known || (entry.learningItemId && !entry.excludedAt),
                ) && (
                  <Link
                    className="button primary"
                    to={`/learn/smart?pack=${preview.pack.id}&language=${encodeURIComponent(preview.pack.track.sourceLanguageCode)}&return=${encodeURIComponent(practiceReturn)}`}
                  >
                    {t("englishPath.practice")}
                  </Link>
                )}
            </div>
          </>
        )}
      </UnitWordsSurface>
    </div>
  );
}
