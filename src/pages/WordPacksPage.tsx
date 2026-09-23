import { useCallback, useMemo, useState } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Eye,
  Layers3,
  Play,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import { useFeedback } from "../components/Feedback";
import { useSubscription } from "../context/SubscriptionContext";
import {
  errorMessage,
  product,
  wordPackAddReceiptSchema,
  wordPackDetailSchema,
  wordPackRemoveReceiptSchema,
  wordPacksSchema,
  type WordPack,
  type WordPackEntry,
} from "../lib/product";
import { useResource } from "../lib/useResource";

const levelLabels = {
  beginner: "מתחילים",
  intermediate: "בינוניים",
  advanced: "מתקדמים",
};

type PackDialog = {
  pack: WordPack;
  entries: WordPackEntry[];
  selected: string[];
  selectable: boolean;
};

export function WordPacksPage() {
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const { hasEntitlement } = useSubscription();
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialog, setDialog] = useState<PackDialog>();
  const grouped = useMemo(() => {
    const groups = new Map<string, { title: string; packs: WordPack[] }>();
    for (const pack of packs.data?.packs || []) {
      const current = groups.get(pack.track.id) || {
        title: pack.track.title,
        packs: [],
      };
      current.packs.push(pack);
      groups.set(pack.track.id, current);
    }
    return [...groups.values()];
  }, [packs.data]);

  const openWords = async (pack: WordPack, selectable: boolean) => {
    if (selectable && !hasEntitlement("vocabulary.write")) {
      navigate("/billing");
      return;
    }
    setDetailLoading(true);
    setBusy(pack.id);
    try {
      const detail = await product(
        wordPackDetailSchema,
        `word-packs/${pack.id}`,
      );
      setDialog({
        pack: detail.pack,
        entries: detail.entries,
        selected: detail.pack.installed
          ? detail.entries
              .filter((entry) => entry.learningItemId && !entry.excludedAt)
              .map((entry) => entry.id)
          : detail.entries.map((entry) => entry.id),
        selectable,
      });
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setDetailLoading(false);
      setBusy(undefined);
    }
  };

  const add = async () => {
    if (!dialog?.selected.length) return;
    setBusy(dialog.pack.id);
    try {
      const receipt = await product(
        wordPackAddReceiptSchema,
        `word-packs/${dialog.pack.id}/add`,
        "POST",
        { entryIds: dialog.selected },
      );
      toast(
        `המאגר נוסף עם ${dialog.selected.length} מילים: ${receipt.added} חדשות ו־${receipt.linkedExisting} שכבר היו בספרייה.`,
        { tone: "success" },
      );
      setDialog(undefined);
      await packs.reload();
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const remove = async (pack: WordPack, keepWords: boolean) => {
    const approved = await confirm({
      title: keepWords ? "הסרת שיוך המאגר" : "הסרת המאגר",
      message: keepWords
        ? "המאגר יוסר, אך כל המילים יישארו פעילות בספרייה שלך."
        : "מילים שהגיעו רק מהמאגר יעברו לארכיון. מילים ממקור נוסף והתקדמות הלימוד יישמרו.",
      confirmLabel: keepWords ? "הסר והשאר מילים" : "הסר מאגר",
      tone: keepWords ? "warning" : "danger",
    });
    if (!approved) return;
    setBusy(pack.id);
    try {
      const receipt = await product(
        wordPackRemoveReceiptSchema,
        `word-packs/${pack.id}?mode=${keepWords ? "keep_words" : "archive_exclusive"}`,
        "DELETE",
      );
      toast(
        keepWords
          ? `${receipt.retained} מילים נשארו בספרייה.`
          : `${receipt.archived} מילים עברו לארכיון ו־${receipt.retained} נשארו פעילות.`,
        { tone: "success" },
      );
      await packs.reload();
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const toggleEntry = (id: string, checked: boolean) =>
    setDialog((current) =>
      current
        ? {
            ...current,
            selected: checked
              ? [...current.selected, id]
              : current.selected.filter((entryId) => entryId !== id),
          }
        : current,
    );

  return (
    <div className="word-packs-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">מסלולי מילים לפי נושא ורמה</p>
          <h1>מאגרי מילים</h1>
          <p>צפו במילים, בחרו מה להוסיף ולמדו את כל המאגר בסשן ממוקד.</p>
        </div>
      </section>
      <RemoteState
        loading={packs.loading}
        error={packs.error}
        retry={() => void packs.reload()}
      />
      {grouped.map((group) => (
        <section className="pack-track" key={group.packs[0]!.track.id}>
          <div className="pack-track-heading">
            <span className="pack-track-icon">
              <BriefcaseBusiness size={22} />
            </span>
            <div>
              <h2>{group.title}</h2>
              <p>
                {levelLabels[group.packs[0]!.track.levelCode]} · CEFR{" "}
                {group.packs[0]!.track.cefrFrom}–{group.packs[0]!.track.cefrTo}
              </p>
            </div>
          </div>
          <div className="pack-grid">
            {group.packs.map((pack) => (
              <article
                className={`pack-card ${pack.installed ? "installed" : ""}`}
                key={pack.id}
              >
                <div className="pack-card-top">
                  <span className="pack-module">
                    <Layers3 size={16} /> יחידה {pack.moduleNumber}
                  </span>
                  {pack.installed && (
                    <span className="pack-installed">
                      <BookOpenCheck size={15} />
                      {pack.installedVersion !== pack.version
                        ? "עדכון זמין"
                        : "נוסף"}
                    </span>
                  )}
                </div>
                <h3>{pack.title}</h3>
                <p>{pack.description}</p>
                <div className="pack-counts">
                  <span>
                    <b>{pack.wordCount}</b> מילים
                  </span>
                  {pack.installed && (
                    <>
                      <span>
                        <b>{pack.progress.linked}</b> נבחרו
                      </span>
                      <span>
                        <b>{pack.progress.mastered}</b> הושלמו
                      </span>
                    </>
                  )}
                </div>
                <button
                  className="button ghost"
                  disabled={busy === pack.id || detailLoading}
                  onClick={() => void openWords(pack, false)}
                >
                  <Eye size={17} /> הצגת המילים
                </button>
                {pack.installed ? (
                  <div className="pack-actions">
                    <button
                      className="button secondary"
                      disabled={busy === pack.id}
                      onClick={() => void openWords(pack, true)}
                    >
                      {pack.installedVersion !== pack.version
                        ? "עדכון ובחירת מילים"
                        : "עריכת בחירת המילים"}
                    </button>
                    <Link
                      className="button primary"
                      to={`/learn/session/smart?pack=${pack.id}`}
                    >
                      <Play size={17} /> לימוד כל המאגר
                    </Link>
                    <details className="pack-manage">
                      <summary>ניהול מאגר</summary>
                      <button
                        className="button ghost"
                        disabled={busy === pack.id}
                        onClick={() => void remove(pack, true)}
                      >
                        הסר שיוך והשאר מילים
                      </button>
                      <button
                        className="button danger"
                        disabled={busy === pack.id}
                        onClick={() => void remove(pack, false)}
                      >
                        <Trash2 size={16} /> הסר מילים בלעדיות
                      </button>
                    </details>
                  </div>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy === pack.id}
                    onClick={() => void openWords(pack, true)}
                  >
                    בחר והוסף מילים
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!packs.loading && !packs.error && !grouped.length && (
        <section className="live-panel">
          <p>אין כרגע מאגרים זמינים לצמד השפות שלך.</p>
        </section>
      )}
      <Modal
        open={Boolean(dialog)}
        onClose={() => !busy && setDialog(undefined)}
        title={dialog?.pack.title || "מילות המאגר"}
        size="lg"
      >
        {dialog && (
          <>
            <div className="modal-body pack-word-dialog">
              <div className="pack-selection-summary">
                <p>
                  {dialog.selectable
                    ? `${dialog.selected.length} מתוך ${dialog.entries.length} מילים מסומנות להוספה.`
                    : `${dialog.entries.length} מילים במאגר.`}
                </p>
                {dialog.selectable && (
                  <div className="live-options">
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() =>
                        setDialog({
                          ...dialog,
                          selected: dialog.entries.map((entry) => entry.id),
                        })
                      }
                    >
                      סמן הכול
                    </button>
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => setDialog({ ...dialog, selected: [] })}
                    >
                      נקה בחירה
                    </button>
                  </div>
                )}
              </div>
              <div className="pack-word-list">
                {dialog.entries.map((entry) => (
                  <label className="pack-word-row" key={entry.id}>
                    {dialog.selectable && (
                      <input
                        type="checkbox"
                        checked={dialog.selected.includes(entry.id)}
                        onChange={(event) =>
                          toggleEntry(entry.id, event.target.checked)
                        }
                      />
                    )}
                    <span>
                      <b dir="auto">{entry.sourceText}</b>
                      <span dir="auto">{entry.translationText}</span>
                      {entry.exampleText && (
                        <small dir="auto">{entry.exampleText}</small>
                      )}
                    </span>
                    {dialog.pack.installed &&
                      entry.learningItemId &&
                      !entry.excludedAt && (
                        <em className="pack-included">בספרייה</em>
                      )}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setDialog(undefined)}
              >
                {dialog.selectable ? "ביטול" : "סגירה"}
              </button>
              {dialog.selectable && (
                <button
                  type="button"
                  className="button primary"
                  disabled={!dialog.selected.length || busy === dialog.pack.id}
                  onClick={() => void add()}
                >
                  {busy === dialog.pack.id
                    ? "מוסיף…"
                    : `הוסף ${dialog.selected.length} מילים`}
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
