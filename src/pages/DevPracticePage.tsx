import { Fragment, useCallback, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Globe2,
  Play,
  Target,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { Modal } from "../components/Modal";
import { RemoteState } from "../components/RemoteState";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { useResource } from "../lib/useResource";
import { getLanguageOptions } from "../lib/languages";
import { learningReturn, practiceLink } from "../lib/learningNavigation";
import { readFocusCheckpoint } from "../lib/focusPractice";
import {
  practiceCards,
  recentPracticeLink,
  recentPracticeTime,
  sessionGame,
} from "../lib/practiceDesign";
import {
  capabilitiesSchema,
  dashboardSchema,
  page,
  product,
  query,
  queueSchema,
  sessionSchema,
  wordPacksSchema,
} from "../lib/product";
import "../dashboard-design.css";
import "../practice-design.css";

const art = (name: string) => `/assets/practice-v3/${name}.png`;
const subscribeWidth = (notify: () => void) => {
  const queries = [
    matchMedia("(max-width: 1000px)"),
    matchMedia("(max-width: 560px)"),
  ];
  queries.forEach((q) => q.addEventListener("change", notify));
  return () => queries.forEach((q) => q.removeEventListener("change", notify));
};
const visibleCards = () =>
  matchMedia("(max-width: 560px)").matches
    ? 1
    : matchMedia("(max-width: 1000px)").matches
      ? 2
      : 3;

function RecentPractice({
  code,
  returnTo,
}: {
  code: string;
  returnTo: string;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useApp();
  const count = useSyncExternalStore(subscribeWidth, visibleCards);
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<Array<string | undefined>>([]);
  const [offset, setOffset] = useState(0);
  const url = `practice/sessions${query({ limit: "10", cursor, sourceLanguageCode: code })}`;
  const sessions = useResource(
    useCallback(() => product(page(sessionSchema), url), [url]),
  );
  const items =
    sessions.loading || sessions.error ? [] : (sessions.data?.items ?? []);
  const index = Math.min(offset, Math.max(0, items.length - count));
  const Arrow = i18n.dir() === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <section className="sec" aria-labelledby="practice-recent">
      <div className="sh">
        <h2 id="practice-recent">{t("practiceDesign.recentTitle")}</h2>
        <p>{t("practiceDesign.recentDescription")}</p>
      </div>
      <RemoteState
        loading={sessions.loading}
        error={sessions.error}
        retry={() => void sessions.reload()}
      />
      {!sessions.loading && !sessions.error && !items.length && (
        <p className="empty-state">{t("practiceDesign.noRecent")}</p>
      )}
      {!!items.length && (
        <div className="cont">
          <button
            className="nav-btn"
            aria-label={t("learn.previousSessions")}
            disabled={sessions.loading || (!history.length && !index)}
            onClick={() => {
              if (index) setOffset(index - 1);
              else {
                setCursor(history.at(-1));
                setHistory(history.slice(0, -1));
                setOffset(0);
              }
            }}
          >
            <Arrow className="reverse" size={18} />
          </button>
          <div className="rail" aria-live="polite">
            {items.slice(index, index + count).map((session) => {
              const card = practiceCards.find(
                (c) => c.game === sessionGame(session.sessionType),
              );
              return (
                <Link
                  className="ci"
                  key={session.id}
                  to={recentPracticeLink(
                    session,
                    code,
                    returnTo,
                    user
                      ? readFocusCheckpoint(user.id, session.id)?.type
                      : undefined,
                  )}
                >
                  <img
                    src={art(card?.asset ?? "cards")}
                    alt=""
                    width="84"
                    height="64"
                  />
                  <span className="t">
                    <b>
                      {card
                        ? t(`practiceDesign.games.${card.id}.title`)
                        : t(`labels.${session.sessionType}`, {
                            defaultValue: session.sessionType,
                          })}
                    </b>
                    <small>
                      <time dateTime={session.startedAt}>
                        {recentPracticeTime(
                          session.startedAt,
                          i18n.resolvedLanguage || "en",
                        )}
                      </time>{" "}
                      ·{" "}
                      {t(
                        session.status === "active"
                          ? "learn.statusActive"
                          : session.status === "completed"
                            ? "learn.statusCompleted"
                            : "learn.statusStopped",
                      )}
                    </small>
                  </span>
                  <span className="arr" aria-hidden="true">
                    <Arrow size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
          <button
            className="nav-btn"
            aria-label={t("learn.moreSessions")}
            disabled={
              sessions.loading ||
              (index + count >= items.length && !sessions.data?.nextCursor)
            }
            onClick={() => {
              if (index + count < items.length) setOffset(index + 1);
              else if (sessions.data?.nextCursor) {
                setHistory([...history, cursor]);
                setCursor(sessions.data.nextCursor);
                setOffset(0);
              }
            }}
          >
            <Arrow size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

export function DevPracticePage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const subscription = useSubscription();
  const language = useLearningLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<"scope" | "more" | "unavailable" | null>(
    null,
  );
  const scoped = ["items", "pack", "reading"].some((key) => params.has(key));
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const pack = packs.data?.packs.find((p) => p.id === params.get("pack"));
  const code =
    pack?.track.sourceLanguageCode ?? params.get("language") ?? language.code;
  const capabilities = useResource(
    useCallback(() => product(capabilitiesSchema, "capabilities"), []),
  );
  const queue = useResource(
    useCallback(
      async () => ({
        ...(await product(
          queueSchema,
          `learning/queue${query({ limit: "10", sourceLanguageCode: code })}`,
        )),
        language: code,
      }),
      [code],
    ),
  );
  const dashboard = useResource(
    useCallback(
      async () => ({
        ...(await product(
          dashboardSchema,
          `dashboard${query({ sourceLanguageCode: code })}`,
        )),
        language: code,
      }),
      [code],
    ),
  );
  const d = dashboard.data?.language === code ? dashboard.data : undefined;
  const names = new Map(getLanguageOptions(i18n.resolvedLanguage || "en"));
  const languageName = names.get(code) || code;
  const goal = d?.dailyGoal;
  const unit = goal
    ? t(`settings.${goal.type === "items" ? "uniqueWords" : goal.type}`)
    : "";
  const progress = goal
    ? Math.min(1, goal.current / Math.max(1, goal.value))
    : 0;
  const skills = capabilities.data?.learningLanguages.find(
    (l) => l.languageCode === code,
  )?.enabledSkills;
  const blocked =
    language.loading ||
    !!language.error ||
    subscription.loading ||
    !subscription.status ||
    !!capabilities.error ||
    capabilities.loading ||
    (params.has("pack") &&
      (packs.loading || !!packs.error || !pack?.installed));
  const permitted = subscription.hasEntitlement("practice.play");
  const available = (game: string, skill?: string | null) =>
    !blocked &&
    permitted &&
    !!capabilities.data?.configured.practice &&
    ((game !== "listening" && game !== "pronunciation") ||
      !!capabilities.data?.configured.speech) &&
    (!skill || !skills || skills.some((s) => s === skill));
  const canStart =
    available("smart") &&
    (scoped ||
      (!queue.loading &&
        !queue.error &&
        queue.data?.language === code &&
        !!queue.data.items.length));
  const gameLink = (game: string) => {
    const scope = new URLSearchParams(params);
    scope.set("language", code);
    return practiceLink(game, scope, code).replace(
      "/learn/smart",
      "/learn/session/smart",
    );
  };
  const start = () => {
    if (!blocked && !permitted) navigate("/billing");
    else if (canStart) navigate(gameLink("smart"));
    else if (!blocked && !queue.loading) setDialog("unavailable");
  };
  const Arrow = i18n.dir() === "rtl" ? ChevronLeft : ChevronRight;
  const changeScope = (id?: string) => {
    const next = new URLSearchParams({ language: language.code });
    if (params.has("return"))
      next.set("return", learningReturn(params.get("return")));
    if (id) next.set("pack", id);
    navigate(`/learn?${next}`);
    setDialog(null);
  };
  return (
    <div className="p3">
      <div className="strip">
        <div className="wrap">
          {goal && (
            <span className="chip">
              <span>
                <b className="en" dir="ltr">
                  {goal.current} / {goal.value}
                </b>{" "}
                {t("practiceDesign.today", { unit })}
              </span>
              <span className="mini" aria-hidden="true">
                <span style={{ width: `${progress * 100}%` }} />
              </span>
            </span>
          )}
          {d && (
            <span className="chip">
              <Flame size={16} className="fl" fill="currentColor" />
              {t("newDashboard.streak", {
                count: d.gamification.currentStreakDays,
              })}
            </span>
          )}
          <label className="lpair">
            <Globe2 size={18} />
            <span>
              {names.get(profile.defaultTranslationLanguage || "he") ||
                profile.defaultTranslationLanguage}{" "}
              {i18n.dir() === "rtl" ? "←" : "→"}
            </span>
            <select
              aria-label={t("vocabulary.sourceLanguage")}
              value={code}
              disabled={language.loading || scoped}
              onChange={(e) => {
                language.setCode(e.target.value);
                const next = new URLSearchParams(params);
                next.set("language", e.target.value);
                navigate(`/learn?${next}`);
              }}
            >
              {[
                ...new Set([
                  code,
                  ...language.languages.map((l) => l.code),
                  ...profile.languages.map((l) => l.languageCode),
                ]),
              ]
                .filter(Boolean)
                .map((c) => (
                  <option value={c} key={c}>
                    {names.get(c) || c}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>
      <div className="wrap p3m">
        <RemoteState
          loading={
            language.loading || capabilities.loading || subscription.loading
          }
          error={language.error || capabilities.error}
          retry={() => {
            void language.reload();
            void capabilities.reload();
          }}
        />
        <RemoteState
          loading={false}
          error={subscription.error}
          retry={() => void subscription.reload()}
        />
        {params.has("pack") && (
          <RemoteState
            loading={packs.loading}
            error={
              packs.error ||
              (!packs.loading && !pack?.installed ? t("game.invalidPack") : "")
            }
            retry={() => void packs.reload()}
          />
        )}
        {(scoped || params.has("return")) && (
          <div className="scope-context">
            {params.has("return") && (
              <Link to={learningReturn(params.get("return"))}>
                {t("common.back")}
              </Link>
            )}
            {scoped && (
              <span>
                {pack?.title ??
                  (params.has("items")
                    ? t("ux.selectedWords", {
                        count: params.get("items")!.split(",").length,
                      })
                    : t("ux.chooseWords"))}
              </span>
            )}
            <button onClick={() => setDialog("scope")}>
              {t("ux.changeWords")}
            </button>
          </div>
        )}
        <section className="hero" aria-labelledby="practice-heading">
          <div className="hero-txt">
            <h1 id="practice-heading">
              {t("practiceDesign.title")}
              <svg
                className="burst"
                viewBox="0 0 34 34"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M17 4v7M6 12l6 4M5 25l7-2" />
              </svg>
            </h1>
            <p>{t("practiceDesign.description", { language: languageName })}</p>
            <button
              className="start"
              disabled={blocked || (!scoped && queue.loading)}
              onClick={start}
            >
              <Play size={22} fill="currentColor" aria-hidden="true" />
              {t("practiceDesign.start")}
            </button>
            <span className="sub">
              {!blocked && !permitted
                ? t("learn.lockedDescription")
                : t("practiceDesign.startHelp")}
            </span>
          </div>
          <div className="hero-art">
            <img
              src={art("hero")}
              alt={t("practiceDesign.heroAlt")}
              width="468"
              height="296"
              fetchPriority="high"
            />
          </div>
        </section>
        {!scoped && (
          <RemoteState
            loading={false}
            error={queue.error}
            retry={() => void queue.reload()}
          />
        )}
        {!scoped &&
          !queue.loading &&
          !queue.error &&
          queue.data?.language === code &&
          !queue.data.items.length && (
            <div className="empty-state">
              <p>{t("learn.emptyQueue")}</p>
              <Link to="/vocabulary">{t("ux.words")}</Link>
            </div>
          )}
        <section className="sec" aria-labelledby="practice-games">
          <div className="sh">
            <h2 id="practice-games">{t("practiceDesign.gamesTitle")}</h2>
            <p>{t("practiceDesign.gamesDescription")}</p>
          </div>
          <div className="games">
            {practiceCards.map((card) => (
              <button
                className="game"
                key={card.id}
                onClick={() => {
                  if (!permitted && !subscription.loading) navigate("/billing");
                  else if (
                    card.game &&
                    available(card.game, card.skill) &&
                    canStart
                  )
                    navigate(gameLink(card.game));
                  else setDialog("unavailable");
                }}
                disabled={blocked}
              >
                <img src={art(card.asset)} alt="" width="116" height="90" />
                <b>{t(`practiceDesign.games.${card.id}.title`)}</b>
                <span className="d">
                  {t(`practiceDesign.games.${card.id}.description`, {
                    language: languageName,
                  })}
                </span>
                <span className="arr" aria-hidden="true">
                  <Arrow size={18} />
                </span>
                {(!card.game ||
                  (!blocked && !available(card.game, card.skill))) && (
                  <small className="availability">
                    {t(
                      card.game
                        ? "ux.practiceUnavailable"
                        : "practiceDesign.comingSoon",
                    )}
                  </small>
                )}
              </button>
            ))}
          </div>
        </section>
        {!scoped && !language.loading && !language.error && (
          <RecentPractice
            key={code}
            code={code}
            returnTo={`/learn?${params}`}
          />
        )}
        <section className="goal" aria-labelledby="practice-goal">
          <div className="goal-txt">
            <h2 id="practice-goal">
              <Target size={24} aria-hidden="true" />
              {t("practiceDesign.goalTitle")}
            </h2>
            <RemoteState
              loading={dashboard.loading}
              error={dashboard.error}
              retry={() => void dashboard.reload()}
            />
            {goal && (
              <>
                <p>
                  {t(
                    goal.completed
                      ? "practiceDesign.goalDone"
                      : "practiceDesign.goalDescription",
                    { value: goal.value, unit },
                  )}
                </p>
                <div className="steps">
                  <div
                    className="track"
                    role="progressbar"
                    aria-label={t("practiceDesign.goalTitle")}
                    aria-valuemin={0}
                    aria-valuemax={goal.value}
                    aria-valuenow={Math.min(goal.current, goal.value)}
                    aria-valuetext={`${goal.current} / ${goal.value} ${unit}`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <Fragment key={i}>
                        {i > 0 && (
                          <span
                            className={`seg${progress >= i / 5 ? " ok" : ""}`}
                          />
                        )}
                        <span
                          className={`node${progress >= (i + 1) / 5 ? " ok" : ""}`}
                        >
                          {progress >= (i + 1) / 5 && <Check size={17} />}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                  <span className="cnt en" dir="ltr">
                    {goal.current} / {goal.value}
                  </span>
                </div>
              </>
            )}
            <button
              className="cta2"
              disabled={blocked || (!scoped && queue.loading)}
              onClick={start}
            >
              <Play size={20} fill="currentColor" aria-hidden="true" />
              {t("practiceDesign.continue")}
            </button>
          </div>
          <div className="goal-art">
            <img
              src={art("goal")}
              alt={t("practiceDesign.goalAlt")}
              width="344"
              height="238"
              loading="lazy"
            />
          </div>
        </section>
        <div className="practice-more">
          <button onClick={() => setDialog("scope")}>
            {t("ux.changeWords")}
          </button>
          <button onClick={() => setDialog("more")}>
            {t("practiceDesign.moreGames")}
          </button>
          <Link to={`/history?language=${encodeURIComponent(code)}`}>
            {t("ux.history")}
          </Link>
        </div>
      </div>
      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={t(
          dialog === "scope"
            ? "ux.chooseWords"
            : dialog === "more"
              ? "practiceDesign.moreGames"
              : "practiceDesign.unavailableTitle",
        )}
      >
        <div className="modal-body ux-choice-list">
          {dialog === "unavailable" && (
            <>
              <p>{t("practiceDesign.unavailableDescription")}</p>
              <Link to="/vocabulary">{t("ux.words")}</Link>
            </>
          )}
          {dialog === "more" &&
            ["matching", "pronunciation", "spelling"].map((game) =>
              available(
                game,
                game === "pronunciation"
                  ? "pronunciation"
                  : game === "spelling"
                    ? "recall"
                    : "recognition",
              ) && canStart ? (
                <Link className="ux-choice" to={gameLink(game)} key={game}>
                  {t(
                    game === "spelling"
                      ? "ux.spelling"
                      : `learn.games.${game}.name`,
                  )}
                </Link>
              ) : (
                <p key={game}>
                  {t(
                    game === "spelling"
                      ? "ux.spelling"
                      : `learn.games.${game}.name`,
                  )}{" "}
                  · {t("ux.practiceUnavailable")}
                </p>
              ),
            )}
          {dialog === "scope" && (
            <>
              <button className="ux-choice" onClick={() => changeScope()}>
                {t("ux.allWords")}
              </button>
              <Link className="ux-choice" to="/vocabulary">
                {t("ux.chooseSpecificWords")}
              </Link>
              <RemoteState
                loading={packs.loading}
                error={packs.error}
                retry={() => void packs.reload()}
              />
              {packs.data?.packs
                .filter((p) => p.installed && p.progress.linked > 0)
                .map((p) => (
                  <button
                    className="ux-choice"
                    key={p.id}
                    onClick={() => changeScope(p.id)}
                  >
                    {p.title} ·{" "}
                    {t("ux.collectionWords", { count: p.progress.linked })}
                  </button>
                ))}
              <Link to="/word-packs">{t("nav.wordPacks")}</Link>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
