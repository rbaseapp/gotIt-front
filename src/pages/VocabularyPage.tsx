import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Filter,
  Flag,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { cn, isDue, skillLabels, speak, statusLabels } from "../lib/utils";
import type { LearningItem, LearningStatus, SkillKey } from "../types";
import { AddWordModal } from "../components/AddWordModal";
import { CapabilityNotice } from "../components/CapabilityNotice";
import { Modal } from "../components/Modal";
import { useTranslation } from "react-i18next";

type FilterKey =
  | "ALL"
  | LearningStatus
  | "DUE"
  | "HARD"
  | "HIGH"
  | "PAUSED"
  | "ARCHIVED"
  | "DELETED";
const filters: FilterKey[] = [
  "ALL",
  "NEW",
  "LEARNING",
  "REVIEWING",
  "MASTERED",
  "DUE",
  "HARD",
  "HIGH",
  "PAUSED",
  "ARCHIVED",
  "DELETED",
];

function WordDetail({
  item,
  onClose,
  onEdit,
}: {
  item: LearningItem;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { updateItem, deleteItem, attempts } = useApp();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={t("demoVocabulary.wordDetails")}
      size="lg"
    >
      <div className="word-detail">
        <div className="word-detail-hero">
          <button
            className="sound-orb-small"
            aria-label={t("demoVocabulary.playWord")}
            onClick={() => speak(item.source, item.sourceLanguage)}
          >
            <Volume2 size={21} />
          </button>
          <div>
            <span className="status-chip" data-status={item.status}>
              {statusLabels[item.status]}
            </span>
            <h2 dir="auto">{item.source}</h2>
            <p dir="ltr">
              {item.phonetic} · {item.sourceLanguage} →{" "}
              {item.translationLanguage}
            </p>
            <strong dir="auto">{item.translation}</strong>
            {item.translations?.map((value) => (
              <small dir="auto" key={value}>
                {value}
              </small>
            ))}
          </div>
          <div
            className="mastery-circle"
            style={
              {
                "--progress": item.mastery * 3.6 + "deg",
              } as React.CSSProperties
            }
          >
            <span>
              {item.mastery}
              <small>%</small>
            </span>
          </div>
        </div>
        {item.masterySource === "USER" && (
          <p className="muted-note">{t("demoVocabulary.manualStatusNote")}</p>
        )}
        <div className="detail-section">
          <span>{t("demoVocabulary.savedContext")}</span>
          <blockquote dir="auto">
            “{item.context || t("demoVocabulary.noSourceSentence")}”
          </blockquote>
          {item.sourceTitle && (
            <small>
              <BookOpen size={14} />
              {item.sourceTitle}
            </small>
          )}
          {item.occurrences?.slice(1).map((occurrence, index) => (
            <blockquote dir="auto" key={index}>
              {occurrence.context}
            </blockquote>
          ))}
        </div>
        {item.examples?.length ? (
          <div className="detail-section">
            <span>{t("demoVocabulary.moreExamples")}</span>
            {item.examples.map((example) => (
              <blockquote dir="auto" key={example}>
                {example}
              </blockquote>
            ))}
          </div>
        ) : null}
        <div className="detail-section">
          <span>{t("demoVocabulary.skillsNote")}</span>
          <div className="detail-skills">
            {Object.entries(item.skills).map(([key, value]) => (
              <div key={key}>
                <small>{skillLabels[key as SkillKey]}</small>
                <div className="progress-track">
                  <i style={{ width: value + "%" }} />
                </div>
                <b>{value}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-section">
          <span>{t("vocabulary.tag")}</span>
          <div className="tag-list">
            {item.tags.length ? (
              item.tags.map((tag) => (
                <span key={tag}>
                  <Tag size={13} />
                  {tag}
                </span>
              ))
            ) : (
              <small>{t("demoVocabulary.noTags")}</small>
            )}
          </div>
        </div>
        <div className="detail-actions wrap-actions">
          <button
            className="button primary"
            disabled={item.userStatus !== "ACTIVE" || !!item.deletedAt}
            onClick={() =>
              navigate(
                "/learn/session/smart?items=" + encodeURIComponent(item.id),
              )
            }
          >
            <Play size={17} />
            {t("demoVocabulary.practiceThisWord")}
          </button>
          <button className="button secondary" onClick={onEdit}>
            <Pencil size={17} />
            {t("vocabulary.edit")}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              updateItem(item.id, {
                userStatus: item.userStatus === "ACTIVE" ? "PAUSED" : "ACTIVE",
              })
            }
          >
            <Pause size={17} />
            {item.userStatus === "ACTIVE"
              ? t("vocabulary.actions.pause")
              : t("vocabulary.actions.return_to_learning")}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              updateItem(item.id, {
                status: item.status === "MASTERED" ? "LEARNING" : "MASTERED",
                masterySource: "USER",
                firstMasteredAt:
                  item.status === "MASTERED"
                    ? item.firstMasteredAt
                    : item.firstMasteredAt || new Date().toISOString(),
              })
            }
          >
            <Check size={17} />
            {item.status === "MASTERED"
              ? t("vocabulary.actions.return_to_learning")
              : t("vocabulary.markMastered")}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              updateItem(item.id, {
                priority: item.priority === "HIGH" ? "NORMAL" : "HIGH",
              })
            }
          >
            <Flag size={17} />
            {item.priority === "HIGH"
              ? t("vocabulary.actions.normal_priority")
              : t("vocabulary.actions.high_priority")}
          </button>
          <button
            className="button secondary"
            onClick={() => updateItem(item.id, { hard: !item.hard })}
          >
            {item.hard
              ? t("vocabulary.actions.clear_hard")
              : t("vocabulary.actions.mark_hard")}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              updateItem(item.id, {
                userStatus:
                  item.userStatus === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
              })
            }
          >
            <Archive size={17} />
            {item.userStatus === "ARCHIVED"
              ? t("demoVocabulary.unarchive")
              : t("labels.archived")}
          </button>
          <button
            className="button icon-danger"
            aria-label={
              item.deletedAt
                ? t("demoVocabulary.restoreWord")
                : t("demoVocabulary.deleteWord")
            }
            onClick={() =>
              item.deletedAt
                ? updateItem(item.id, { deletedAt: null })
                : setConfirmDelete(true)
            }
          >
            {item.deletedAt ? <Plus size={18} /> : <Trash2 size={18} />}
          </button>
        </div>
        {confirmDelete && (
          <div className="delete-confirm">
            <p>{t("demoVocabulary.softDeleteDescription")}</p>
            <button
              className="button secondary"
              onClick={() => setConfirmDelete(false)}
            >
              {t("feedback.cancel")}
            </button>
            <button
              className="button primary"
              onClick={() => {
                deleteItem(item.id);
                onClose();
              }}
            >
              {t("demoVocabulary.softDelete")}
            </button>
          </div>
        )}
        <div className="detail-section">
          <span>{t("demoVocabulary.recentAttempts")}</span>
          {attempts
            .filter((attempt) => attempt.itemId === item.id)
            .slice(-5)
            .reverse()
            .map((attempt) => (
              <div className="attempt-history-row" key={attempt.id}>
                <span>{attempt.game}</span>
                <b>
                  {attempt.result === "skipped"
                    ? t("labels.skipped")
                    : attempt.score + "%"}
                </b>
                <small>
                  {new Date(attempt.createdAt).toLocaleString(i18n.language)}
                </small>
              </div>
            ))}
          {!attempts.some((attempt) => attempt.itemId === item.id) && (
            <p className="muted-note">{t("demoVocabulary.noAttempts")}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function VocabularyPage() {
  const { t, i18n } = useTranslation();
  const { items, updateItem, mode } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [pair, setPair] = useState("");
  const [bulkTags, setBulkTags] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const visible = useMemo(
    () =>
      items
        .filter((item) => {
          if (
            !`${item.source} ${item.translation} ${item.tags.join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (tag && !item.tags.includes(tag)) ||
            (pair &&
              item.sourceLanguage + " → " + item.translationLanguage !== pair)
          )
            return false;
          if (filter === "DELETED") return !!item.deletedAt;
          if (item.deletedAt) return false;
          if (filter === "ARCHIVED") return item.userStatus === "ARCHIVED";
          if (item.userStatus === "ARCHIVED") return false;
          if (filter === "ALL") return true;
          if (filter === "DUE") return isDue(item);
          if (filter === "HARD") return item.hard;
          if (filter === "HIGH") return item.priority === "HIGH";
          if (filter === "PAUSED") return item.userStatus === "PAUSED";
          return item.status === filter;
        })
        .sort((a, b) =>
          sort === "alphabetical"
            ? a.source.localeCompare(b.source)
            : sort === "weakest"
              ? a.mastery - b.mastery
              : sort === "strongest"
                ? b.mastery - a.mastery
                : sort === "due"
                  ? +new Date(a.dueAt) - +new Date(b.dueAt)
                  : sort === "practiced"
                    ? b.attempts - a.attempts
                    : +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
    [items, filter, search, sort, tag, pair],
  );
  const visibleSelection = selected.filter((id) =>
    visible.some((item) => item.id === id),
  );
  const allSelected =
    visible.length > 0 && visibleSelection.length === visible.length;
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const bulkUpdate = (patch: Partial<LearningItem>) => {
    visibleSelection.forEach((id) => updateItem(id, patch));
    setSelected([]);
  };
  const practice = (values: LearningItem[]) => {
    const active = values.filter(
      (item) => !item.deletedAt && item.userStatus === "ACTIVE",
    );
    navigate(
      "/learn/session/smart?items=" +
        encodeURIComponent(active.map((item) => item.id).join(",")),
    );
  };
  const detail = items.find((item) => item.id === detailId);
  const editing = items.find((item) => item.id === editId);
  const tags = [...new Set(items.flatMap((item) => item.tags))];
  const pairs = [
    ...new Set(
      items.map(
        (item) => item.sourceLanguage + " → " + item.translationLanguage,
      ),
    ),
  ];
  if (mode !== "demo")
    return (
      <CapabilityNotice
        title={t("demoVocabulary.capabilityTitle")}
        milestone={t("demoVocabulary.capabilityMilestone")}
      />
    );
  return (
    <div className="vocabulary-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("demoVocabulary.eyebrow")}</p>
          <h1>{t("vocabulary.title")}</h1>
          <p>
            {
              items.filter(
                (item) => !item.deletedAt && item.userStatus !== "ARCHIVED",
              ).length
            }{" "}
            {t("demoVocabulary.wordsAndPhrases")}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setEditId(undefined);
            setAddOpen(true);
          }}
        >
          <Plus size={18} />
          {t("vocabulary.newWord")}
        </button>
      </section>
      <section className="library-toolbar">
        <div className="search-box">
          <Search size={19} />
          <input
            ref={searchRef}
            aria-label={t("demoVocabulary.searchAria")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("demoVocabulary.searchPlaceholder")}
          />
          <kbd>Ctrl K</kbd>
        </div>
        <div className="sort-box">
          <SlidersHorizontal size={17} />
          <span>{t("vocabulary.sort")}:</span>
          <select
            aria-label={t("demoVocabulary.sortAria")}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">{t("vocabulary.sortOptions.recent")}</option>
            <option value="weakest">{t("demoVocabulary.sort.weakest")}</option>
            <option value="strongest">
              {t("demoVocabulary.sort.strongest")}
            </option>
            <option value="alphabetical">
              {t("vocabulary.sortOptions.alphabetical")}
            </option>
            <option value="due">{t("demoVocabulary.sort.due")}</option>
            <option value="practiced">
              {t("demoVocabulary.sort.practiced")}
            </option>
          </select>
          <ChevronDown size={15} />
        </div>
      </section>
      <div className="filter-row">
        <Filter size={17} />
        {filters.map((option) => (
          <button
            aria-pressed={filter === option}
            key={option}
            onClick={() => {
              setFilter(option);
              setSelected([]);
            }}
            className={filter === option ? "active" : ""}
          >
            {t(`demoVocabulary.filters.${option}`)}
            {option === "DUE" && <span>{items.filter(isDue).length}</span>}
          </button>
        ))}
      </div>
      <div className="library-secondary-filters">
        <label>
          {t("vocabulary.tag")}{" "}
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">{t("vocabulary.allTags")}</option>
            {tags.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          {t("demoVocabulary.languages")}{" "}
          <select
            value={pair}
            onChange={(event) => setPair(event.target.value)}
          >
            <option value="">{t("demoVocabulary.allLanguages")}</option>
            {pairs.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {visibleSelection.length > 0 && (
        <div className="bulk-bar">
          <b>
            {t("demoVocabulary.selected", { count: visibleSelection.length })}
          </b>
          <button
            onClick={() =>
              practice(
                visible.filter((item) => visibleSelection.includes(item.id)),
              )
            }
          >
            <Play size={16} />
            {t("demoVocabulary.practice")}
          </button>
          <button
            onClick={() =>
              bulkUpdate({
                userStatus: filter === "PAUSED" ? "ACTIVE" : "PAUSED",
              })
            }
          >
            <Pause size={16} />
            {filter === "PAUSED"
              ? t("demoVocabulary.resume")
              : t("vocabulary.actions.pause")}
          </button>
          <button onClick={() => bulkUpdate({ priority: "HIGH" })}>
            <Flag size={16} />
            {t("demoVocabulary.priority")}
          </button>
          <button
            onClick={() =>
              bulkUpdate({
                userStatus: filter === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
              })
            }
          >
            <Archive size={16} />
            {filter === "ARCHIVED"
              ? t("vocabulary.actions.restore")
              : t("labels.archived")}
          </button>
          <button onClick={() => setBulkTags("")}>
            <Tag size={16} />
            {t("vocabulary.manageTags")}
          </button>
          {filter === "DELETED" && (
            <button onClick={() => bulkUpdate({ deletedAt: null })}>
              {t("vocabulary.actions.restore")}
            </button>
          )}
          <button
            className="icon-button"
            aria-label={t("demoVocabulary.clearSelection")}
            onClick={() => setSelected([])}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <section className="word-table-wrap">
        <table className="word-table">
          <caption className="sr-only">
            {t("demoVocabulary.filteredVocabulary")}
          </caption>
          <thead>
            <tr>
              <th>
                <button
                  aria-label={t("demoVocabulary.selectAllDisplayed")}
                  aria-pressed={allSelected}
                  className={cn("checkbox", allSelected && "checked")}
                  onClick={() =>
                    setSelected(
                      allSelected ? [] : visible.map((item) => item.id),
                    )
                  }
                >
                  {allSelected && <Check size={13} />}
                </button>
              </th>
              <th>{t("demoVocabulary.wordMeaning")}</th>
              <th>{t("demoVocabulary.status")}</th>
              <th>{t("demoVocabulary.mastery")}</th>
              <th>{t("demoVocabulary.weakSkill")}</th>
              <th>{t("demoVocabulary.review")}</th>
              <th>{t("vocabulary.manageTags")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const weak = Object.entries(item.skills).sort(
                (a, b) => a[1] - b[1],
              )[0];
              return (
                <tr key={item.id} onClick={() => setDetailId(item.id)}>
                  <td onClick={(event) => event.stopPropagation()}>
                    <button
                      aria-label={t("vocabulary.selectWord", {
                        word: item.source,
                      })}
                      aria-pressed={selected.includes(item.id)}
                      className={cn(
                        "checkbox",
                        selected.includes(item.id) && "checked",
                      )}
                      onClick={() => toggle(item.id)}
                    >
                      {selected.includes(item.id) && <Check size={13} />}
                    </button>
                  </td>
                  <td>
                    <div className="table-word">
                      <button
                        aria-label={t("demoVocabulary.playNamedWord", {
                          word: item.source,
                        })}
                        onClick={(event) => {
                          event.stopPropagation();
                          speak(item.source, item.sourceLanguage);
                        }}
                      >
                        <Volume2 size={16} />
                      </button>
                      <div>
                        <button
                          className="table-word-link"
                          onClick={() => setDetailId(item.id)}
                          dir="auto"
                        >
                          {item.source}
                          {item.priority === "HIGH" && " ⚑"}
                        </button>
                        <small dir="auto">{item.translation}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-chip"
                      data-status={
                        item.userStatus === "PAUSED" ? "PAUSED" : item.status
                      }
                    >
                      {item.deletedAt
                        ? t("labels.deleted")
                        : item.userStatus === "ARCHIVED"
                          ? t("labels.archived")
                          : item.userStatus === "PAUSED"
                            ? t("labels.paused")
                            : statusLabels[item.status]}
                    </span>
                  </td>
                  <td>
                    <div className="table-mastery">
                      <span>
                        <i style={{ width: item.mastery + "%" }} />
                      </span>
                      <b>{item.mastery}%</b>
                    </div>
                  </td>
                  <td>
                    <span className="weak-skill">
                      {skillLabels[weak[0] as SkillKey]}{" "}
                      <small>{weak[1]}%</small>
                    </span>
                  </td>
                  <td>
                    <span className={cn("due-label", isDue(item) && "now")}>
                      {item.userStatus !== "ACTIVE" || item.deletedAt
                        ? "—"
                        : isDue(item)
                          ? t("demoVocabulary.today")
                          : new Date(item.dueAt).toLocaleDateString(
                              i18n.language,
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                    </span>
                  </td>
                  <td>
                    <div className="table-tags">
                      {item.tags.slice(0, 2).map((value) => (
                        <span key={value}>{value}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={t("demoVocabulary.editNamedWord", {
                        word: item.source,
                      })}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditId(item.id);
                        setAddOpen(true);
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="empty-library">
            <Search size={30} />
            <h3>{t("demoVocabulary.emptyTitle")}</h3>
            <p>{t("demoVocabulary.emptyDescription")}</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch("");
                setFilter("ALL");
                setPair("");
                setTag("");
              }}
            >
              {t("demoVocabulary.clearFilters")}
            </button>
          </div>
        )}
      </section>
      <div className="table-footer">
        <span>{t("demoVocabulary.footer", { count: visible.length })}</span>
        <button
          className="button secondary"
          disabled={
            !visible.some(
              (item) => !item.deletedAt && item.userStatus === "ACTIVE",
            )
          }
          onClick={() => practice(visible)}
        >
          {t("demoVocabulary.practiceFiltered")} <ArrowLeft size={17} />
        </button>
      </div>
      <AddWordModal
        open={addOpen}
        item={editing}
        onClose={() => setAddOpen(false)}
      />
      {detail && !addOpen && (
        <WordDetail
          key={detail.id}
          item={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditId(detail.id);
            setAddOpen(true);
          }}
        />
      )}
      <Modal
        open={bulkTags !== null}
        onClose={() => setBulkTags(null)}
        title={t("demoVocabulary.addTagsToSelection")}
      >
        <form
          className="modal-body form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            visible
              .filter((item) => visibleSelection.includes(item.id))
              .forEach((item) =>
                updateItem(item.id, {
                  tags: [
                    ...new Set([
                      ...item.tags,
                      ...(bulkTags || "")
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    ]),
                  ],
                }),
              );
            setBulkTags(null);
            setSelected([]);
          }}
        >
          <label className="field">
            <span>{t("demoAdd.commaSeparated")}</span>
            <input
              value={bulkTags || ""}
              onChange={(event) => setBulkTags(event.target.value)}
            />
          </label>
          <button className="button primary">
            {t("demoVocabulary.addTags")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
