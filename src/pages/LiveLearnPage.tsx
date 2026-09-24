import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
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
import { RemoteState } from "../components/RemoteState";
import {
  capabilitiesSchema,
  page,
  product,
  query,
  queueSchema,
  sessionSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "react-i18next";
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
  const queue = useResource(
    useCallback(() => product(queueSchema, "learning/queue?limit=10"), []),
  );
  const capabilities = useResource(
    useCallback(() => product(capabilitiesSchema, "capabilities"), []),
  );
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );
  const sessionsUrl = `practice/sessions${query({ limit: "10", cursor })}`;
  const sessions = useResource(
    useCallback(() => product(page(sessionSchema), sessionsUrl), [sessionsUrl]),
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
          <p className="eyebrow">{t("learn.eyebrow")}</p>
          <h1>{t("learn.title")}</h1>
          <p>{t("learn.description")}</p>
        </div>
      </section>
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
          <RemoteState
            loading={queue.loading}
            error={queue.error}
            retry={() => void queue.reload()}
          />
          {queue.data && (
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
        <Link className="button smart-start" to="/learn/session/smart">
          {t("learn.startSession")}
        </Link>
      </section>
      <div className="game-grid">
        {gameOrder
          .map((id) => games.find((game) => game.id === id)!)
          .map(({ icon: Icon, ...game }) => {
            const providerMode = ["listening", "pronunciation"].includes(
              game.id,
            );
            const available =
              !providerMode || Boolean(capabilities.data?.configured.speech);
            return available ? (
              <Link
                className="game-card"
                to={`/learn/session/${game.id}`}
                key={game.id}
              >
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
                  <small>{t("learn.speechUnavailable")}</small>
                </span>
              </div>
            );
          })}
      </div>
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
                  {new Date(s.startedAt).toLocaleString(i18n.resolvedLanguage)}
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
                  to={`/learn/session/${s.sessionType === "smart_review" ? "smart" : s.sessionType === "listening_spelling" ? "listening" : s.sessionType}?resume=${s.id}`}
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
    </div>
  );
}
