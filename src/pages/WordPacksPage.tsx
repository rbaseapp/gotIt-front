import { useCallback, useMemo, useState } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  Compass,
  Eye,
  Layers3,
  Play,
  Search,
  Trash2,
  X,
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
  const [search, setSearch] = useState("");
  const [topicId, setTopicId] = useState("");
  const [level, setLevel] = useState("");
  const [availability, setAvailability] = useState("");
  const topics = useMemo(() => {
    const available = new Map<
      string,
      {
        id: string;
        title: string;
        packCount: number;
        wordCount: number;
        installedCount: number;
      }
    >();
    for (const pack of packs.data?.packs || []) {
      const current = available.get(pack.topic.id) || {
        id: pack.topic.id,
        title: pack.topic.title,
        packCount: 0,
        wordCount: 0,
        installedCount: 0,
      };
      current.packCount += 1;
      current.wordCount += pack.wordCount;
      current.installedCount += pack.installed ? 1 : 0;
      available.set(pack.topic.id, current);
    }
    return [...available.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    );
  }, [packs.data]);
  const filteredPacks = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (packs.data?.packs || []).filter((pack) => {
      if (topicId && pack.topic.id !== topicId) return false;
      if (level && pack.track.levelCode !== level) return false;
      if (availability === "installed" && !pack.installed) return false;
      if (availability === "available" && pack.installed) return false;
      if (!needle) return true;
      return [
        pack.title,
        pack.description,
        pack.topic.title,
        pack.track.title,
      ].some((value) => value.toLocaleLowerCase().includes(needle));
    });
  }, [availability, level, packs.data, search, topicId]);
  const grouped = useMemo(() => {
    const groups = new Map<string, { title: string; packs: WordPack[] }>();
    for (const pack of filteredPacks) {
      const current = groups.get(pack.track.id) || {
        title: pack.track.title,
        packs: [],
      };
      current.packs.push(pack);
      groups.set(pack.track.id, current);
    }
    return [...groups.values()];
  }, [filteredPacks]);
  const installedCount =
    packs.data?.packs.filter((pack) => pack.installed).length || 0;
  const hasFilters = Boolean(search || topicId || level || availability);
  const clearFilters = () => {
    setSearch("");
    setTopicId("");
    setLevel("");
    setAvailability("");
  };

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
        t("packs.added", {
          selected: dialog.selected.length,
          added: receipt.added,
          existing: receipt.linkedExisting,
        }),
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
      confirmLabel: keepWords
        ? t("packs.unlinkConfirm")
        : t("packs.removeConfirm"),
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
          : t("packs.archived", {
              archived: receipt.archived,
              retained: receipt.retained,
            }),
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
      {packs.data && packs.data.packs.length > 0 && (
        <section
          className="pack-explorer live-panel"
          aria-labelledby="pack-explorer-title"
        >
          <div className="pack-explorer-heading">
            <div className="pack-explorer-title">
              <span className="pack-track-icon">
                <Compass size={22} />
              </span>
              <div>
                <h2 id="pack-explorer-title">{t("packs.availableTopics")}</h2>
                <p>{t("packs.availableTopicsDescription")}</p>
              </div>
            </div>
            <div
              className="pack-overview"
              aria-label={t("packs.overviewLabel")}
            >
              <span>
                <b>{topics.length}</b>
                {t("packs.topicCount", { count: topics.length })}
              </span>
              <span>
                <b>{packs.data.packs.length}</b>
                {t("packs.title")}
              </span>
              <span>
                <b>{installedCount}</b>
                {t("packs.installed")}
              </span>
            </div>
          </div>
          <label className="pack-search">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">{t("packs.searchLabel")}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("packs.searchPlaceholder")}
            />
          </label>
          <div
            className="pack-topic-list"
            role="group"
            aria-label={t("packs.chooseTopic")}
          >
            <button
              type="button"
              className={`pack-topic-card ${topicId ? "" : "active"}`}
              aria-pressed={!topicId}
              onClick={() => setTopicId("")}
            >
              <span className="pack-topic-check">
                <Check size={15} />
              </span>
              <strong>{t("packs.allTopics")}</strong>
              <small>
                {t("packs.packCount", { count: packs.data.packs.length })}
              </small>
            </button>
            {topics.map((topic) => (
              <button
                type="button"
                className={`pack-topic-card ${topicId === topic.id ? "active" : ""}`}
                aria-pressed={topicId === topic.id}
                key={topic.id}
                onClick={() => setTopicId(topic.id === topicId ? "" : topic.id)}
              >
                <span className="pack-topic-check">
                  <Check size={15} />
                </span>
                <strong>{topic.title}</strong>
                <small>
                  {t("packs.topicSummary", {
                    packs: topic.packCount,
                    words: topic.wordCount,
                  })}
                </small>
                {topic.installedCount > 0 && (
                  <em>
                    {t("packs.topicAdded", { count: topic.installedCount })}
                  </em>
                )}
              </button>
            ))}
          </div>
          <div className="pack-explorer-filters">
            <label className="field">
              <span>{t("packs.levelFilter")}</span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option value="">{t("packs.allLevels")}</option>
                {(["beginner", "intermediate", "advanced"] as const).map(
                  (value) => (
                    <option value={value} key={value}>
                      {t(`packs.levels.${value}`)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              <span>{t("packs.availabilityFilter")}</span>
              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
              >
                <option value="">{t("packs.allPacks")}</option>
                <option value="installed">{t("packs.addedPacks")}</option>
                <option value="available">{t("packs.notAddedPacks")}</option>
              </select>
            </label>
            <p className="pack-results-summary" role="status">
              {t("packs.resultsSummary", { count: filteredPacks.length })}
            </p>
            {hasFilters && (
              <button
                type="button"
                className="button ghost"
                onClick={clearFilters}
              >
                <X size={16} /> {t("packs.clearFilters")}
              </button>
            )}
          </div>
        </section>
      )}
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
                    <Layers3 size={16} />{" "}
                    {t("packs.module", { number: pack.moduleNumber })}
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
                <div className="pack-card-context">
                  <span>{pack.topic.title}</span>
                  <span>
                    {t(`packs.levels.${pack.track.levelCode}`)} ·{" "}
                    {pack.track.cefrFrom}–{pack.track.cefrTo}
                  </span>
                </div>
                <h3>{pack.title}</h3>
                <p>{pack.description}</p>
                <div className="pack-counts">
                  <span>{t("packs.wordCount", { count: pack.wordCount })}</span>
                  {pack.installed && (
                    <>
                      <span>
                        {t("packs.selectedCount", {
                          count: pack.progress.linked,
                        })}
                      </span>
                      <span>
                        {t("packs.masteredCount", {
                          count: pack.progress.mastered,
                        })}
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
      {!packs.loading &&
        !packs.error &&
        packs.data &&
        packs.data.packs.length > 0 &&
        !grouped.length && (
          <section className="pack-empty-results live-panel">
            <Compass size={30} />
            <h2>{t("packs.noResultsTitle")}</h2>
            <p>{t("packs.noResultsDescription")}</p>
            <button
              type="button"
              className="button secondary"
              onClick={clearFilters}
            >
              {t("packs.clearFilters")}
            </button>
          </section>
        )}
      {!packs.loading && !packs.error && !packs.data?.packs.length && (
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
                    ? t("packs.selectionSummary", {
                        selected: dialog.selected.length,
                        total: dialog.entries.length,
                      })
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
                        <em className="pack-included">
                          {t("packs.inLibrary")}
                        </em>
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
