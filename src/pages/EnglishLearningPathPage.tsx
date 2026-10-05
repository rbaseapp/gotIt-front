import { useCallback, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Eye, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
} from "../lib/product";
import { useResource } from "../lib/useResource";

type Preview = { pack: WordPack; entries: WordPackEntry[] };

export function EnglishLearningPathPage() {
  const { t } = useTranslation();
  const { toast } = useFeedback();
  const { hasEntitlement } = useSubscription();
  const navigate = useNavigate();
  const resource = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const levels = useMemo(
    () => englishPathLevels(resource.data?.packs ?? []),
    [resource.data],
  );
  const [preview, setPreview] = useState<Preview>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const available = levels.some(({ packs }) => packs.length);
  const next = levels
    .flatMap(({ packs }) => packs)
    .find((pack) => !completedEnglishUnit(pack));

  const openUnit = async (pack: WordPack) => {
    setDetailLoading(true);
    try {
      const detail = await product(
        wordPackDetailSchema,
        `word-packs/${pack.id}`,
      );
      setSelectedIds([]);
      setPreview({ pack: detail.pack, entries: detail.entries });
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setDetailLoading(false);
    }
  };

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
        `/learn/session/smart?pack=${pack.id}&return=%2Fenglish-learning`,
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
          <h1>{t("englishPath.title")}</h1>
          <p>{t("englishPath.description")}</p>
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
          {next && (
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
          {levels
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
                              pack.progress.completed ?? pack.progress.mastered
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
      <Modal
        open={Boolean(preview)}
        className="english-path-word-modal"
        onClose={() => !busy && setPreview(undefined)}
        title={
          preview
            ? `${t(`englishPath.levels.${preview.pack.track.levelCode}`)} · ${preview.pack.title}`
            : t("englishPath.title")
        }
        size="lg"
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
                    to={`/learn/session/smart?pack=${preview.pack.id}`}
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
