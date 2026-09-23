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

const actions: Record<string, string> = {
  pause: "השהיה",
  resume: "הפעלה",
  archive: "העברה לארכיון",
  delete: "מחיקה לסל",
  restore: "שחזור",
  mark_mastered: "סימון ידני כנלמד",
  return_to_learning: "החזרה ללמידה",
  high_priority: "עדיפות גבוהה",
  normal_priority: "עדיפות רגילה",
  mark_hard: "סימון כקשה",
  clear_hard: "ביטול סימון קשה",
};
const bulkReceipt = z.object({ ids: z.array(uuid), action: z.string() });
export function LiveVocabularyPage() {
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
      toast("עריכת מילים ושמירת מילים חדשות זמינות ב־PRO.", {
        tone: "info",
      });
      return;
    }
    if (!ids.length || busy) return;
    if (["delete", "mark_mastered", "restore"].includes(operation)) {
      const approved = await confirm({
        title: `${actions[operation]} עבור ${ids.length} מילים?`,
        message:
          operation === "delete"
            ? "המילים יועברו לסל ויהיה אפשר לשחזר אותן בהמשך."
            : operation === "restore"
              ? "המילים יחזרו לספרייה הפעילה שלך."
              : "זהו סימון ידני ולא ציון שנקבע על ידי מערכת הלמידה.",
        confirmLabel: actions[operation],
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
      toast("השינוי נשמר בשרת.", { tone: "success" });
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
          <p className="eyebrow">המילים שלך, מכל מקום</p>
          <h1>אוצר המילים שלי</h1>
          <p>משמעויות והקשרים נפרדים. כל ההתקדמות מגיעה מהשרת.</p>
        </div>
        {canWrite ? (
          <button className="button primary" onClick={() => setAdd(true)}>
            <Plus size={18} />
            מילה חדשה
          </button>
        ) : (
          <Link className="button primary" to="/billing">
            שדרוג לשמירת מילים
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
            <span>חיפוש בטקסט המקור</span>
            <input
              maxLength={500}
              dir="auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="איזו מילה מחפשים?"
            />
          </label>
          <button className="button secondary">
            <Search size={18} />
            חיפוש
          </button>
        </form>
        <div className="live-filter-grid">
          <label className="field">
            <span>מצב משתמש</span>
            <select
              value={filters.userStatus}
              onChange={(e) => change("userStatus", e.target.value)}
            >
              <option value="all">הכול (ללא סל)</option>
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
                    תגיות קודמות
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
                    תגיות נוספות
                  </button>
                )}
              </span>
            )}
          </label>
          <label className="field">
            <span>מצב למידה</span>
            <select
              value={filters.learningStatus || ""}
              onChange={(e) => change("learningStatus", e.target.value)}
            >
              <option value="">כל המצבים</option>
              {["new", "learning", "reviewing", "mastered"].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>מיון</span>
            <select
              value={filters.sort}
              onChange={(e) => change("sort", e.target.value)}
            >
              {Object.entries({
                recent: "האחרונות שנוספו",
                alphabetical: "אלפביתי",
                weakest: "החלשות תחילה",
                strongest: "החזקות תחילה",
                due_next: "מועד החזרה",
                most_practiced: "המתורגלות ביותר",
              }).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>תגית</span>
            <select
              value={filters.tagId || ""}
              onChange={(e) => change("tagId", e.target.value)}
            >
              <option value="">כל התגיות</option>
              {tags.data?.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>שפת המקור</span>
            <input
              dir="ltr"
              maxLength={64}
              value={filters.sourceLanguageCode || ""}
              onChange={(e) => change("sourceLanguageCode", e.target.value)}
              placeholder="en / fr"
            />
          </label>
          <label className="field">
            <span>שפת התרגום</span>
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
            <legend>סינון לפי מאגרים</legend>
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
                <small>אין מאגרים פעילים. אפשר להוסיף מאגר ממסך המאגרים.</small>
              )}
            </span>
          </fieldset>
        </div>
        <div className="live-options">
          {[
            ["difficult", "קשות בלבד"],
            ["highPriority", "עדיפות גבוהה"],
            ["due", "לחזרה עכשיו"],
          ].map(([key, label]) => (
            <label className="live-checkbox" key={key}>
              <input
                type="checkbox"
                checked={filters[key] === "true"}
                onChange={(e) => change(key, e.target.checked ? "true" : "")}
              />
              {label}
            </label>
          ))}
          <button
            className="button ghost"
            disabled={!canWrite}
            onClick={() => setTagsOpen(true)}
          >
            ניהול תגיות
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
              בחירת העמוד ({resource.data.items.length})
            </label>
            <select
              aria-label="פעולה קבוצתית"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {Object.entries(actions)
                .filter(([a]) =>
                  filters.userStatus === "deleted"
                    ? a === "restore"
                    : a !== "restore",
                )
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
            <button
              className="button secondary"
              disabled={!canWrite || !selected.length || busy}
              onClick={() => void apply()}
            >
              החלה על {selected.length} נבחרות
            </button>
            {Boolean(filters.packIds) && resource.data.items.length > 0 && (
              <button
                className="button secondary"
                onClick={() =>
                  setSelected(resource.data!.items.map((item) => item.id))
                }
              >
                בחירת כל מילות המאגרים ({resource.data.items.length})
              </button>
            )}
            {selected.length > 0 && filters.userStatus !== "deleted" && (
              <Link
                className="button primary"
                to={`/learn/session/recall?items=${selected.join(",")}`}
              >
                תרגול הנבחרות
              </Link>
            )}
          </div>
          <div className="live-word-list">
            {resource.data.items.map((item) => (
              <article className="live-word-row" key={item.id}>
                <input
                  type="checkbox"
                  aria-label={`בחירת ${item.sourceText}`}
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
                    {item.primaryTranslation || "ללא משמעות"}
                  </span>
                  <small>
                    {item.sourceLanguageCode} ← {item.translationLanguageCode}
                  </small>
                </button>
                <span className="pill">
                  {filters.userStatus === "deleted"
                    ? "בסל המחזור"
                    : labels[item.userStatus]}
                </span>
                <span className="pill">{labels[item.learningStatus]}</span>
                <div className="live-word-progress">
                  <b>{Math.round(item.overallMasteryScore)}%</b>
                  <progress
                    value={item.overallMasteryScore}
                    max={100}
                    aria-label="שליטה כוללת מהשרת"
                  />
                  {item.masteryRequirements?.needsTypedRecall && (
                    <small className="live-mastery-guidance">
                      {`שליפה מוקלדת: ${item.masteryRequirements.activeRecallSuccesses}/${item.masteryRequirements.minimumActiveRecallSuccesses} · ימים: ${item.masteryRequirements.activeRecallCalendarDays}/${item.masteryRequirements.minimumActiveRecallCalendarDays}`}
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
                    שחזור
                  </button>
                )}
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <div className="live-empty">
              <h2>אין מילים להצגה</h2>
              <p>נסו סינון אחר או הוסיפו את המילה הראשונה.</p>
              {canWrite ? (
                <button className="button primary" onClick={() => setAdd(true)}>
                  הוספת מילה
                </button>
              ) : (
                <Link className="button primary" to="/billing">
                  שדרוג ל־PRO
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
                לעמוד הראשון
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
                לעמוד הבא
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
          title="פרטי המילה"
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
        title="ניהול תגיות"
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
      toast("נשמר בשרת.", { tone: "success" });
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
        title: "לשמור את השינוי במילה?",
        message:
          "שינוי המילה, השפה או המשמעות עשוי לאפס את השליטה והכישורים לגרסת למידה חדשה. ההיסטוריה תישמר.",
        confirmLabel: "שמירת השינוי",
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
            ? "סימון משתמש"
            : item.masterySource === "system"
              ? "מנוע הלמידה"
              : "טרם נצברה ראיה"}
        </span>
      </div>
      <div className="live-skill-grid">
        {item.skills.map((s) => (
          <div key={s.skillType}>
            <b>{labels[s.skillType]}</b>
            <progress max={100} value={s.masteryScore} />
            <span>
              {Math.round(s.masteryScore)}% · {s.attemptCount} ניסיונות · ביטחון{" "}
              {Math.round(s.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
      <p>
        שלב חזרה: {item.reviewStage} · מועד הבא:{" "}
        {item.nextReviewAt
          ? new Date(item.nextReviewAt).toLocaleString("he-IL")
          : "טרם נקבע"}{" "}
        · {item.occurrenceCount} הקשרים
      </p>
      <Link
        className="button primary"
        to={`/learn/session/recall?items=${item.id}`}
      >
        תרגול המילה
      </Link>
      <details>
        <summary>כל התרגומים ומקורם</summary>
        {item.translations.map((t) => (
          <p key={t.id} dir="auto">
            {t.text}
            {t.isPrimary ? " · ראשי" : ""} · {t.sourceKind}
            {t.providerName ? ` / ${t.providerName}` : ""}
            {t.isUserEdited ? " · נערך ידנית" : ""}
          </p>
        ))}
      </details>
      <details>
        <summary>עריכת מילה ומשמעות</summary>
        <fieldset disabled={busy} className="form-stack plain-fieldset">
          <label className="field">
            <span>טקסט המקור</span>
            <input
              maxLength={500}
              dir="auto"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <div className="live-form-grid">
            <label className="field">
              <span>שפת מקור</span>
              <input
                maxLength={64}
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
              />
            </label>
            <label className="field">
              <span>שפת תרגום</span>
              <input
                maxLength={64}
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>משמעות ראשית</span>
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
            שמירת עריכה
          </button>
        </fieldset>
      </details>
      <details>
        <summary>דוגמאות והקשרים</summary>
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
              <span>דוגמאות ידניות — אחת בכל שורה, עד 20</span>
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
              שמירת דוגמאות ידניות
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
                {o.pageTitle || "מקור"}
              </a>
            )}
            <small>{new Date(o.capturedAt).toLocaleDateString("he-IL")}</small>
          </blockquote>
        ))}
        {occurrences.data?.nextCursor && (
          <button
            className="button ghost"
            onClick={() => setOccurrenceCursor(occurrences.data!.nextCursor!)}
          >
            הקשרים נוספים
          </button>
        )}
      </details>
      <details>
        <summary>החלפת תגיות</summary>
        <p>
          השרת אינו מחזיר כרגע את שיוכי התגיות בפרטי המילה. הפעולה הבאה מחליפה
          את כל השיוכים, ולא מוסיפה לרשימה נסתרת.
        </p>
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
              title: "להחליף את כל תגיות המילה?",
              message:
                "הבחירה הנוכחית תחליף את כל שיוכי התגיות הקיימים של המילה.",
              confirmLabel: "החלפת התגיות",
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
          החלפת כל התגיות
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
                    title: "לסמן את המילה כנלמדה?",
                    message:
                      "זהו סימון ידני ולא ציון שנקבע על ידי מערכת הלמידה.",
                    confirmLabel: "סימון כנלמד",
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
            {actions[a]}
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
      toast(remove ? "התגית נמחקה." : "התגית נשמרה.", {
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
        <span>{id ? "שם חדש לתגית" : "תגית חדשה"}</span>
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
        שמירה
      </button>
      {id && (
        <button
          className="button ghost"
          onClick={() => {
            setId(undefined);
            setName("");
          }}
        >
          ביטול עריכה
        </button>
      )}
      {tags.map((t) => (
        <div className="live-toolbar" key={t.id}>
          <span>{t.name}</span>
          <button
            className="button ghost"
            disabled={busy}
            onClick={() => {
              setId(t.id);
              setName(t.name);
            }}
          >
            עריכה
          </button>
          <button
            className="button ghost danger-text"
            disabled={busy}
            onClick={() =>
              void confirm({
                title: `למחוק את התגית „${t.name}”?`,
                message: "מחיקת התגית תסיר את כל השיוכים שלה מהמילים.",
                confirmLabel: "מחיקת התגית",
                tone: "danger",
              }).then((approved) => {
                if (approved) void run(t.id);
              })
            }
          >
            מחיקה
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
