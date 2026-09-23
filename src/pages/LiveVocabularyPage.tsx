import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LiveCaptureModal } from "../components/LiveCaptureModal";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import {
  detailSchema,
  errorMessage,
  exampleSchema,
  itemSchema,
  labels,
  masteryRequirementText,
  occurrenceSchema,
  page,
  product,
  query,
  tagSchema,
  uuid,
  type ItemDetail,
  wordPacksSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { useFeedback } from "../components/Feedback";
import { useSubscription } from "../context/SubscriptionContext";

const actions = [
  "pause",
  "resume",
  "archive",
  "delete",
  "restore",
  "mark_mastered",
  "return_to_learning",
  "high_priority",
  "normal_priority",
  "mark_hard",
  "clear_hard",
] as const;
const bulkReceipt = z.object({ ids: z.array(uuid), action: z.string() });
export function LiveVocabularyPage() {
  const { t } = useTranslation();
  const { confirm, toast } = useFeedback();
  const { hasEntitlement } = useSubscription();
  const canWrite = hasEntitlement("vocabulary.write");
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = searchParams.get("item");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    userStatus: "all",
    sort: "recent",
  });
  const [cursor, setCursor] = useState<string>();
  const [tagCursor, setTagCursor] = useState<string>();
  const [tagHistory, setTagHistory] = useState<Array<string | undefined>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState("pause");
  const [add, setAdd] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = `learning-items${query({
    ...filters,
    limit: filters.packIds ? "100" : "30",
    cursor,
  })}`;
  const resource = useResource(
    useCallback(() => product(page(itemSchema), url), [url]),
  );
  const tags = useResource(
    useCallback(
      () =>
        product(
          z.object({
            tags: z.array(tagSchema),
            nextCursor: z.string().nullable().optional(),
          }),
          `tags${query({ limit: "100", cursor: tagCursor })}`,
        ),
      [tagCursor],
    ),
  );
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const installedPacks = packs.data?.packs.filter((pack) => pack.installed);
  const reloadLibrary = resource.reload;
  useEffect(() => {
    const changed = () => {
      setCursor(undefined);
      void reloadLibrary();
    };
    window.addEventListener("gotit:library-changed", changed);
    return () => window.removeEventListener("gotit:library-changed", changed);
  }, [reloadLibrary]);
  const change = (key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCursor(undefined);
    setSelected([]);
  };
  const togglePack = (id: string, checked: boolean) => {
    const current = (filters.packIds || "").split(",").filter(Boolean);
    change(
      "packIds",
      (checked
        ? [...current, id]
        : current.filter((packId) => packId !== id)
      ).join(","),
    );
  };
  const apply = async (ids = selected, operation = action) => {
    if (!canWrite) {
      toast(t("vocabulary.proRequired"), {
        tone: "info",
      });
      return;
    }
    if (!ids.length || busy) return;
    if (["delete", "mark_mastered", "restore"].includes(operation)) {
      const approved = await confirm({
        title: t("vocabulary.confirmBulk", {
          action: t(`vocabulary.actions.${operation}`),
          count: ids.length,
        }),
        message:
          operation === "delete"
            ? t("vocabulary.deleteDescription")
            : operation === "restore"
              ? t("vocabulary.restoreDescription")
              : t("vocabulary.manualMasteryDescription"),
        confirmLabel: t(`vocabulary.actions.${operation}`),
        tone: operation === "delete" ? "danger" : "warning",
      });
      if (!approved) return;
    }
    setBusy(true);
    setError("");
    try {
      await product(bulkReceipt, "learning-items/bulk", "POST", {
        ids,
        action: operation,
      });
      setSelected([]);
      toast(t("vocabulary.changeSaved"), { tone: "success" });
      await resource.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="vocabulary-page page-enter live-page">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("vocabulary.eyebrow")}</p>
          <h1>{t("vocabulary.title")}</h1>
          <p>{t("vocabulary.description")}</p>
        </div>
        {canWrite ? (
          <button className="button primary" onClick={() => setAdd(true)}>
            <Plus size={18} />
            {t("vocabulary.newWord")}
          </button>
        ) : (
          <Link className="button primary" to="/billing">
            {t("vocabulary.upgradeToSave")}
          </Link>
        )}
      </section>
      <section className="live-panel">
        <form
          className="live-search"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            change("search", search.trim());
          }}
        >
          <label className="field">
            <span>{t("vocabulary.searchSource")}</span>
            <input
              maxLength={500}
              dir="auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("vocabulary.searchPlaceholder")}
            />
          </label>
          <button className="button secondary">
            <Search size={18} />
            {t("vocabulary.search")}
          </button>
        </form>
        <div className="live-filter-grid">
          <label className="field">
            <span>{t("vocabulary.userStatus")}</span>
            <select
              value={filters.userStatus}
              onChange={(e) => change("userStatus", e.target.value)}
            >
              <option value="all">{t("vocabulary.allExceptDeleted")}</option>
              {["active", "paused", "archived", "deleted"].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
            {(tagHistory.length > 0 || tags.data?.nextCursor) && (
              <span className="live-options">
                {tagHistory.length > 0 && (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => {
                      const previous = tagHistory.at(-1);
                      setTagHistory((values) => values.slice(0, -1));
                      setTagCursor(previous);
                      change("tagId", "");
                    }}
                  >
                    {t("vocabulary.previousTags")}
                  </button>
                )}
                {tags.data?.nextCursor && (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => {
                      setTagHistory((values) => [...values, tagCursor]);
                      setTagCursor(tags.data!.nextCursor || undefined);
                      change("tagId", "");
                    }}
                  >
                    {t("vocabulary.moreTags")}
                  </button>
                )}
              </span>
            )}
          </label>
          <label className="field">
            <span>{t("vocabulary.learningStatus")}</span>
            <select
              value={filters.learningStatus || ""}
              onChange={(e) => change("learningStatus", e.target.value)}
            >
              <option value="">{t("vocabulary.allStatuses")}</option>
              {["new", "learning", "reviewing", "mastered"].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("vocabulary.sort")}</span>
            <select
              value={filters.sort}
              onChange={(e) => change("sort", e.target.value)}
            >
              {[
                "recent",
                "alphabetical",
                "weakest",
                "strongest",
                "due_next",
                "most_practiced",
              ].map((k) => (
                <option key={k} value={k}>
                  {t(`vocabulary.sortOptions.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("vocabulary.tag")}</span>
            <select
              value={filters.tagId || ""}
              onChange={(e) => change("tagId", e.target.value)}
            >
              <option value="">{t("vocabulary.allTags")}</option>
              {tags.data?.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("vocabulary.sourceLanguage")}</span>
            <input
              dir="ltr"
              maxLength={64}
              value={filters.sourceLanguageCode || ""}
              onChange={(e) => change("sourceLanguageCode", e.target.value)}
              placeholder="en / fr"
            />
          </label>
          <label className="field">
            <span>{t("vocabulary.translationLanguage")}</span>
            <input
              dir="ltr"
              maxLength={64}
              value={filters.translationLanguageCode || ""}
              onChange={(e) =>
                change("translationLanguageCode", e.target.value)
              }
              placeholder="he / en"
            />
          </label>
          <fieldset className="field pack-filter-field">
            <legend>{t("vocabulary.filterPacks")}</legend>
            <span className="pack-filter-options">
              {installedPacks?.map((pack) => (
                <label className="live-checkbox" key={pack.id}>
                  <input
                    type="checkbox"
                    checked={(filters.packIds || "")
                      .split(",")
                      .includes(pack.id)}
                    onChange={(event) =>
                      togglePack(pack.id, event.target.checked)
                    }
                  />
                  {pack.title}
                </label>
              ))}
              {installedPacks && !installedPacks.length && (
                <small>{t("vocabulary.noActivePacks")}</small>
              )}
            </span>
          </fieldset>
        </div>
        <div className="live-options">
          {["difficult", "highPriority", "due"].map((key) => (
            <label className="live-checkbox" key={key}>
              <input
                type="checkbox"
                checked={filters[key] === "true"}
                onChange={(e) => change(key, e.target.checked ? "true" : "")}
              />
              {t(`vocabulary.filters.${key}`)}
            </label>
          ))}
          <button
            className="button ghost"
            disabled={!canWrite}
            onClick={() => setTagsOpen(true)}
          >
            {t("vocabulary.manageTags")}
          </button>
        </div>
      </section>
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      <RemoteState
        loading={false}
        error={tags.error}
        retry={() => void tags.reload()}
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {resource.data && !resource.loading && (
        <>
          <div className="live-toolbar">
            <label className="live-checkbox">
              <input
                type="checkbox"
                checked={
                  !!resource.data.items.length &&
                  selected.length === resource.data.items.length
                }
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? resource.data!.items.map((i) => i.id)
                      : [],
                  )
                }
              />
              {t("vocabulary.selectPage", {
                count: resource.data.items.length,
              })}
            </label>
            <select
              aria-label={t("vocabulary.bulkAction")}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {actions
                .filter((a) =>
                  filters.userStatus === "deleted"
                    ? a === "restore"
                    : a !== "restore",
                )
                .map((k) => (
                  <option key={k} value={k}>
                    {t(`vocabulary.actions.${k}`)}
                  </option>
                ))}
            </select>
            <button
              className="button secondary"
              disabled={!canWrite || !selected.length || busy}
              onClick={() => void apply()}
            >
              {t("vocabulary.applySelected", { count: selected.length })}
            </button>
            {Boolean(filters.packIds) && resource.data.items.length > 0 && (
              <button
                className="button secondary"
                onClick={() =>
                  setSelected(resource.data!.items.map((item) => item.id))
                }
              >
                {t("vocabulary.selectAllPackWords", {
                  count: resource.data.items.length,
                })}
              </button>
            )}
            {selected.length > 0 && filters.userStatus !== "deleted" && (
              <Link
                className="button primary"
                to={`/learn/session/smart?items=${selected.join(",")}`}
              >
                {t("vocabulary.practiceSelected")}
              </Link>
            )}
          </div>
          <div className="live-word-list">
            {resource.data.items.map((item) => (
              <article className="live-word-row" key={item.id}>
                <input
                  type="checkbox"
                  aria-label={t("vocabulary.selectWord", {
                    word: item.sourceText,
                  })}
                  checked={selected.includes(item.id)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                />
                <button
                  className="live-word-button"
                  disabled={filters.userStatus === "deleted"}
                  onClick={() => setSearchParams({ item: item.id })}
                >
                  <strong dir="auto">{item.sourceText}</strong>
                  <span dir="auto">
                    {item.primaryTranslation || t("vocabulary.noMeaning")}
                  </span>
                  <small>
                    {item.sourceLanguageCode} ← {item.translationLanguageCode}
                  </small>
                </button>
                <span className="pill">
                  {filters.userStatus === "deleted"
                    ? t("labels.deleted")
                    : labels[item.userStatus]}
                </span>
                <span className="pill">{labels[item.learningStatus]}</span>
                <div className="live-word-progress">
                  <b>{Math.round(item.overallMasteryScore)}%</b>
                  <progress
                    value={item.overallMasteryScore}
                    max={100}
                    aria-label={t("vocabulary.serverMastery")}
                  />
                  {item.masteryRequirements?.needsTypedRecall && (
                    <small className="live-mastery-guidance">
                      {t("vocabulary.typedRecallProgress", {
                        successes:
                          item.masteryRequirements.activeRecallSuccesses,
                        requiredSuccesses:
                          item.masteryRequirements.minimumActiveRecallSuccesses,
                        days: item.masteryRequirements.activeRecallCalendarDays,
                        requiredDays:
                          item.masteryRequirements
                            .minimumActiveRecallCalendarDays,
                      })}
                      <br />
                      {masteryRequirementText(item.masteryRequirements)}
                    </small>
                  )}
                </div>
                {filters.userStatus === "deleted" && (
                  <button
                    className="button ghost"
                    disabled={busy}
                    onClick={() => void apply([item.id], "restore")}
                  >
                    {t("vocabulary.actions.restore")}
                  </button>
                )}
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <div className="live-empty">
              <h2>{t("vocabulary.emptyTitle")}</h2>
              <p>{t("vocabulary.emptyDescription")}</p>
              {canWrite ? (
                <button className="button primary" onClick={() => setAdd(true)}>
                  {t("vocabulary.addWord")}
                </button>
              ) : (
                <Link className="button primary" to="/billing">
                  {t("vocabulary.upgradePro")}
                </Link>
              )}
            </div>
          )}
          <div className="live-toolbar">
            {cursor && (
              <button
                className="button ghost"
                onClick={() => {
                  setCursor(undefined);
                  setSelected([]);
                }}
              >
                {t("vocabulary.firstPage")}
              </button>
            )}
            {resource.data.nextCursor && (
              <button
                className="button secondary"
                onClick={() => {
                  setCursor(resource.data!.nextCursor!);
                  setSelected([]);
                }}
              >
                {t("vocabulary.nextPage")}
              </button>
            )}
          </div>
        </>
      )}
      <LiveCaptureModal
        open={add && canWrite}
        onClose={() => setAdd(false)}
        onSaved={() => void resource.reload()}
      />
      {itemId && uuid.safeParse(itemId).success && (
        <Modal
          open
          onClose={() => setSearchParams({})}
          title={t("vocabulary.wordDetails")}
          size="lg"
        >
          <LiveWordDetail
            key={itemId}
            id={itemId}
            onChanged={() => void resource.reload()}
            tags={tags.data?.tags || []}
          />
        </Modal>
      )}
      <Modal
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        title={t("vocabulary.manageTags")}
      >
        <TagManager
          tags={tags.data?.tags || []}
          reload={() => void tags.reload()}
        />
      </Modal>
    </div>
  );
}
function LiveWordDetail({
  id,
  onChanged,
  tags,
}: {
  id: string;
  onChanged: () => void;
  tags: z.infer<typeof tagSchema>[];
}) {
  const detail = useResource(
    useCallback(
      () =>
        product(
          z.object({ learningItem: detailSchema }),
          `learning-items/${id}`,
        ),
      [id],
    ),
  );
  return (
    <div className="modal-body form-stack">
      <RemoteState
        loading={detail.loading}
        error={detail.error}
        retry={() => void detail.reload()}
      />
      {detail.data && (
        <DetailForm
          key={detail.data.learningItem.updatedAt}
          item={detail.data.learningItem}
          tags={tags}
          refresh={async () => {
            await detail.reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
function DetailForm({
  item,
  tags,
  refresh,
}: {
  item: ItemDetail;
  tags: z.infer<typeof tagSchema>[];
  refresh: () => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const { confirm, toast } = useFeedback();
  const primary = item.translations.find((t) => t.isPrimary)?.text || "";
  const [source, setSource] = useState(item.sourceText);
  const [sourceLanguage, setSourceLanguage] = useState(item.sourceLanguageCode);
  const [targetLanguage, setTargetLanguage] = useState(
    item.translationLanguageCode,
  );
  const [translation, setTranslation] = useState(primary);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [examples, setExamples] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [occurrenceCursor, setOccurrenceCursor] = useState<string>();
  const occurrenceUrl = `learning-items/${item.id}/occurrences${query({ limit: "30", cursor: occurrenceCursor })}`;
  const occurrences = useResource(
    useCallback(
      () => product(page(occurrenceSchema), occurrenceUrl),
      [occurrenceUrl],
    ),
  );
  const exampleResource = useResource(
    useCallback(
      () =>
        product(
          z.object({ examples: z.array(exampleSchema) }),
          `learning-items/${item.id}/examples`,
        ),
      [item.id],
    ),
  );
  const mutation = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await run();
      toast(t("vocabulary.savedOnServer"), { tone: "success" });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const semantic =
      source !== item.sourceText ||
      sourceLanguage !== item.sourceLanguageCode ||
      targetLanguage !== item.translationLanguageCode ||
      !item.translations.some((t) => t.text === translation);
    if (semantic) {
      const approved = await confirm({
        title: t("vocabulary.confirmWordChange"),
        message: t("vocabulary.wordChangeDescription"),
        confirmLabel: t("vocabulary.saveChange"),
        tone: "warning",
      });
      if (!approved) return;
    }
    void mutation(() =>
      product(
        z.object({
          learningItem: z.object({
            id: uuid,
            learningRevision: z.number().int(),
            progressReset: z.boolean(),
          }),
        }),
        `learning-items/${item.id}`,
        "PATCH",
        {
          ...(source !== item.sourceText ? { sourceText: source } : {}),
          ...(sourceLanguage !== item.sourceLanguageCode
            ? { sourceLanguageCode: sourceLanguage }
            : {}),
          ...(targetLanguage !== item.translationLanguageCode
            ? { translationLanguageCode: targetLanguage }
            : {}),
          ...(translation !== primary || semantic
            ? { translation: { text: translation, variants: [] } }
            : {}),
          expectedUpdatedAt: item.updatedAt,
        },
      ),
    );
  };
  return (
    <>
      <div className="live-detail-title">
        <h2 dir="auto">{item.sourceText}</h2>
        <p dir="auto">{primary}</p>
        <span className="pill">
          {labels[item.learningStatus]} ·{" "}
          {item.masterySource === "user"
            ? t("vocabulary.masterySources.user")
            : item.masterySource === "system"
              ? t("vocabulary.masterySources.system")
              : t("vocabulary.masterySources.none")}
        </span>
      </div>
      <div className="live-skill-grid">
        {item.skills.map((s) => (
          <div key={s.skillType}>
            <b>{labels[s.skillType]}</b>
            <progress max={100} value={s.masteryScore} />
            <span>
              {t("vocabulary.skillProgress", {
                score: Math.round(s.masteryScore),
                attempts: s.attemptCount,
                confidence: Math.round(s.confidence * 100),
              })}
            </span>
          </div>
        ))}
      </div>
      <p>
        {t("vocabulary.reviewSummary", {
          stage: item.reviewStage,
          next: item.nextReviewAt
            ? new Date(item.nextReviewAt).toLocaleString(i18n.language)
            : t("game.notScheduled"),
          count: item.occurrenceCount,
        })}
      </p>
      <Link
        className="button primary"
        to={`/learn/session/smart?items=${item.id}`}
      >
        {t("vocabulary.practiceWord")}
      </Link>
      <details>
        <summary>{t("vocabulary.allTranslations")}</summary>
        {item.translations.map((t) => (
          <p key={t.id} dir="auto">
            {t.text}
            {t.isPrimary ? ` · ${i18n.t("vocabulary.primary")}` : ""} ·{" "}
            {t.sourceKind}
            {t.providerName ? ` / ${t.providerName}` : ""}
            {t.isUserEdited ? ` · ${i18n.t("vocabulary.editedManually")}` : ""}
          </p>
        ))}
      </details>
      <details>
        <summary>{t("vocabulary.editWordMeaning")}</summary>
        <fieldset disabled={busy} className="form-stack plain-fieldset">
          <label className="field">
            <span>{t("vocabulary.sourceText")}</span>
            <input
              maxLength={500}
              dir="auto"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <div className="live-form-grid">
            <label className="field">
              <span>{t("vocabulary.sourceLanguage")}</span>
              <input
                maxLength={64}
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("vocabulary.translationLanguage")}</span>
              <input
                maxLength={64}
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>{t("vocabulary.primaryMeaning")}</span>
            <input
              dir="auto"
              maxLength={1000}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
            />
          </label>
          <button
            className="button secondary"
            disabled={
              !translation.trim() ||
              (source === item.sourceText &&
                sourceLanguage === item.sourceLanguageCode &&
                targetLanguage === item.translationLanguageCode &&
                translation === primary)
            }
            onClick={() => void save()}
          >
            {t("vocabulary.saveEdit")}
          </button>
        </fieldset>
      </details>
      <details>
        <summary>{t("vocabulary.examplesContexts")}</summary>
        <RemoteState
          loading={exampleResource.loading}
          error={exampleResource.error}
          retry={() => void exampleResource.reload()}
        />
        {exampleResource.data?.examples.map((e) => (
          <blockquote key={e.id} dir="auto">
            {e.text} <small>({e.sourceKind})</small>
          </blockquote>
        ))}
        {exampleResource.data && (
          <>
            <label className="field">
              <span>{t("vocabulary.manualExamplesHelp")}</span>
              <textarea
                maxLength={80000}
                value={
                  examples ??
                  exampleResource.data.examples
                    .filter((e) => e.sourceKind === "user")
                    .map((e) => e.text)
                    .join("\n")
                }
                onChange={(e) => setExamples(e.target.value)}
                dir="auto"
              />
            </label>
            <button
              className="button secondary"
              disabled={busy || examples === undefined}
              onClick={() =>
                void mutation(async () => {
                  await product(
                    z.object({ examples: z.array(exampleSchema) }),
                    `learning-items/${item.id}/examples`,
                    "PUT",
                    {
                      examples: examples!
                        .split("\n")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    },
                  );
                  await exampleResource.reload();
                })
              }
            >
              {t("vocabulary.saveManualExamples")}
            </button>
          </>
        )}
        <RemoteState
          loading={occurrences.loading}
          error={occurrences.error}
          retry={() => void occurrences.reload()}
        />
        {occurrences.data?.items.map((o) => (
          <blockquote key={o.id}>
            <p dir="auto">{o.sentenceText || o.selectedText}</p>
            {o.pageUrl && /^https?:\/\//i.test(o.pageUrl) && (
              <a href={o.pageUrl} target="_blank" rel="noopener noreferrer">
                {o.pageTitle || t("vocabulary.source")}
              </a>
            )}
            <small>
              {new Date(o.capturedAt).toLocaleDateString(i18n.language)}
            </small>
          </blockquote>
        ))}
        {occurrences.data?.nextCursor && (
          <button
            className="button ghost"
            onClick={() => setOccurrenceCursor(occurrences.data!.nextCursor!)}
          >
            {t("vocabulary.moreContexts")}
          </button>
        )}
      </details>
      <details>
        <summary>{t("vocabulary.replaceTags")}</summary>
        <p>{t("vocabulary.replaceTagsDescription")}</p>
        <div className="live-options">
          {tags.map((t) => (
            <label className="live-checkbox" key={t.id}>
              <input
                type="checkbox"
                checked={selectedTags.includes(t.id)}
                onChange={(e) =>
                  setSelectedTags((current) =>
                    e.target.checked
                      ? [...current, t.id]
                      : current.filter((id) => id !== t.id),
                  )
                }
              />
              {t.name}
            </label>
          ))}
        </div>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            void confirm({
              title: t("vocabulary.confirmReplaceTags"),
              message: t("vocabulary.confirmReplaceTagsDescription"),
              confirmLabel: t("vocabulary.replaceTags"),
              tone: "warning",
            }).then((approved) => {
              if (approved)
                void mutation(() =>
                  product(
                    z.object({ id: uuid, tagIds: z.array(uuid) }),
                    `learning-items/${item.id}/tags`,
                    "PUT",
                    { tagIds: selectedTags },
                  ),
                );
            })
          }
        >
          {t("vocabulary.replaceAllTags")}
        </button>
      </details>
      <div className="live-options">
        {[
          "pause",
          "resume",
          "archive",
          "high_priority",
          "normal_priority",
          "mark_hard",
          "clear_hard",
          "mark_mastered",
          "return_to_learning",
        ].map((a) => (
          <button
            className="button ghost"
            key={a}
            disabled={busy}
            onClick={() =>
              void (async () => {
                if (
                  a === "mark_mastered" &&
                  !(await confirm({
                    title: t("vocabulary.confirmMastered"),
                    message: t("vocabulary.manualMasteryDescription"),
                    confirmLabel: t("vocabulary.markMastered"),
                    tone: "warning",
                  }))
                )
                  return;
                void mutation(() =>
                  product(bulkReceipt, "learning-items/bulk", "POST", {
                    ids: [item.id],
                    action: a,
                  }),
                );
              })()
            }
          >
            {t(`vocabulary.actions.${a}`)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
function TagManager({
  tags,
  reload,
}: {
  tags: z.infer<typeof tagSchema>[];
  reload: () => void;
}) {
  const { t } = useTranslation();
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState("");
  const [id, setId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const run = async (remove?: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (remove)
        await product(z.object({ id: uuid }), `tags/${remove}`, "DELETE");
      else
        await product(
          z.object({ tag: tagSchema }),
          id ? `tags/${id}` : "tags",
          id ? "PATCH" : "POST",
          { name },
        );
      setName("");
      setId(undefined);
      reload();
      toast(remove ? t("vocabulary.tagDeleted") : t("vocabulary.tagSaved"), {
        tone: "success",
      });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <div className="modal-body form-stack">
      <label className="field">
        <span>{id ? t("vocabulary.newTagName") : t("vocabulary.newTag")}</span>
        <input
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        className="button primary"
        disabled={busy || !name.trim()}
        onClick={() => void run()}
      >
        {t("vocabulary.save")}
      </button>
      {id && (
        <button
          className="button ghost"
          onClick={() => {
            setId(undefined);
            setName("");
          }}
        >
          {t("vocabulary.cancelEdit")}
        </button>
      )}
      {tags.map((tag) => (
        <div className="live-toolbar" key={tag.id}>
          <span>{tag.name}</span>
          <button
            className="button ghost"
            disabled={busy}
            onClick={() => {
              setId(tag.id);
              setName(tag.name);
            }}
          >
            {t("vocabulary.edit")}
          </button>
          <button
            className="button ghost danger-text"
            disabled={busy}
            onClick={() =>
              void confirm({
                title: t("vocabulary.confirmDeleteTag", { name: tag.name }),
                message: t("vocabulary.deleteTagDescription"),
                confirmLabel: t("vocabulary.deleteTag"),
                tone: "danger",
              }).then((approved) => {
                if (approved) void run(tag.id);
              })
            }
          >
            {t("vocabulary.delete")}
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
