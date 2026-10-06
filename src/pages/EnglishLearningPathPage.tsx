import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { BookOpen } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UnitWordBrowser } from "../components/UnitWordBrowser";
import { UnitActivities } from "../components/UnitActivities";
import { UnitLevels } from "../components/UnitLevels";
import { EnglishUnitMap } from "../components/EnglishUnitMap";
import { PathArtwork } from "../components/PathArtwork";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import { useFeedback } from "../components/Feedback";
import { useSubscription } from "../context/SubscriptionContext";
import { useApp } from "../context/AppContext";
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
import {
  chooseProgram,
  learningReturn,
  smartSessionLink,
} from "../lib/learningNavigation";

type Preview = { pack: WordPack; entries: WordPackEntry[] };
export function EnglishLearningPathPage() {
  const { t } = useTranslation();
  const { user } = useApp();
  const { toast } = useFeedback();
  const { hasEntitlement, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const practiceReturn = learningReturn(
    params.get("return"),
    params.get("unit")
      ? `/english-learning?unit=${params.get("unit")}`
      : "/english-learning",
  );
  const tab = params.get("tab") || "map";
  const showLevels = params.get("all") === "1";
  const [bulkOpen, setBulkOpen] = useState(false);
  const resource = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const levels = useMemo(
    () => englishPathLevels(resource.data?.packs ?? []),
    [resource.data],
  );
  const detailRequest = useRef(0);
  const autoOpened = useRef<string | undefined>(undefined);
  const autoPractice = useRef<string | undefined>(undefined);
  const [preview, setPreview] = useState<Preview>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const available = levels.some(({ packs }) => packs.length);
  useEffect(() => {
    if (available) chooseProgram("english-path", user, "en");
  }, [available, user]);
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
        current
          ? listPrivateLessons(50, undefined, current.id)
          : Promise.resolve([]),
      [current],
    ),
  );
  const unitPractice = useResource(
    useCallback(
      () =>
        current
          ? product(
              page(sessionSchema),
              `practice/sessions?limit=50&packId=${current.id}`,
            )
          : Promise.resolve({ items: [], nextCursor: null, totalCount: 0 }),
      [current],
    ),
  );
  const unitUrl = (pack: WordPack, station = "supported") =>
    `/private-lesson?pack=${pack.id}&language=${encodeURIComponent(pack.track.sourceLanguageCode)}&station=${station}&return=${encodeURIComponent(`/english-learning?unit=${pack.id}`)}`;
  const changeTab = (value: string) => {
    setBulkOpen(false);
    const query = new URLSearchParams(params);
    query.delete("all");
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
        smartSessionLink(
          new URLSearchParams({
            pack: pack.id,
            language: pack.track.sourceLanguageCode,
            return: `/english-learning?unit=${pack.id}&tab=words`,
          }),
        ),
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

  const startAutomatically = useEffectEvent(() => void startUnit());
  useEffect(() => {
    if (
      params.get("practice") !== "smart" ||
      !current ||
      preview?.pack.id !== current.id ||
      busy ||
      detailLoading ||
      subscriptionLoading ||
      preview.entries.every((entry) => entry.known) ||
      autoPractice.current === current.id
    )
      return;
    autoPractice.current = current.id;
    startAutomatically();
  }, [params, current, preview, busy, detailLoading, subscriptionLoading]);

  const selectedEntries =
    preview?.entries.filter((entry) => selectedIds.includes(entry.id)) ?? [];
  const selectedToAdd = selectedEntries.some(
    (entry) => !entry.learningItemId || entry.excludedAt,
  );
  const selectedToMarkKnown = selectedEntries.some((entry) => !entry.known);
  const selectedToUnmarkKnown = selectedEntries.some((entry) => entry.known);

  const currentUrl = current
    ? `/english-learning?unit=${current.id}`
    : "/english-learning";
  const practiceUrl = current
    ? `/learn/smart?pack=${current.id}&language=${encodeURIComponent(current.track.sourceLanguageCode)}&return=${encodeURIComponent(currentUrl)}`
    : "/learn";
  const selectUnit = (pack: WordPack, value = "map") => {
    setBulkOpen(false);
    setParams({ unit: pack.id, tab: value });
  };
  const stations = current?.teacherStations ?? [];
  const completedStations = new Set(
    unitLessons.data
      ?.filter((lesson) => lesson.status === "completed")
      .map((lesson) => lesson.wordPack?.station),
  );
  const nextStation = [...stations]
    .reverse()
    .find((step) => step.available && !completedStations.has(step.station));
  const showWords = () => current && selectUnit(current, "words");
  const showAll = (level?: string) => {
    const query = new URLSearchParams(params);
    query.set("all", "1");
    query.set("tab", "map");
    if (level) query.set("level", level);
    setParams(query);
  };
  const title = showLevels
    ? t("structuredUi.allUnits")
    : t(
        tab === "map"
          ? "structuredUi.mapTitle"
          : tab === "meetings"
            ? "pathUi.teacherInPath"
            : `structuredUi.${tab}`,
      );
  return (
    <div
      className={`english-path-page live-page page-enter path-view-${showLevels ? "levels" : tab}`}
    >
      <header className="path-page-header">
        {(showLevels || tab !== "map") && (
          <button
            className="button ghost path-back"
            onClick={() => changeTab("map")}
          >
            <PathArtwork name="levels-ChevronLeft" />
            {t("pathUi.backToMap")}
          </button>
        )}
        <Link className="button secondary path-program" to="/courses">
          {t("pathUi.programTitle")}
          <PathArtwork
            name={showLevels ? "levels-ChevronDown" : "map-ChevronDown"}
          />
        </Link>
        <h1>{title}</h1>
        {tab !== "map" && !showLevels && <p dir="auto">{current?.title}</p>}
        {showLevels && <p>{t("pathUi.chooseLevel")}</p>}
        {tab === "words" && current && (
          <button
            className="button primary path-practice"
            disabled={
              busy ||
              detailLoading ||
              !preview ||
              preview.entries.every((entry) => entry.known)
            }
            onClick={() => void startUnit()}
          >
            {t("dashboard.smartPractice")}
          </button>
        )}
        {tab === "words" && preview?.entries.every((entry) => entry.known) && (
          <p role="status">{t("unitStudy.allKnown")}</p>
        )}
      </header>
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {!resource.loading && !resource.error && !available && (
        <section className="ux-card">
          <h2>{t("englishPath.unavailableTitle")}</h2>
          <p>{t("englishPath.unavailableDescription")}</p>
        </section>
      )}
      {available && (
        <>
          {!showLevels && (
            <nav
              className="unit-map-tabs"
              aria-label={t("structuredUi.sections")}
            >
              {["map", "words", "activities"].map((value) => (
                <button
                  key={value}
                  aria-current={tab === value ? "page" : undefined}
                  className={tab === value ? "active" : ""}
                  onClick={() => changeTab(value)}
                >
                  <BookOpen size={22} />
                  {t(`structuredUi.${value}`)}
                </button>
              ))}
            </nav>
          )}
          {showLevels ? (
            <UnitLevels
              key={params.get("level") || "default"}
              initialLevel={params.get("level") || undefined}
              packs={resource.data?.packs ?? []}
              current={current}
              onOpen={(pack) => selectUnit(pack)}
              onWords={(pack) => selectUnit(pack, "words")}
            />
          ) : (
            <>
              {current && tab === "map" && (
                <EnglishUnitMap
                  current={current}
                  packs={resource.data?.packs ?? []}
                  nextStation={nextStation}
                  completedStations={completedStations}
                  completedActivities={
                    (unitLessons.data?.filter(
                      (lesson) => lesson.status === "completed",
                    ).length ?? 0) +
                    (unitPractice.data?.items.filter(
                      (session) => session.status === "completed",
                    ).length ?? 0)
                  }
                  onSelect={(pack) => selectUnit(pack)}
                  onWords={showWords}
                  onAll={showAll}
                  onActivities={() => changeTab("activities")}
                  stationUrl={(station) => unitUrl(current, station)}
                  detailsUrl={`${currentUrl}&tab=meetings`}
                />
              )}
              {current && tab === "words" && (
                <>
                  <RemoteState
                    loading={detailLoading}
                    error={""}
                    retry={() => void openUnit(current)}
                  />
                  {preview?.pack.id === current.id && (
                    <>
                      <UnitWordBrowser
                        packId={current.id}
                        key={current.id}
                        entries={preview.entries}
                        language={current.track.sourceLanguageCode}
                        supportLanguage={current.track.translationLanguageCode}
                        busy={busy}
                        onKnown={(entry) =>
                          void setKnown(current, [entry.id], !entry.known)
                        }
                      />
                      <div className="path-word-tools">
                        <button
                          className="button ghost"
                          onClick={() => setBulkOpen(true)}
                        >
                          {t("pathUi.manageWords")}
                        </button>
                        <button
                          className="button ghost"
                          disabled={busy}
                          onClick={() => void setUnitKnown(current)}
                        >
                          {t(
                            (current.progress.known ?? 0) === current.wordCount
                              ? "englishPath.unmarkUnitKnown"
                              : "englishPath.markUnitKnown",
                          )}
                        </button>
                      </div>
                    </>
                  )}
                  {!detailLoading && preview?.pack.id !== current.id && (
                    <button
                      className="button primary"
                      onClick={() => void openUnit(current)}
                    >
                      {t("common.retry")}
                    </button>
                  )}
                </>
              )}
              {current && tab === "activities" && (
                <>
                  <RemoteState
                    loading={unitLessons.loading || unitPractice.loading}
                    error={unitLessons.error || unitPractice.error}
                    retry={() => {
                      void unitLessons.reload();
                      void unitPractice.reload();
                    }}
                  />
                  {!unitLessons.loading &&
                    !unitPractice.loading &&
                    !unitLessons.error &&
                    !unitPractice.error && (
                      <UnitActivities
                        language={current.track.sourceLanguageCode}
                        key={current.id}
                        lessons={unitLessons.data ?? []}
                        sessions={unitPractice.data?.items ?? []}
                        unitId={current.id}
                        practiceUrl={practiceUrl}
                      />
                    )}
                  <Link
                    className="button ghost"
                    to={`/history?pack=${current.id}`}
                  >
                    {t("ux.history")}
                  </Link>
                </>
              )}
              {current && tab === "meetings" && (
                <section
                  className="path-meeting-details"
                  data-figma-desktop="43:3801"
                >
                  <h2>{t("pathUi.teacherInPath")}</h2>
                  <p>{t("pathUi.meetingsHelp")}</p>
                  {stations.map((step) => (
                    <article className="ux-card" key={step.station}>
                      <h3>
                        {t(`pathUi.${step.station}`)} ·{" "}
                        {t("privateLesson.durationMinutes", {
                          count: step.durationMinutes,
                        })}
                      </h3>
                      <p>
                        {t("pathUi.meetingThreshold", {
                          count: step.requiredWords,
                          minutes: step.durationMinutes,
                        })}
                      </p>
                      <p>{t("structuredUi.supportedHelp")}</p>
                      {step.available && (
                        <Link
                          className="button primary"
                          to={unitUrl(current, step.station)}
                        >
                          {t("structuredUi.withTeacher")}
                        </Link>
                      )}
                    </article>
                  ))}
                  <button
                    className="button primary"
                    onClick={() => changeTab("map")}
                  >
                    {t("pathUi.backToMap")}
                  </button>
                </section>
              )}
            </>
          )}
        </>
      )}
      <Modal
        className="english-path-word-modal"
        size="lg"
        open={
          bulkOpen &&
          tab === "words" &&
          Boolean(preview) &&
          preview?.pack.id === current?.id
        }
        onClose={() => !busy && setBulkOpen(false)}
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
                onClick={() => setBulkOpen(false)}
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
      </Modal>
    </div>
  );
}
