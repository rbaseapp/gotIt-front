import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { billing } from "../lib/billing";
import { useResource } from "../lib/useResource";
import { RemoteState } from "../components/RemoteState";
export function AccountPage() {
  const { t } = useTranslation();
  const { profile } = useApp();
  const minutes = useResource(useCallback(() => billing.minutes(), []));
  return (
    <div className="canonical-page account-page" data-figma-desktop="43:21838">
      <header>
        <h1>{t("ux.account")}</h1>
        <p>{t("accountUi.description", { name: profile.name })}</p>
      </header>
      <section className="ux-card">
        <h2>{t("accountUi.progressHistory")}</h2>
        <Link className="button secondary" to="/history">
          {t("ux.history")}
        </Link>
        <Link className="button secondary" to="/achievements?return=%2Faccount">
          {t("ux.achievements")}
        </Link>
      </section>
      <section className="ux-card">
        <h2>{t("accountUi.teacherTime")}</h2>
        <RemoteState
          loading={minutes.loading}
          error={minutes.error}
          retry={() => void minutes.reload()}
        />
        {minutes.data && (
          <p>
            {t("billing.minutesRemaining", {
              count: Math.floor(minutes.data.secondsRemaining / 60),
            })}
          </p>
        )}
        <Link className="button secondary" to="/billing/minutes">
          {t("accountUi.minutesPlan")}
        </Link>
        <Link className="button secondary" to="/settings#private-lessons">
          {t("accountUi.teacherPreferences")}
        </Link>
      </section>
      <section className="ux-card">
        <h2>{t("nav.settings")}</h2>
        <Link className="button secondary" to="/settings">
          {t("accountUi.languagesAccess")}
        </Link>
        <Link className="button secondary" to="/settings#learning">
          {t("settings.learningTitle")}
        </Link>
      </section>
    </div>
  );
}
