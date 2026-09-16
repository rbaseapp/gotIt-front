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

type FilterKey =
  | "ALL"
  | LearningStatus
  | "DUE"
  | "HARD"
  | "HIGH"
  | "PAUSED"
  | "ARCHIVED"
  | "DELETED";
const filters: Array<{ id: FilterKey; label: string }> = [
  { id: "ALL", label: "הכול" },
  { id: "NEW", label: "חדשות" },
  { id: "LEARNING", label: "בלמידה" },
  { id: "REVIEWING", label: "בחזרה" },
  { id: "MASTERED", label: "נלמדו" },
  { id: "DUE", label: "לחזרה היום" },
  { id: "HARD", label: "קשות" },
  { id: "HIGH", label: "עדיפות גבוהה" },
  { id: "PAUSED", label: "מושהות" },
  { id: "ARCHIVED", label: "ארכיון" },
  { id: "DELETED", label: "נמחקו" },
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
  const { updateItem, deleteItem, attempts } = useApp();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Modal open onClose={onClose} title="פרטי מילה" size="lg">
      <div className="word-detail">
        <div className="word-detail-hero">
          <button
            className="sound-orb-small"
            aria-label="השמעת מילה"
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
          <p className="muted-note">
            מצב הלמידה נקבע ידנית. ציון המיומנויות לא הומצא ולא שונה.
          </p>
        )}
        <div className="detail-section">
          <span>ההקשר שבו נשמרה</span>
          <blockquote dir="auto">
            “{item.context || "לא נשמר משפט מקור"}”
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
            <span>דוגמאות נוספות</span>
            {item.examples.map((example) => (
              <blockquote dir="auto" key={example}>
                {example}
              </blockquote>
            ))}
          </div>
        ) : null}
        <div className="detail-section">
          <span>מיומנויות · ציוני דוגמה עד חיבור B4</span>
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
          <span>תגיות</span>
          <div className="tag-list">
            {item.tags.length ? (
              item.tags.map((tag) => (
                <span key={tag}>
                  <Tag size={13} />
                  {tag}
                </span>
              ))
            ) : (
              <small>אין תגיות</small>
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
            לתרגל מילה זו
          </button>
          <button className="button secondary" onClick={onEdit}>
            <Pencil size={17} />
            עריכה
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
            {item.userStatus === "ACTIVE" ? "השהיה" : "החזרה ללמידה"}
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
            {item.status === "MASTERED" ? "חזרה ללמידה" : "סימון כנלמד"}
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
            {item.priority === "HIGH" ? "עדיפות רגילה" : "עדיפות גבוהה"}
          </button>
          <button
            className="button secondary"
            onClick={() => updateItem(item.id, { hard: !item.hard })}
          >
            {item.hard ? "ביטול סימון קשה" : "סימון כקשה"}
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
            {item.userStatus === "ARCHIVED" ? "הוצאה מארכיון" : "ארכיון"}
          </button>
          <button
            className="button icon-danger"
            aria-label={item.deletedAt ? "שחזור מילה" : "מחיקת מילה"}
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
            <p>המילה תוסתר, אך ההיסטוריה תישמר ואפשר יהיה לשחזר אותה.</p>
            <button
              className="button secondary"
              onClick={() => setConfirmDelete(false)}
            >
              ביטול
            </button>
            <button
              className="button primary"
              onClick={() => {
                deleteItem(item.id);
                onClose();
              }}
            >
              מחיקה רכה
            </button>
          </div>
        )}
        <div className="detail-section">
          <span>ניסיונות אחרונים</span>
          {attempts
            .filter((attempt) => attempt.itemId === item.id)
            .slice(-5)
            .reverse()
            .map((attempt) => (
              <div className="attempt-history-row" key={attempt.id}>
                <span>{attempt.game}</span>
                <b>
                  {attempt.result === "skipped" ? "דילוג" : attempt.score + "%"}
                </b>
                <small>
                  {new Date(attempt.createdAt).toLocaleString("he-IL")}
                </small>
              </div>
            ))}
          {!attempts.some((attempt) => attempt.itemId === item.id) && (
            <p className="muted-note">לא נשמרו ניסיונות חדשים בדמו.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function VocabularyPage() {
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
        title="אוצר המילים שלך"
        milestone="B2/B7: אוצר מילים, הקשרים ותגיות"
      />
    );
  return (
    <div className="vocabulary-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">הספרייה האישית שלך · דמו</p>
          <h1>אוצר המילים</h1>
          <p>
            {
              items.filter(
                (item) => !item.deletedAt && item.userStatus !== "ARCHIVED",
              ).length
            }{" "}
            מילים וביטויים
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
          מילה חדשה
        </button>
      </section>
      <section className="library-toolbar">
        <div className="search-box">
          <Search size={19} />
          <input
            ref={searchRef}
            aria-label="חיפוש באוצר המילים"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש מילה, תרגום או תגית..."
          />
          <kbd>Ctrl K</kbd>
        </div>
        <div className="sort-box">
          <SlidersHorizontal size={17} />
          <span>מיון:</span>
          <select
            aria-label="מיון מילים"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">נוספו לאחרונה</option>
            <option value="weakest">החלשות ביותר</option>
            <option value="strongest">החזקות ביותר</option>
            <option value="alphabetical">לפי א׳–ב׳</option>
            <option value="due">החזרה הקרובה</option>
            <option value="practiced">הכי מתורגלות</option>
          </select>
          <ChevronDown size={15} />
        </div>
      </section>
      <div className="filter-row">
        <Filter size={17} />
        {filters.map((option) => (
          <button
            aria-pressed={filter === option.id}
            key={option.id}
            onClick={() => {
              setFilter(option.id);
              setSelected([]);
            }}
            className={filter === option.id ? "active" : ""}
          >
            {option.label}
            {option.id === "DUE" && <span>{items.filter(isDue).length}</span>}
          </button>
        ))}
      </div>
      <div className="library-secondary-filters">
        <label>
          תגית{" "}
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">כל התגיות</option>
            {tags.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          שפות{" "}
          <select
            value={pair}
            onChange={(event) => setPair(event.target.value)}
          >
            <option value="">כל השפות</option>
            {pairs.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {visibleSelection.length > 0 && (
        <div className="bulk-bar">
          <b>{visibleSelection.length} נבחרו</b>
          <button
            onClick={() =>
              practice(
                visible.filter((item) => visibleSelection.includes(item.id)),
              )
            }
          >
            <Play size={16} />
            תרגול
          </button>
          <button
            onClick={() =>
              bulkUpdate({
                userStatus: filter === "PAUSED" ? "ACTIVE" : "PAUSED",
              })
            }
          >
            <Pause size={16} />
            {filter === "PAUSED" ? "חידוש" : "השהיה"}
          </button>
          <button onClick={() => bulkUpdate({ priority: "HIGH" })}>
            <Flag size={16} />
            עדיפות
          </button>
          <button
            onClick={() =>
              bulkUpdate({
                userStatus: filter === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
              })
            }
          >
            <Archive size={16} />
            {filter === "ARCHIVED" ? "שחזור" : "ארכיון"}
          </button>
          <button onClick={() => setBulkTags("")}>
            <Tag size={16} />
            תגיות
          </button>
          {filter === "DELETED" && (
            <button onClick={() => bulkUpdate({ deletedAt: null })}>
              שחזור
            </button>
          )}
          <button
            className="icon-button"
            aria-label="ביטול בחירה"
            onClick={() => setSelected([])}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <section className="word-table-wrap">
        <table className="word-table">
          <caption className="sr-only">אוצר המילים המסונן</caption>
          <thead>
            <tr>
              <th>
                <button
                  aria-label="בחירת כל המילים המוצגות"
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
              <th>מילה ומשמעות</th>
              <th>מצב</th>
              <th>שליטה</th>
              <th>מיומנות חלשה</th>
              <th>לחזרה</th>
              <th>תגיות</th>
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
                      aria-label={"בחירת " + item.source}
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
                        aria-label={"השמעת " + item.source}
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
                        ? "נמחקה"
                        : item.userStatus === "ARCHIVED"
                          ? "ארכיון"
                          : item.userStatus === "PAUSED"
                            ? "מושהה"
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
                          ? "היום"
                          : new Date(item.dueAt).toLocaleDateString("he-IL", {
                              day: "numeric",
                              month: "short",
                            })}
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
                      aria-label={"עריכת " + item.source}
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
            <h3>לא מצאנו מילים מתאימות</h3>
            <p>נסו חיפוש אחר או שנו את המסנן.</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch("");
                setFilter("ALL");
                setPair("");
                setTag("");
              }}
            >
              ניקוי מסננים
            </button>
          </div>
        )}
      </section>
      <div className="table-footer">
        <span>
          מציג {visible.length} מילים · שליטה ותאריכי חזרה הם נתוני דוגמה
        </span>
        <button
          className="button secondary"
          disabled={
            !visible.some(
              (item) => !item.deletedAt && item.userStatus === "ACTIVE",
            )
          }
          onClick={() => practice(visible)}
        >
          תרגול המילים המסוננות <ArrowLeft size={17} />
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
        title="הוספת תגיות לבחירה"
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
            <span>תגיות מופרדות בפסיק</span>
            <input
              value={bulkTags || ""}
              onChange={(event) => setBulkTags(event.target.value)}
            />
          </label>
          <button className="button primary">הוספת תגיות</button>
        </form>
      </Modal>
    </div>
  );
}
