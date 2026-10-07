import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { practiceLink, learningReturn } from "../lib/learningNavigation";
import "../learn-restored.css";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Layers3,
  Mic2,
  Move,
  MousePointer2,
  PenLine,
  LockKeyhole,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import { CourseContinueCard } from "../components/CourseContinueCard";
import {
  capabilitiesSchema,
  page,
  product,
  query,
  queueSchema,
  sessionSchema,
  wordPacksSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "react-i18next";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { LearningLanguageSelect } from "../components/LearningLanguageSelect";
const games = [
  {
    id: "flashcards",
    icon: Layers3,
    tone: "mint",
  },
  {
    id: "recall",
    icon: PenLine,
    tone: "violet",
  },
  {
    id: "matching",
    icon: MousePointer2,
    tone: "orange",
  },
  {
    id: "drag_drop",
    icon: Move,
    tone: "violet",
  },
  {
    id: "listening",
    icon: Headphones,
    tone: "blue",
  },
  {
    id: "pronunciation",
    icon: Mic2,
    tone: "rose",
  },
];
const gameOrder = [
  "matching",
  "drag_drop",
  "flashcards",
  "pronunciation",
  "recall",
  "listening",
] as const;
const smartPath = [
  "matching",
  "drag_drop",
  "flashcards",
  "pronunciation",
  "recall",
  "listening",
] as const;
export function LiveLearnPage() {
  const { t, i18n } = useTranslation();
  const { status, loading, hasEntitlement } = useSubscription();
  const language = useLearningLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [scopeOpen, setScopeOpen] = useState(false);
  const code = params.get("language") || language.code;
  const scoped =
    params.has("items") || params.has("pack") || params.has("reading");
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const pack = packs.data?.packs.find((item) => item.id === params.get("pack"));
  const scopeLanguage = pack?.track.sourceLanguageCode ?? code;
  const scopeTitle =
    pack?.title ??
    (params.has("items")
      ? t("ux.selectedWords", { count: params.get("items")!.split(",").length })
      : t("ux.allWords"));
  const gameLink = (game: string) => {
    const link = practiceLink(game, params, scopeLanguage);
    return game === "smart"
      ? link.replace("/learn/smart", "/learn/session/smart")
      : link;
  };
  const selectScope = (packId?: string) => {
    const next = new URLSearchParams();
    if (params.has("return")) next.set("return", params.get("return")!);
    if (packId) next.set("pack", packId);
    else if (language.code) next.set("language", language.code);
    navigate(`/learn?${next}`);
    setScopeOpen(false);
  };
  const queue = useResource(
    useCallback(
      async () => ({
        ...(await product(
          queueSchema,
          `learning/queue?limit=10${code ? `&sourceLanguageCode=${encodeURIComponent(code)}` : ""}`,
        )),
        languageCode: code,
      }),
      [code],
    ),
  );
  const capabilities = useResource(
    useCallback(() => product(capabilitiesSchema, "capabilities"), []),
  );
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );
  const sessionsUrl = `practice/sessions${query({ limit: "10", cursor, sourceLanguageCode: code || undefined })}`;
  const sessions = useResource(
    useCallback(
      async () => ({
        ...(await product(page(sessionSchema), sessionsUrl)),
        languageCode: code,
      }),
      [sessionsUrl, code],
    ),
  );
  if (
    language.loading ||
    language.error ||
    (queue.data && queue.data.languageCode !== code) ||
    (sessions.data && sessions.data.languageCode !== code)
  )
    return (
      <RemoteState
        loading={
          language.loading ||
          Boolean(queue.data && queue.data.languageCode !== code) ||
          Boolean(sessions.data && sessions.data.languageCode !== code)
        }
        error={language.error}
        retry={() => void language.reload()}
      />
    );
  const skills = capabilities.data?.learningLanguages.find(
    (item) => item.languageCode === scopeLanguage,
  )?.enabledSkills;
  if (params.has("pack") && (packs.loading || packs.error || !pack?.installed))
    return (
      <RemoteState
        loading={packs.loading}
        error={packs.error || (!packs.loading ? t("game.invalidPack") : "")}
        retry={() => void packs.reload()}
      />
    );
  if (!loading && status && !hasEntitlement("practice.play"))
    return (
      <div className="learn-page live-page page-enter">
        <section className="live-panel locked-feature">
          <span className="locked-feature-icon">
            <LockKeyhole size={30} />
          </span>
          <p className="eyebrow">{t("learn.proFeature")}</p>
          <h1>{t("learn.lockedTitle")}</h1>
          <p>{t("learn.lockedDescription")}</p>
          <Link className="button primary" to="/billing">
            {t("subscription.upgrade")}
          </Link>
        </section>
      </div>
    );
  return (
    <div className="learn-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          {params.has("return") && (
            <Link
              className="button ghost"
              to={learningReturn(params.get("return"))}
            >
              {t("common.back")}
            </Link>
          )}
          <p className="eyebrow">{t("learn.eyebrow")}</p>
          <h1>{t("learn.title")}</h1>
          <p>{scoped ? scopeTitle : t("learn.description")}</p>
          {pack && <p>{t("unitStudy.scopeHelp")}</p>}
        </div>
      </section>
      {!scoped && (
        <LearningLanguageSelect
          code={code}
          languages={language.languages}
          onChange={(code) => {
            language.setCode(code);
            setCursor(undefined);
            setCursorHistory([]);
            const next = new URLSearchParams(params);
            next.set("language", code);
            navigate(`/learn?${next}`);
          }}
        />
      )}
      <RemoteState
        loading={capabilities.loading}
        error={capabilities.error}
        retry={() => void capabilities.reload()}
      />
      <section className="smart-session-card">
        <div className="smart-visual">
          <Brain size={48} />
        </div>
        <div className="smart-copy">
          <h2>{t("learn.smartTitle")}</h2>
          <p>{t("learn.smartDescription")}</p>
          {!scoped && (
            <RemoteState
              loading={queue.loading}
              error={queue.error}
              retry={() => void queue.reload()}
            />
          )}
          {!scoped && queue.data && (
            <p>
              {t("learn.queueSummary", {
                count: queue.data.items.length,
                algorithm: queue.data.algorithmVersion,
              })}
            </p>
          )}
          <div className="learning-path" aria-label={t("learn.learningPath")}>
            {smartPath.map((step, index) => (
              <span key={step}>
                <b>{index + 1}</b>
                {t(`learn.games.${step}.name`)}
              </span>
            ))}
          </div>
          <small className="learning-path-help">
            {t("learn.learningPathHelp")}
          </small>
        </div>
        {(scoped ||
          (queue.data?.languageCode === code &&
            queue.data.items.length > 0)) && (
          <Link className="button smart-start" to={gameLink("smart")}>
            {t("learn.startSession")}
          </Link>
        )}
      </section>
      {!scoped && <CourseContinueCard />}
      <div className="game-grid" role="region" aria-label={t("ux.chooseGame")}>
        {gameOrder
          .map((id) => games.find((game) => game.id === id)!)
          .map(({ icon: Icon, ...game }) => {
            const providerMode = ["listening", "pronunciation"].includes(
              game.id,
            );
            const available =
              Boolean(capabilities.data?.configured.practice) &&
              (!providerMode ||
                Boolean(capabilities.data?.configured.speech)) &&
              (!skills ||
                skills.includes(
                  game.id === "pronunciation"
                    ? "pronunciation"
                    : game.id === "listening"
                      ? "listening"
                      : game.id === "recall"
                        ? "recall"
                        : "recognition",
                ));
            return available ? (
              <Link className="game-card" to={gameLink(game.id)} key={game.id}>
                <span className={`game-icon ${game.tone}`}>
                  <Icon size={28} />
                </span>
                <span className="game-card-copy">
                  <b>{t(`learn.games.${game.id}.name`)}</b>
                  <small>{t(`learn.games.${game.id}.description`)}</small>
                </span>
              </Link>
            ) : (
              <div
                className="game-card disabled"
                aria-disabled="true"
                key={game.id}
              >
                <span className={`game-icon ${game.tone}`}>
                  <Icon size={28} />
                </span>
                <span className="game-card-copy">
                  <b>{t(`learn.games.${game.id}.name`)}</b>
                  <small>
                    {t(
                      providerMode
                        ? "learn.speechUnavailable"
                        : "ux.practiceUnavailable",
                    )}
                  </small>
                </span>
              </div>
            );
          })}
      </div>
      {!scoped && (
        <>
          <section className="live-panel">
            <h2>{t("learn.nextWords")}</h2>
            {queue.data?.items.map((i) => (
              <Link
                className="live-weak-word"
                key={i.id}
                to={`/vocabulary?item=${i.id}`}
              >
                <b dir="auto">{i.sourceText}</b>
                <span dir="auto">{i.primaryTranslation}</span>
                <small>{t(`labels.${i.learningStatus}`)}</small>
              </Link>
            ))}
            {queue.data && !queue.data.items.length && (
              <p>{t("learn.emptyQueue")}</p>
            )}
          </section>
          <section className="live-panel">
            <h2>{t("learn.sessionHistory")}</h2>
            <RemoteState
              loading={sessions.loading}
              error={sessions.error}
              retry={() => void sessions.reload()}
            />
            <div className="session-history-list">
              {sessions.data?.items.map((s) => (
                <article className="session-history-row" key={s.id}>
                  <div>
                    <b>
                      {t(`labels.${s.sessionType}`, {
                        defaultValue: s.sessionType,
                      })}
                    </b>
                    {s.scope && <span>{s.scope.title}</span>}
                  </div>
                  <span className={`practice-result ${s.status}`}>
                    {s.status === "active"
                      ? t("learn.statusActive")
                      : s.status === "completed"
                        ? t("learn.statusCompleted")
                        : t("learn.statusStopped")}
                  </span>
                  <div className="session-history-meta">
                    <time dateTime={s.startedAt}>
                      {new Date(s.startedAt).toLocaleString(
                        i18n.resolvedLanguage,
                      )}
                    </time>
                    <small>
                      {t("learn.attemptsXp", {
                        count: s.attemptCount,
                        xp: s.xpEarned,
                      })}
                    </small>
                  </div>
                  {s.status === "active" && (
                    <Link
                      className="button ghost"
                      to={`/learn/session/${s.sessionType === "smart_review" ? "smart" : s.sessionType === "listening_spelling" ? "listening" : s.sessionType}?${new URLSearchParams({ resume: s.id, language: code, ...(s.scope?.type === "pack" ? { pack: s.scope.id } : {}) })}`}
                    >
                      {t("learn.continue")}
                    </Link>
                  )}
                </article>
              ))}
            </div>
            {(cursorHistory.length > 0 || sessions.data?.nextCursor) && (
              <nav
                className="live-pagination compact"
                aria-label={t("learn.sessionPaginationAria")}
              >
                <button
                  className="button ghost pagination-arrow"
                  disabled={!cursorHistory.length}
                  aria-label={t("learn.previousSessions")}
                  onClick={() => {
                    const previous = cursorHistory.at(-1);
                    setCursorHistory((history) => history.slice(0, -1));
                    setCursor(previous);
                  }}
                >
                  <ChevronRight size={18} />
                </button>
                <span>
                  {t("learn.sessionPage", { page: cursorHistory.length + 1 })}
                </span>
                <button
                  className="button secondary pagination-arrow"
                  disabled={!sessions.data?.nextCursor}
                  aria-label={t("learn.moreSessions")}
                  onClick={() => {
                    setCursorHistory((history) => [...history, cursor]);
                    setCursor(sessions.data!.nextCursor!);
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
              </nav>
            )}
          </section>
        </>
      )}
      <div className="learn-more-actions">
        <button className="button ghost" onClick={() => setScopeOpen(true)}>
          {t("ux.changeWords")}
        </button>
        <Link
          className="button ghost"
          to={practiceLink("spelling", params, scopeLanguage)}
        >
          {t("ux.spelling")}
        </Link>
        <Link
          className="button ghost"
          to={`/history?language=${encodeURIComponent(code)}`}
        >
          {t("ux.history")}
        </Link>
      </div>
      <Modal
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        title={t("ux.chooseWords")}
      >
        <div className="modal-body ux-choice-list">
          <button className="ux-choice" onClick={() => selectScope()}>
            {t("ux.allWords")}
          </button>
          <Link
            className="ux-choice"
            to="/vocabulary"
            onClick={() => setScopeOpen(false)}
          >
            {t("ux.chooseSpecificWords")}
          </Link>
          <RemoteState
            loading={packs.loading}
            error={packs.error}
            retry={() => void packs.reload()}
          />
          {packs.data?.packs
            .filter((item) => item.installed && item.progress.linked > 0)
            .map((item) => (
              <button
                className="ux-choice"
                onClick={() => selectScope(item.id)}
                key={item.id}
              >
                <BookPack title={item.title} words={item.progress.linked} />
              </button>
            ))}
          <Link className="button ghost" to="/word-packs">
            {t("nav.wordPacks")}
          </Link>
        </div>
      </Modal>
    </div>
  );
}
function BookPack({ title, words }: { title: string; words: number }) {
  const { t } = useTranslation();
  return (
    <span>
      <b dir="auto">{title}</b>
      <small>{t("ux.collectionWords", { count: words })}</small>
    </span>
  );
}
