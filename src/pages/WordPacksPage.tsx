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
import { useTranslation } from "react-i18next";

type PackDialog = {
  pack: WordPack;
  entries: WordPackEntry[];
  selected: string[];
  selectable: boolean;
};

export function WordPacksPage() {
  const { t } = useTranslation();
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
        t("packs.added", { selected: dialog.selected.length, added: receipt.added, existing: receipt.linkedExisting }),
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
      title: keepWords ? t("packs.unlinkTitle") : t("packs.removeTitle"),
      message: keepWords
        ? t("packs.unlinkDescription")
        : t("packs.removeDescription"),
      confirmLabel: keepWords ? t("packs.unlinkConfirm") : t("packs.removeConfirm"),
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
          ? t("packs.retained", { count: receipt.retained })
          : t("packs.archived", { archived: receipt.archived, retained: receipt.retained }),
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
          <p className="eyebrow">{t("packs.eyebrow")}</p>
          <h1>{t("packs.title")}</h1>
          <p>{t("packs.description")}</p>
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
                {t(`packs.levels.${group.packs[0]!.track.levelCode}`)} · CEFR{" "}
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
                    <Layers3 size={16} /> {t("packs.module", { number: pack.moduleNumber })}
                  </span>
                  {pack.installed && (
                    <span className="pack-installed">
                      <BookOpenCheck size={15} />
                      {pack.installedVersion !== pack.version
                        ? t("packs.updateAvailable")
                        : t("packs.installed")}
                    </span>
                  )}
                </div>
                <h3>{pack.title}</h3>
                <p>{pack.description}</p>
                <div className="pack-counts">
                  <span>
                    {t("packs.wordCount", { count: pack.wordCount })}
                  </span>
                  {pack.installed && (
                    <>
                      <span>
                        {t("packs.selectedCount", { count: pack.progress.linked })}
                      </span>
                      <span>
                        {t("packs.masteredCount", { count: pack.progress.mastered })}
                      </span>
                    </>
                  )}
                </div>
                <button
                  className="button ghost"
                  disabled={busy === pack.id || detailLoading}
                  onClick={() => void openWords(pack, false)}
                >
                  <Eye size={17} /> {t("packs.showWords")}
                </button>
                {pack.installed ? (
                  <div className="pack-actions">
                    <button
                      className="button secondary"
                      disabled={busy === pack.id}
                      onClick={() => void openWords(pack, true)}
                    >
                      {pack.installedVersion !== pack.version
                        ? t("packs.updateSelection")
                        : t("packs.editSelection")}
                    </button>
                    <Link
                      className="button primary"
                      to={`/learn/session/smart?pack=${pack.id}`}
                    >
                      <Play size={17} /> {t("packs.learnAll")}
                    </Link>
                    <details className="pack-manage">
                      <summary>{t("packs.manage")}</summary>
                      <button
                        className="button ghost"
                        disabled={busy === pack.id}
                        onClick={() => void remove(pack, true)}
                      >
                        {t("packs.unlinkKeep")}
                      </button>
                      <button
                        className="button danger"
                        disabled={busy === pack.id}
                        onClick={() => void remove(pack, false)}
                      >
                        <Trash2 size={16} /> {t("packs.removeExclusive")}
                      </button>
                    </details>
                  </div>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy === pack.id}
                    onClick={() => void openWords(pack, true)}
                  >
                    {t("packs.chooseAdd")}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!packs.loading && !packs.error && !grouped.length && (
        <section className="live-panel">
          <p>{t("packs.empty")}</p>
        </section>
      )}
      <Modal
        open={Boolean(dialog)}
        onClose={() => !busy && setDialog(undefined)}
        title={dialog?.pack.title || t("packs.packWords")}
        size="lg"
        className="pack-word-modal"
      >
        {dialog && (
          <>
            <div className="modal-body pack-word-dialog">
              <div className="pack-selection-summary">
                <p>
                  {dialog.selectable
                    ? t("packs.selectionSummary", { selected: dialog.selected.length, total: dialog.entries.length })
                    : t("packs.dialogCount", { count: dialog.entries.length })}
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
                      {t("packs.selectAll")}
                    </button>
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => setDialog({ ...dialog, selected: [] })}
                    >
                      {t("packs.clearSelection")}
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
                        <em className="pack-included">{t("packs.inLibrary")}</em>
                      )}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions pack-word-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setDialog(undefined)}
              >
                {dialog.selectable ? t("feedback.cancel") : t("common.close")}
              </button>
              {dialog.selectable && (
                <button
                  type="button"
                  className="button primary"
                  disabled={!dialog.selected.length || busy === dialog.pack.id}
                  onClick={() => void add()}
                >
                  {busy === dialog.pack.id
                    ? t("packs.adding")
                    : t("packs.addCount", { count: dialog.selected.length })}
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
