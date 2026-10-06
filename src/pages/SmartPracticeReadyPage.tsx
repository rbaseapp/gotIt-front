import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { RemoteState } from "../components/RemoteState";
import { LearningLanguageSelect } from "../components/LearningLanguageSelect";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { learningReturn, selectedProgramKey } from "../lib/learningNavigation";
import { product, wordPacksSchema, uuid } from "../lib/product";
import { useResource } from "../lib/useResource";

type Pace = "short" | "long" | "review";
export function SmartPracticeReadyPage() {
  const { t } = useTranslation();
  const { user } = useApp();
  const { hasEntitlement } = useSubscription();
  const language = useLearningLanguage();
  const [params, setParams] = useSearchParams();
  const [showPace, setShowPace] = useState(false);
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const pack = packs.data?.packs.find((item) => item.id === params.get("pack"));
  const code =
    pack?.track.sourceLanguageCode || params.get("language") || language.code;
  const preferenceKey = `${selectedProgramKey(user)}.practicePace.${code}`;
  const readPace = (): Pace => {
    try {
      const value = localStorage.getItem(preferenceKey);
      return value === "long" || value === "review" ? value : "short";
    } catch {
      return "short";
    }
  };
  const [chosen, setChosen] = useState<{ key: string; value: Pace }>();
  const pace = chosen?.key === preferenceKey ? chosen.value : readPace();
  const choosePace = (value: Pace) => {
    setChosen({ key: preferenceKey, value });
    try {
      localStorage.setItem(preferenceKey, value);
    } catch {
      /* Current selection still applies. */
    }
    setShowPace(false);
  };
  const ids = params.get("items")?.split(",");
  const invalid =
    (params.has("pack") && !uuid.safeParse(params.get("pack")).success) ||
    (ids &&
      (!ids.length ||
        ids.length > 100 ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !uuid.safeParse(id).success)));
  const scopeTitle =
    pack?.title ||
    (ids ? t("ux.selectedWords", { count: ids.length }) : t("ux.allWords"));
  const launchParams = new URLSearchParams();
  for (const key of ["items", "pack", "language", "return"]) {
    const value = params.get(key);
    if (value)
      launchParams.set(key, key === "return" ? learningReturn(value) : value);
  }
  if (code) launchParams.set("language", code);
  launchParams.set("count", pace === "long" ? "20" : "10");
  launchParams.set("includeNew", pace === "review" ? "0" : "1");
  launchParams.set("ready", "1");
  const blocked = Boolean(
    invalid ||
    !hasEntitlement("practice.play") ||
    !code ||
    (params.has("pack") && (packs.loading || packs.error || !pack?.installed)),
  );
  return (
    <div
      className="ux-page canonical-page ux-smart-ready page-enter"
      data-figma-desktop={showPace ? "43:13692" : "43:13598"}
      data-figma-mobile={showPace ? "48:5162" : "48:4794"}
    >
      <Link
        className="button ghost smart-back"
        to={learningReturn(params.get("return"), "/learn")}
      >
        {t("common.back")}
      </Link>
      <header className="page-heading-row">
        <div>
          <h1>{t(showPace ? "smartUi.paceTitle" : "smartUi.title")}</h1>
          <p>
            {showPace
              ? t("smartUi.paceHelp")
              : `${code} · ${scopeTitle} · ${t(pace === "long" ? "smartUi.timeLong" : "smartUi.timeShort")}`}
          </p>
        </div>
      </header>
      {!params.has("pack") && !params.has("items") && (
        <LearningLanguageSelect
          code={code}
          languages={language.languages}
          onChange={(value) => {
            const next = new URLSearchParams(params);
            next.set("language", value);
            setParams(next);
            language.setCode(value);
          }}
        />
      )}
      <RemoteState
        loading={language.loading || (params.has("pack") && packs.loading)}
        error={language.error || (params.has("pack") ? packs.error : "")}
        retry={() => {
          void language.reload();
          void packs.reload();
        }}
      />
      {invalid && (
        <p className="form-error" role="alert">
          {t("game.invalidItems")}
        </p>
      )}
      {!hasEntitlement("practice.play") && (
        <Link className="button secondary" to="/billing">
          {t("subscription.upgrade")}
        </Link>
      )}
      {showPace ? (
        <div className="smart-pace-options">
          {(["short", "long", "review"] as const).map((value) => (
            <section
              className={`ux-card${pace === value ? " mint" : ""}`}
              key={value}
            >
              <h2>{t(`smartUi.${value}Title`)}</h2>
              <p>{t(`smartUi.${value}Help`)}</p>
              <button
                className={`button ${pace === value ? "primary" : "secondary"}`}
                aria-pressed={pace === value}
                onClick={() => choosePace(value)}
              >
                {t(`smartUi.${value}Choose`)}
              </button>
            </section>
          ))}
        </div>
      ) : (
        <>
          <section className="ux-card mint">
            <h2>{t("smartUi.readyTitle")}</h2>
            <p>
              {t(
                pace === "review" ? "smartUi.reviewHelp" : "smartUi.readyHelp",
              )}
            </p>
            <Link
              className={`button primary${blocked ? " disabled" : ""}`}
              aria-disabled={blocked}
              tabIndex={blocked ? -1 : undefined}
              onClick={(event) => {
                if (blocked) event.preventDefault();
              }}
              to={`/learn/session/smart?${launchParams}`}
            >
              {t("smartUi.start")}
            </Link>
            <button className="button ghost" onClick={() => setShowPace(true)}>
              {t("smartUi.changePace")}
            </button>
          </section>
          <section className="ux-card">
            <h2>{t("smartUi.scopeTitle")}</h2>
            <p>{t("smartUi.scopeHelp")}</p>
            <Link
              className="button secondary"
              to={`/vocabulary?${new URLSearchParams({ language: code, return: `/learn/smart?${params}` })}`}
            >
              {t("smartUi.chooseScope")}
            </Link>
          </section>
          <p className="smart-reassurance">{t("smartUi.helpReturns")}</p>
        </>
      )}
    </div>
  );
}
