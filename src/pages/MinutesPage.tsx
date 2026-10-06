import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RemoteState } from "../components/RemoteState";
import { billing } from "../lib/billing";
import { useResource } from "../lib/useResource";
import { learningReturn } from "../lib/learningNavigation";

export function MinutesPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const minutes = useResource(useCallback(() => billing.minutes(), []));
  const returnTo = learningReturn(params.get("return"), "/private-lesson");
  return (
    <div
      className="canonical-page minutes-page"
      data-figma-desktop="43:22047"
      data-figma-mobile="43:23416"
    >
      <header>
        <h1>{t("minutesUi.title")}</h1>
        <p>{t("minutesUi.description")}</p>
      </header>
      <section className="ux-card mint">
        <RemoteState
          loading={minutes.loading}
          error={minutes.error}
          retry={() => void minutes.reload()}
        />
        {minutes.data && (
          <>
            <h2>
              {t("billing.minutesRemaining", {
                count: Math.floor(minutes.data.secondsRemaining / 60),
              })}
            </h2>
            <p>{t("privateLesson.minutesChargePolicy")}</p>
            {minutes.data.expiresAt && (
              <p>
                {t("minutesUi.expires", {
                  date: new Date(minutes.data.expiresAt).toLocaleDateString(),
                })}
              </p>
            )}
          </>
        )}
        <Link className="button primary" to={returnTo}>
          {t("minutesUi.returnPreparation")}
        </Link>
      </section>
      <section className="ux-card">
        <h2>{t("minutesUi.addTime")}</h2>
        <p>{t("minutesUi.checkoutDescription")}</p>
        <Link className="button secondary" to="/billing">
          {t("billing.buyMinutes")}
        </Link>
      </section>
      <Link className="button ghost" to="/history?view=lessons">
        {t("ux.history")}
      </Link>
    </div>
  );
}
