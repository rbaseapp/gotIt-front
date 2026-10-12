import { LearningStatusBar } from "../components/LearningStatusBar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Filter,
  GraduationCap,
  Grid2X2,
  List,
  Play,
  Plus,
  RotateCw,
  Search,
  Shuffle,
  Volume2,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useFeedback } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import { LiveCaptureModal } from "../components/LiveCaptureModal";
import { LiveWordDetail, TagManager } from "./LiveVocabularyPage";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { useResource } from "../lib/useResource";
import {
  dashboardSchema,
  errorMessage,
  page,
  product,
  query,
  tagSchema,
  uuid,
  wordPacksSchema,
} from "../lib/product";
import { libraryReturn, readLibraryContext } from "../lib/libraryContext";
import {
  memorySegments,
  reviewDay,
  shortPartOfSpeech,
  sourceHost,
  sourceLink,
  wordCardSchema,
  type WordCard,
} from "../lib/myWords";
import { speak } from "../lib/utils";
import moohi from "../assets/mywords/moohi.png";
import wave from "../assets/mywords/card-wave.svg";
import "../dashboard-design.css";
import "../mywords-design.css";

const listSchema = page(wordCardSchema).extend({
  summary: z.object({
    total: z.number(),
    new: z.number(),
    mastered: z.number(),
    due: z.number(),
    tags: z.record(z.string(), z.number()),
    topics: z.record(z.string(), z.number()),
  }),
});
const receipt = z.object({ ids: z.array(uuid), action: z.string() });
const origins = ["chrome_extension", "web_manual", "program"];
const statuses = ["new", "learning", "reviewing", "mastered"];
const parts = ["noun,n", "verb,v", "adjective,adj", "adverb,adv"];

function Strength({ score }: { score: number }) {
  const { t } = useTranslation();
  const segments = memorySegments(score);
  return (
    <span
      className={`str s${segments}`}
      role="img"
      aria-label={t("myWords.memory", { count: segments })}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
function ContextSentence({ text, word }: { text: string; word: string }) {
  const start = text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  return (
    <p className="ctx en" dir="auto">
      {start < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, start)}
          <mark>{text.slice(start, start + word.length)}</mark>
          {text.slice(start + word.length)}
        </>
      )}
    </p>
  );
}

