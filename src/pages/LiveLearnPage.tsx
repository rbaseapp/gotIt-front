import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Brain,
  Layers3,
  Mic2,
  Move,
  MousePointer2,
  PenLine,
  Headphones,
  SpellCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../context/SubscriptionContext";
import { LearningLanguageSelect } from "../components/LearningLanguageSelect";
import { RemoteState } from "../components/RemoteState";
import { Modal } from "../components/Modal";
import { ExploreActions } from "../components/ExploreActions";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { useResource } from "../lib/useResource";
import {
  product,
  capabilitiesSchema,
  queueSchema,
  wordPacksSchema,
} from "../lib/product";
import { practiceLink } from "../lib/learningNavigation";

const games = [
  { id: "recall", icon: PenLine, skill: "recall" },
  { id: "matching", icon: MousePointer2, skill: "recognition" },
  { id: "drag_drop", icon: Move, skill: "recognition" },
  { id: "listening", icon: Headphones, skill: "listening" },
  { id: "spelling", icon: SpellCheck, skill: "recall" },
  { id: "flashcards", icon: Layers3, skill: "recognition" },
  { id: "pronunciation", icon: Mic2, skill: "pronunciation" },
] as const;
export function LiveLearnPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const language = useLearningLanguage();
  const { status, loading, hasEntitlement } = useSubscription();
  const [scopeOpen, setScopeOpen] = useState(false);
  const code = params.get("language") || language.code;
  const capabilities = useResource(
    useCallback(() => product(capabilitiesSchema, "capabilities"), []),
  );
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
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const pack = packs.data?.packs.find((item) => item.id === params.get("pack"));
  const scopeLanguage = pack?.track.sourceLanguageCode ?? code;
  const skills = capabilities.data?.learningLanguages.find(
    (item) => item.languageCode === scopeLanguage,
  )?.enabledSkills;
  const scoped = params.has("items") || params.has("pack");
  const scopeTitle =
    pack?.title ??
    (params.has("items")
      ? t("ux.selectedWords", { count: params.get("items")!.split(",").length })
      : t("ux.allWords"));
  const enabled = loading || !status || hasEntitlement("practice.play");
  const selectScope = (packId?: string) => {
    const next = new URLSearchParams();
    if (params.has("return")) next.set("return", params.get("return")!);
    if (packId) next.set("pack", packId);
    else if (language.code) next.set("language", language.code);
    navigate(`/learn?${next}`);
    setScopeOpen(false);
  };
  if (language.loading || language.error)
    return (
      <RemoteState
        loading={language.loading}
        error={language.error}
        retry={() => void language.reload()}
      />
    );
  return (
    <div className="ux-page ux-game-hub page-enter">
      <header className="page-heading-row">
        <div>
          <h1>{t("ux.gameHubTitle")}</h1>
          <p dir="auto">{scopeTitle}</p>
        </div>
      </header>
      {!scoped && (
        <LearningLanguageSelect
          code={code}
          languages={language.languages}
          onChange={(next) => {
            language.setCode(next);
            const p = new URLSearchParams(params);
            p.set("language", next);
            navigate(`/learn?${p}`);
          }}
        />
      )}
      <RemoteState
        loading={capabilities.loading}
        error={capabilities.error}
        retry={() => void capabilities.reload()}
      />
      {!enabled ? (
        <section className="ux-card">
          <h2>{t("learn.lockedTitle")}</h2>
          <p>{t("learn.lockedDescription")}</p>
          <Link className="button primary" to="/billing">
            {t("subscription.upgrade")}
          </Link>
        </section>
      ) : (
        <>
          <section className="ux-card mint smart-session-card">
            <div className="ux-card-heading">
              <span className="ux-icon">
                <Brain size={28} />
              </span>
              <div>
                <h2>{t("ux.smartChoice")}</h2>
                <p>{t("ux.smartHelp")}</p>
              </div>
            </div>
            {!scoped && (
              <RemoteState
                loading={queue.loading}
                error={queue.error}
                retry={() => void queue.reload()}
              />
            )}
            {scoped ||
            (queue.data?.languageCode === code &&
              queue.data.items.length > 0) ? (
              <Link
                className="button primary"
                to={practiceLink("smart", params, code)}
              >
                {t("ux.startSmart")}
              </Link>
            ) : !queue.loading && !queue.error ? (
              <>
                <p>{t("learn.emptyQueue")}</p>
                <Link className="button secondary" to="/vocabulary">
                  {t("ux.words")}
                </Link>
              </>
            ) : null}
          </section>
          <section
            className="game-grid ux-game-grid"
            aria-label={t("ux.chooseGame")}
          >
            {games.map(({ id, icon: Icon, skill }) => {
              const speech = id === "listening" || id === "pronunciation";
              const available =
                Boolean(capabilities.data?.configured.practice) &&
                (!speech || capabilities.data?.configured.speech) &&
                (!skills || skills.includes(skill));
              const name =
                id === "spelling"
                  ? t("ux.spelling")
                  : t(`learn.games.${id}.name`);
              return available ? (
                <Link
                  className={`game-card game-${id}`}
                  key={id}
                  to={practiceLink(id, params, code)}
                >
                  <Icon size={24} aria-hidden="true" />
                  <span>
                    <b>{name}</b>
                    <small>
                      {id === "spelling"
                        ? t("ux.letterKeyboardHelp")
                        : t(`learn.games.${id}.description`)}
                    </small>
                  </span>
                </Link>
              ) : (
                <div
                  className="game-card disabled"
                  aria-disabled="true"
                  key={id}
                >
                  <Icon size={24} />
                  <span>
                    <b>{name}</b>
                    <small>
                      {t(
                        speech
                          ? "learn.speechUnavailable"
                          : "ux.practiceUnavailable",
                      )}
                    </small>
                  </span>
                </div>
              );
            })}
          </section>
        </>
      )}
      <button className="button ghost" onClick={() => setScopeOpen(true)}>
        {t("ux.changeWords")}
      </button>
      <ExploreActions />
      <Link className="button ghost" to="/history">
        {t("ux.history")}
      </Link>
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