export function DevMyWordsPage() {
  const { t } = useTranslation();
  const { profile } = useApp();
  const { hasEntitlement } = useSubscription();
  const { confirm, toast } = useFeedback();
  const canWrite = hasEntitlement("vocabulary.write");
  const language = useLearningLanguage();
  const [params, setParams] = useSearchParams();
  const [restored] = useState(() => readLibraryContext(params));
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    ...restored.filters,
    sort: params.has("library.sort") ? restored.filters.sort : "recent",
  }));
  const [search, setSearch] = useState(filters.search || "");
  const [pageNumber, setPageNumber] = useState(restored.page);
  const previousFilters = useRef(filters);
  useEffect(() => {
    if (previousFilters.current !== filters) {
      previousFilters.current = filters;
      setPageNumber(1);
    }
  }, [filters]);
  const [selected, setSelected] = useState<string[]>(restored.selected);
  const [view, setView] = useState("grid");
  const [advanced, setAdvanced] = useState(false);
  const [add, setAdd] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tagCursor, setTagCursor] = useState<string>();
  const restoredLanguage = useRef(false);
  useEffect(() => {
    if (restoredLanguage.current || language.loading) return;
    restoredLanguage.current = true;
    if (
      restored.language &&
      language.languages.some((l) => l.code === restored.language)
    )
      language.setCode(restored.language);
  }, [language, restored.language]);
  const change = useCallback((key: string, value: string) => {
    setFilters((f) => (f[key] === value ? f : { ...f, [key]: value }));
    setSelected([]);
  }, []);
  useEffect(() => {
    if ((filters.search || "") === search.trim()) return;
    const timer = window.setTimeout(() => change("search", search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search, change, filters.search]);
  const key = `learning-items${query({ ...filters, sourceLanguageCode: language.code || undefined, view: "cards", limit: "9", page: String(pageNumber) })}`;
  const library = useResource(
    useCallback(
      async () => ({ ...(await product(listSchema, key)), key }),
      [key],
    ),
  );
  const dashboard = useResource(
    useCallback(
      () =>
        product(
          dashboardSchema,
          `dashboard${query({ sourceLanguageCode: language.code || undefined })}`,
        ),
      [language.code],
    ),
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
    useCallback(
      () =>
        product(
          wordPacksSchema,
          `word-packs${query({ sourceLanguageCode: language.code || undefined, translationLanguageCode: profile.defaultTranslationLanguage || undefined })}`,
        ),
      [language.code, profile.defaultTranslationLanguage],
    ),
  );
  const [extra, setExtra] = useState<{
    key: string;
    items: WordCard[];
    page: number;
  }>({ key: "", items: [], page: restored.page });
  const [moreBusy, setMoreBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setMoreBusy(false);
  }, [key]);
  const data = library.data?.key === key ? library.data : undefined;
  const extraItems = extra.key === key ? extra.items : [];
  const words = [...(data?.items || []), ...extraItems];
  const currentPage = extra.key === key ? extra.page : pageNumber;
  const returnTo = encodeURIComponent(
    libraryReturn(filters, currentPage, selected, language.code),
  );
  const practiceLink = (ids: string[] = []) =>
    `/learn/smart?language=${encodeURIComponent(language.code)}&return=${returnTo}${ids.length ? `&items=${ids.join(",")}` : ""}`;
  const open = words.find((w) => w.id === params.get("item"));
  const close = () => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("item");
      return next;
    });
    setEdit(false);
    setTagEditing(false);
  };
  const openWord = (word: WordCard) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("item", word.id);
      return next;
    });
  };
  const libraryReload = library.reload,
    dashboardReload = dashboard.reload,
    languageReload = language.reload;
  const refresh = useCallback(() => {
    generation.current++;
    setExtra({ key: "", items: [], page: pageNumber });
    setMoreBusy(false);
    void libraryReload();
    void dashboardReload();
    void languageReload();
  }, [libraryReload, dashboardReload, languageReload, pageNumber]);
  useEffect(() => {
    window.addEventListener("gotit:library-changed", refresh);
    return () => window.removeEventListener("gotit:library-changed", refresh);
  }, [refresh]);
  const more = async () => {
    if (moreBusy || !data) return;
    const requestGeneration = generation.current;
    setMoreBusy(true);
    setError("");
    try {
      const next = await product(
        listSchema,
        `learning-items${query({ ...filters, sourceLanguageCode: language.code, view: "cards", limit: "9", page: String(currentPage + 1) })}`,
      );
      if (generation.current === requestGeneration)
        setExtra({
          key,
          items: [...extraItems, ...next.items],
          page: currentPage + 1,
        });
    } catch (reason) {
      if (generation.current === requestGeneration)
        setError(errorMessage(reason));
    } finally {
      if (generation.current === requestGeneration) setMoreBusy(false);
    }
  };
  const apply = async (action: string, ids = selected) => {
    if (!canWrite || busy || !ids.length) return;
    if (
      ["delete", "mark_mastered"].includes(action) &&
      !(await confirm({
        title: t("vocabulary.confirmBulk", {
          action: t(`vocabulary.actions.${action}`),
          count: ids.length,
        }),
        message: t(
          action === "delete"
            ? "vocabulary.deleteDescription"
            : "vocabulary.manualMasteryDescription",
        ),
        confirmLabel: t(`vocabulary.actions.${action}`),
        tone: "warning",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await product(receipt, "learning-items/bulk", "POST", { ids, action });
      setSelected([]);
      if (action === "delete") close();
      refresh();
      toast(t("vocabulary.changeSaved"), { tone: "success" });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 100
          ? [...s, id]
          : s,
    );
  const multi = (filter: string, value: string) => {
    const current = new Set((filters[filter] || "").split(",").filter(Boolean));
    const values = value.split(",");
    const chosen = values.every((v) => current.has(v));
    for (const v of values) {
      if (chosen) current.delete(v);
      else current.add(v);
    }
    change(filter, [...current].join(","));
  };
  const nextReview = (word: WordCard) => {
    const days = reviewDay(word.nextReviewAt, profile.timezone || "UTC");
    return days === null
      ? t("game.notScheduled")
      : days === 0
        ? t("myWords.today")
        : days === 1
          ? t("myWords.tomorrow")
          : t("myWords.inDays", { count: days });
  };
  const source = (word: WordCard) =>
    sourceHost(word.source?.pageUrl) ||
    word.program?.title ||
    (word.source
      ? t(`myWords.origin.${word.source.sourceType}`, {
          defaultValue: t("myWords.origin.other"),
        })
      : "");
  const say = (word: WordCard) => {
    if (!speak(word.sourceText, word.sourceLanguageCode))
      toast(t("myWords.audioUnavailable"), { tone: "info" });
  };
  const clear = () => {
    setSearch("");
    setFilters({ userStatus: "all", sort: "recent" });
    setSelected([]);
  };
  const topics = new Map<
    string,
    { id: string; title: string; ids: string[]; count: number }
  >();
  for (const pack of packs.data?.packs || []) {
    if (!pack.installed || pack.track.sourceLanguageCode !== language.code)
      continue;
    const topic = topics.get(pack.topic.id) || {
      id: pack.topic.id,
      title: pack.topic.title,
      ids: [],
      count: 0,
    };
    topic.ids.push(pack.id);
    topic.count += pack.progress.linked;
    topics.set(topic.id, topic);
  }
  const activeFilters = [
    filters.origins,
    filters.partsOfSpeech,
    filters.learningStatuses,
    filters.due,
    filters.highPriority,
    filters.translationLanguageCode,
    filters.userStatus !== "all" ? filters.userStatus : "",
  ].filter(Boolean).length;
  const count = data?.summary;
  const goal = dashboard.data?.dailyGoal;
  return (
    <div className="mw">
      <LearningStatusBar
        goal={goal}
        streakDays={dashboard.data?.gamification.currentStreakDays}
        language={{
          value: language.code,
          options: language.languages.map((l) => l.code),
          translationCode: profile.defaultTranslationLanguage || "he",
          onChange: (code) => {
            language.setCode(code);
            setPageNumber(1);
            setSelected([]);
            setFilters((f) => ({ ...f, packIds: "" }));
          },
        }}
      />
      <div className="wrap mw-main">
        <section className="hero" aria-labelledby="mw-h">
          <div className="ttl">
            <h1 id="mw-h">{t("myWords.title")}</h1>
            {count && (
              <p>
                <span>
                  <b>{count.total}</b> {t("myWords.words")}
                </span>
                <span className="sep" aria-hidden="true">
                  •
                </span>
                <span>
                  <b>{count.mastered}</b> {t("myWords.learned")}
                </span>
                <span className="sep" aria-hidden="true">
                  •
                </span>
                <span>
                  <b>{count.due}</b> {t("myWords.ready")}
                </span>
              </p>
            )}
          </div>
          <div className="hact">
            <div className="hcol">
              <div className="bub">
                {count
                  ? t("myWords.bubble", { count: count.due })
                  : t("myWords.welcome")}
              </div>
              <div className="hbtns">
                <Link className="bsec" to="/word-packs">
                  <Grid2X2 size={24} />
                  {t("myWords.learnMore")}
                </Link>
                <Link className="bprim" to={practiceLink()}>
                  {t("myWords.start")}
                  <Play size={22} fill="currentColor" />
                </Link>
              </div>
            </div>
            <Link
              className="mochi"
              aria-label={t("myWords.mascot")}
              to={practiceLink()}
            >
              <img src={moohi} alt="" />
            </Link>
          </div>
        </section>
        <RemoteState
          loading={language.loading}
          error={language.error || dashboard.error}
          retry={() => {
            void language.reload();
            void dashboard.reload();
          }}
        />
        <div className="tools">
          <label className="srch">
            <Search size={24} />
            <input
              type="search"
              maxLength={500}
              dir="auto"
              aria-label={t("vocabulary.search")}
              placeholder={t("myWords.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className={`tbtn ${filters.difficult === "true" ? "on" : ""}`}
            aria-pressed={filters.difficult === "true"}
            onClick={() =>
              change("difficult", filters.difficult === "true" ? "" : "true")
            }
          >
            <Shuffle size={22} />
            {t("myWords.challenge")}
          </button>
          <button
            className={`tbtn ${advanced ? "on" : ""}`}
            aria-expanded={advanced}
            aria-controls="mw-filters"
            onClick={() => setAdvanced((v) => !v)}
          >
            <Filter size={22} />
            {t("myWords.filters")}
            {activeFilters > 0 && <span className="cnt">{activeFilters}</span>}
            <ChevronDown size={18} />
          </button>
        </div>
        {advanced && (
          <div className="adv" id="mw-filters">
            {[
              { key: "origins", values: origins, title: "origins" },
              { key: "partsOfSpeech", values: parts, title: "parts" },
              { key: "learningStatuses", values: statuses, title: "status" },
            ].map((group) => (
              <div key={group.key}>
                <h3>{t(`myWords.${group.title}`)}</h3>
                <div className="opts">
                  {group.values.map((value) => (
                    <button
                      key={value}
                      className={`fo ${value.split(",").every((v) => (filters[group.key] || "").split(",").includes(v)) ? "on" : ""}`}
                      aria-pressed={value
                        .split(",")
                        .every((v) =>
                          (filters[group.key] || "").split(",").includes(v),
                        )}
                      onClick={() => multi(group.key, value)}
                    >
                      {t(`myWords.${group.title}Labels.${value.split(",")[0]}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <h3>{t("vocabulary.userStatus")}</h3>
              <select
                aria-label={t("vocabulary.userStatus")}
                value={filters.userStatus || "all"}
                onChange={(e) => change("userStatus", e.target.value)}
              >
                {["all", "active", "paused", "archived", "deleted"].map((s) => (
                  <option key={s} value={s}>
                    {t(
                      s === "all"
                        ? "vocabulary.allExceptDeleted"
                        : `labels.${s}`,
                    )}
                  </option>
                ))}
              </select>
            </div>
            <div className="opts">
              {["due", "highPriority"].map((value) => (
                <button
                  key={value}
                  className={`fo ${filters[value] === "true" ? "on" : ""}`}
                  aria-pressed={filters[value] === "true"}
                  onClick={() =>
                    change(value, filters[value] === "true" ? "" : "true")
                  }
                >
                  {t(`vocabulary.filters.${value}`)}
                </button>
              ))}
            </div>
            <div className="advf">
              <span>
                {t("myWords.activeFilters", { count: activeFilters })}
              </span>
              <button onClick={clear}>{t("vocabulary.clearFilters")}</button>
              <button onClick={() => setTagsOpen(true)}>
                {t("vocabulary.manageTags")}
              </button>
            </div>
          </div>
        )}
        <div className="cats" role="group" aria-label={t("myWords.categories")}>
          <button
            className={`cat ${!filters.packIds && !filters.tagId && !filters.learningStatus ? "on" : ""}`}
            aria-pressed={
              !filters.packIds && !filters.tagId && !filters.learningStatus
            }
            onClick={() => {
              setFilters((f) => ({
                ...f,
                packIds: "",
                tagId: "",
                learningStatus: "",
              }));
              setSelected([]);
            }}
          >
            {t("vocabulary.allWords")}
            {count && <i>{count.total}</i>}
          </button>
          <button
            className={`cat ${filters.learningStatus === "new" ? "on" : ""}`}
            aria-pressed={filters.learningStatus === "new"}
            onClick={() => {
              setFilters((f) => ({
                ...f,
                learningStatus: f.learningStatus === "new" ? "" : "new",
                packIds: "",
                tagId: "",
              }));
              setSelected([]);
            }}
          >
            <Bell size={24} className="mw-new-icon" fill="currentColor" />
            {t("myWords.new")}
            {count && <i>{count.new}</i>}
          </button>
          {[...topics.values()].map((topic) => (
            <button
              className={`cat ${filters.packIds === topic.ids.join(",") ? "on" : ""}`}
              key={topic.id}
              aria-pressed={filters.packIds === topic.ids.join(",")}
              onClick={() => {
                setFilters((f) => ({
                  ...f,
                  packIds:
                    f.packIds === topic.ids.join(",")
                      ? ""
                      : topic.ids.join(","),
                  tagId: "",
                  learningStatus: "",
                }));
                setSelected([]);
              }}
            >
              <GraduationCap size={24} />
              {topic.title}
              <i>{count?.topics[topic.id] ?? 0}</i>
            </button>
          ))}
          {tags.data?.tags.map((tag) => (
            <button
              className={`cat ${filters.tagId === tag.id ? "on" : ""}`}
              key={tag.id}
              aria-pressed={filters.tagId === tag.id}
              onClick={() => {
                setFilters((f) => ({
                  ...f,
                  tagId: f.tagId === tag.id ? "" : tag.id,
                  packIds: "",
                  learningStatus: "",
                }));
                setSelected([]);
              }}
            >
              <BookOpen size={24} />
              {tag.name}
              <i>{count?.tags[tag.id] ?? 0}</i>
            </button>
          ))}
          {tags.data?.nextCursor && (
            <button
              className="cat"
              onClick={() => setTagCursor(tags.data?.nextCursor || undefined)}
            >
              {t("vocabulary.moreTags")}
            </button>
          )}
        </div>
        <RemoteState
          loading={false}
          error={tags.error || packs.error}
          retry={() => {
            void tags.reload();
            void packs.reload();
          }}
        />
        <div className="resl">
          <span role="status">
            {t("myWords.showing", {
              shown: words.length,
              total: data?.totalCount ?? 0,
            })}
          </span>
          <div className="vctl">
            <label className="sortb">
              {t("vocabulary.sort")}
              <select
                value={filters.sort}
                aria-label={t("vocabulary.sort")}
                onChange={(e) => change("sort", e.target.value)}
              >
                {[
                  "recent",
                  "alphabetical",
                  "weakest",
                  "strongest",
                  "due_next",
                  "learning_status",
                  "most_practiced",
                ].map((s) => (
                  <option key={s} value={s}>
                    {t(`vocabulary.sortOptions.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`vb ${view === "list" ? "on" : ""}`}
              aria-label={t("myWords.list")}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={20} />
            </button>
            <button
              className={`vb ${view === "grid" ? "on" : ""}`}
              aria-label={t("myWords.grid")}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Grid2X2 size={20} fill="currentColor" />
            </button>
          </div>
        </div>
        <RemoteState
          loading={library.loading}
          error={library.error}
          retry={() => void library.reload()}
        />
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {!library.loading && (
          <div className={`wgrid ${view === "list" ? "list" : ""}`}>
            {words.map((word) => (
              <article
                className={`wcard ${selected.includes(word.id) ? "sel" : ""}`}
                key={word.id}
                aria-label={`${word.sourceText} · ${word.primaryTranslation || ""}`}
              >
                <img className="wave" src={wave} alt="" />
                <div className="top">
                  <button
                    className={`ck ${selected.includes(word.id) ? "on" : ""}`}
                    role="checkbox"
                    aria-checked={selected.includes(word.id)}
                    aria-label={t("vocabulary.selectWord", {
                      word: word.sourceText,
                    })}
                    onClick={() => toggle(word.id)}
                  >
                    <Check size={15} />
                  </button>
                  <span
                    className={`pill ${word.learningStatus === "new" ? "n" : word.learningStatus === "mastered" ? "d" : "l"}`}
                  >
                    {t(`myWords.statusLabels.${word.learningStatus}`)}
                  </span>
                  <button
                    className="spk"
                    aria-label={`${t("myWords.audio")} ${word.sourceText}`}
                    onClick={() => say(word)}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                <button className="mid" onClick={() => openWord(word)}>
                  <span className="wm" dir="auto">
                    {word.primaryTranslation || t("vocabulary.noMeaning")}
                  </span>
                  <span className="eng">
                    <span className="ww" dir="auto">
                      {word.sourceText}
                    </span>
                    {word.partOfSpeech && (
                      <span className="pos">
                        ({shortPartOfSpeech(word.partOfSpeech)})
                      </span>
                    )}
                    {word.phoneticText && (
                      <span className="pos" dir="auto">
                        {word.phoneticText}
                      </span>
                    )}
                    {source(word) && (
                      <span className="src" dir="auto">
                        {source(word)}
                      </span>
                    )}
                  </span>
                </button>
                <div className="bot">
                  <Strength score={word.overallMasteryScore} />
                  <span
                    className={`nx ${word.nextReviewAt && Date.parse(word.nextReviewAt) <= Date.now() ? "due" : ""}`}
                  >
                    {word.nextReviewAt &&
                    Date.parse(word.nextReviewAt) <= Date.now() ? (
                      <RotateCw size={20} />
                    ) : (
                      <CalendarDays size={19} />
                    )}{" "}
                    {nextReview(word)}
                  </span>
                </div>
                {word.userStatus !== "active" && (
                  <small>{t(`labels.${word.userStatus}`)}</small>
                )}
                {filters.userStatus === "deleted" && (
                  <button
                    className="fo"
                    disabled={!canWrite || busy}
                    onClick={() => void apply("restore", [word.id])}
                  >
                    {t("vocabulary.actions.restore")}
                  </button>
                )}
              </article>
            ))}
            {data && !words.length && (
              <div className="empty">
                <b>{t("myWords.empty")}</b>
                <span>{t("myWords.emptyHelp")}</span>
                <button className="fo" onClick={clear}>
                  {t("vocabulary.clearFilters")}
                </button>
                <button className="fo" onClick={() => setAdd(true)}>
                  {t("vocabulary.newWord")}
                </button>
              </div>
            )}
          </div>
        )}
        {data && currentPage < (data.pageCount || 1) && (
          <div className="more-w">
            <button disabled={moreBusy} onClick={() => void more()}>
              {t(moreBusy ? "common.loading" : "myWords.more")}
            </button>
          </div>
        )}
        <button className="mw-add-mobile" onClick={() => setAdd(true)}>
          <Plus size={18} />
          {t("vocabulary.newWord")}
        </button>
      </div>
      {selected.length > 0 && (
        <div className="bulk" role="toolbar" aria-label={t("myWords.bulk")}>
          <span className="bn">
            {t("myWords.selected", { count: selected.length })}
          </span>
          {filters.userStatus !== "deleted" && (
            <>
              <Link className="bp" to={practiceLink(selected)}>
                {t("myWords.practiceThem")}
              </Link>
              <Link
                to={`/learn?items=${selected.join(",")}&language=${encodeURIComponent(language.code)}&return=${returnTo}`}
              >
                {t("ux.chooseGame")}
              </Link>
              <button
                disabled={busy || !canWrite}
                onClick={() => void apply("mark_mastered")}
              >
                {t("vocabulary.actions.mark_mastered")}
              </button>
              <button
                className="bd"
                disabled={busy || !canWrite}
                onClick={() => void apply("delete")}
              >
                {t("vocabulary.actions.delete")}
              </button>
            </>
          )}
          {filters.userStatus === "deleted" && (
            <button
              disabled={busy || !canWrite}
              onClick={() => void apply("restore")}
            >
              {t("vocabulary.actions.restore")}
            </button>
          )}
          <button className="bx" onClick={() => setSelected([])}>
            {t("feedback.cancel")}
          </button>
        </div>
      )}
      <LiveCaptureModal open={add} onClose={() => setAdd(false)} />
      <Modal
        open={Boolean(open)}
        onClose={close}
        title={open?.sourceText || t("lessonUi.wordDetails")}
        className="mw mywords-drawer"
        hideCloseButton
      >
        {open && (
          <>
            <div className="dh">
              <span
                className={`pill ${open.learningStatus === "new" ? "n" : open.learningStatus === "mastered" ? "d" : "l"}`}
              >
                {t(`myWords.statusLabels.${open.learningStatus}`)}
              </span>
              <Strength score={open.overallMasteryScore} />
              <button
                className="x"
                aria-label={t("common.close")}
                onClick={close}
              >
                <X size={20} />
              </button>
            </div>
            <div className="db">
              <div className="dword">
                <span className="ww" dir="auto">
                  {open.sourceText}
                </span>
                {open.partOfSpeech && (
                  <span className="pos">
                    ({shortPartOfSpeech(open.partOfSpeech)})
                  </span>
                )}
                <button
                  className="spk"
                  aria-label={t("myWords.audio")}
                  onClick={() => say(open)}
                >
                  <Volume2 size={20} />
                </button>
              </div>
              <span className="dm" dir="auto">
                {open.primaryTranslation}
              </span>
              <div className="dsec">
                <h4>{t("myWords.encounter")}</h4>
                {open.source?.sentenceText || open.source?.paragraphText ? (
                  <ContextSentence
                    text={
                      open.source.sentenceText || open.source.paragraphText!
                    }
                    word={open.sourceText}
                  />
                ) : (
                  <p>{t("myWords.noContext")}</p>
                )}
                {sourceLink(open.source?.pageUrl) ? (
                  <a
                    className="ctxs"
                    href={sourceLink(open.source?.pageUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source(open)}
                  </a>
                ) : (
                  <span className="ctxs">{source(open)}</span>
                )}
              </div>
              <div className="dsec">
                <h4>{t("myWords.yourLearning")}</h4>
                <div className="lstats">
                  <div>
                    <b dir="ltr">
                      {open.answers.correct}/{open.answers.total}
                    </b>
                    <span>{t("myWords.correct")}</span>
                  </div>
                  <div>
                    <b>{nextReview(open)}</b>
                    <span>{t("myWords.next")}</span>
                  </div>
                  <div>
                    <b>
                      {open.tags.map((tag) => tag.name).join(", ") ||
                        open.program?.topic ||
                        t("myWords.uncategorized")}
                    </b>
                    <span>{t("myWords.category")}</span>
                  </div>
                </div>
              </div>
              {tagEditing && (
                <TagEditor
                  key={open.id}
                  word={open}
                  tags={tags.data?.tags || []}
                  onSaved={() => {
                    setTagEditing(false);
                    refresh();
                  }}
                />
              )}
              {edit && (
                <LiveWordDetail
                  id={open.id}
                  tags={tags.data?.tags || []}
                  onChanged={refresh}
                />
              )}
            </div>
            <div className="df">
              <Link className="p" to={practiceLink([open.id])}>
                {t("vocabulary.practiceWord")}
                <Play size={18} fill="currentColor" />
              </Link>
              <div className="row2">
                <button
                  disabled={!canWrite || busy}
                  onClick={() =>
                    void apply(
                      open.learningStatus === "mastered"
                        ? "return_to_learning"
                        : "mark_mastered",
                      [open.id],
                    )
                  }
                >
                  {t(
                    `vocabulary.actions.${open.learningStatus === "mastered" ? "return_to_learning" : "mark_mastered"}`,
                  )}
                </button>
                <button
                  disabled={!canWrite}
                  onClick={() => setTagEditing((v) => !v)}
                >
                  {t("myWords.move")}
                </button>
              </div>
              <button onClick={() => setEdit((v) => !v)}>
                {t("myWords.edit")}
              </button>
              <button
                className="del"
                disabled={!canWrite || busy}
                onClick={() => void apply("delete", [open.id])}
              >
                {t("vocabulary.actions.delete")}
              </button>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={Boolean(
          params.get("item") &&
          !open &&
          data &&
          uuid.safeParse(params.get("item")).success,
        )}
        onClose={close}
        title={t("lessonUi.wordDetails")}
      >
        {params.get("item") && (
          <LiveWordDetail
            id={params.get("item")!}
            tags={tags.data?.tags || []}
            onChanged={refresh}
          />
        )}
      </Modal>
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
function TagEditor({
  word,
  tags,
  onSaved,
}: {
  word: WordCard;
  tags: z.infer<typeof tagSchema>[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [ids, setIds] = useState(word.tags.map((tag) => tag.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await product(
        z.object({ id: uuid, tagIds: z.array(uuid) }),
        `learning-items/${word.id}/tags`,
        "PUT",
        { tagIds: ids },
      );
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="dsec">
      <h4>{t("myWords.move")}</h4>
      <div className="opts">
        {tags.map((tag) => (
          <button
            className={`fo ${ids.includes(tag.id) ? "on" : ""}`}
            aria-pressed={ids.includes(tag.id)}
            key={tag.id}
            disabled={busy}
            onClick={() =>
              setIds((s) =>
                s.includes(tag.id)
                  ? s.filter((id) => id !== tag.id)
                  : [...s, tag.id],
              )
            }
          >
            {tag.name}
          </button>
        ))}
      </div>
      {!tags.length && <p>{t("myWords.noCategories")}</p>}
      <button className="fo" disabled={busy} onClick={() => void save()}>
        {t("common.save")}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
