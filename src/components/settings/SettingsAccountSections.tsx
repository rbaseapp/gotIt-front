import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Crown,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Chrome,
} from "lucide-react";
import { useSubscription } from "../../context/SubscriptionContext";
import { useApp } from "../../context/AppContext";
import { billing } from "../../lib/billing";
import { EmailAuthForm } from "../EmailAuthForm";
import { Modal } from "../Modal";

export function SettingsSecurity() {
  const { t } = useTranslation();
  const { user, authenticate } = useApp();
  const [notice, setNotice] = useState(false),
    [password, setPassword] = useState(false);
  return (
    <>
      <Modal
        open={password}
        onClose={() => setPassword(false)}
        title={t("settingsLive.passwordAction")}
      >
        <div className="modal-body">
          <EmailAuthForm
            startingMode="forgot"
            initialEmail={user?.email}
            authenticate={authenticate}
            onBusy={() => {}}
          />
        </div>
      </Modal>
      <section className="sd-card">
        <h2>{t("settingsLive.privacyData")}</h2>
        <div className="sd-setting-row">
          <div>
            <h2>{t("settingsLive.export")}</h2>
            <p>{t("settingsLive.exportHelp")}</p>
          </div>
          <Link className="sd-outline" to="/transfer">
            {t("settingsLive.export")}
          </Link>
        </div>
        <div className="sd-setting-row">
          <div>
            <h2>{t("settingsLive.lessonHistory")}</h2>
            <p>{t("settingsLive.lessonHistoryHelp")}</p>
          </div>
          <Link className="sd-outline" to="/history?view=lessons">
            {t("settingsLive.openHistory")}
          </Link>
        </div>
        <Link to="/privacy-policy">{t("auth.privacy")}</Link>
      </section>
      <section className="sd-card">
        <h2>{t("settingsLive.security")}</h2>
        <div className="sd-setting-row">
          <div>
            <h2>{t("settingsLive.passwordAction")}</h2>
            <p>{t("settingsLive.passwordHelp")}</p>
          </div>
          <button
            className="sd-outline"
            type="button"
            onClick={() => setPassword(true)}
          >
            {t("settingsLive.passwordAction")}
          </button>
        </div>
        <div className="sd-setting-row">
          <div>
            <h2>{t("settings.email")}</h2>
            <p dir="auto">{user?.email}</p>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>
        <p>{t("settingsLive.recoveryHelp")}</p>
      </section>
      <section className="sd-card sd-danger">
        <h2>{t("settingsLive.accountDeletion")}</h2>
        <p>{t("settingsLive.accountDeletionHelp")}</p>
        <div className="sd-row">
          <button
            className="sd-outline"
            type="button"
            onClick={() => setNotice(true)}
          >
            {t("settingsLive.contactSupport")}
          </button>
          <Link className="sd-outline" to="/transfer">
            {t("settingsLive.export")}
          </Link>
        </div>
      </section>
      <Modal
        open={notice}
        onClose={() => setNotice(false)}
        title={t("settingsLive.accountDeletion")}
      >
        <div className="modal-body">
          <p>{t("settingsLive.accountDeletionHelp")}</p>
          <Link className="sd-outline" to="/help">
            {t("settingsLive.contactSupport")}
          </Link>
        </div>
      </Modal>
    </>
  );
}
export function SettingsSubscription() {
  const { t, i18n } = useTranslation();
  const { status, loading, error, reload } = useSubscription();
  const { mode } = useApp();
  const [busy, setBusy] = useState(false),
    [portalError, setPortalError] = useState("");
  async function portal() {
    setBusy(true);
    setPortalError("");
    try {
      const result = await billing.portal();
      window.location.assign(result.url);
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">{t("common.loading")}</p>;
  if (error)
    return (
      <p role="alert">
        {error}
        <button className="sd-outline" onClick={() => void reload()}>
          {t("common.tryAgain")}
        </button>
      </p>
    );
  const ends =
    status?.subscription?.currentPeriodEndsAt || status?.trial?.endsAt;
  return (
    <div className="sd-subscription-grid">
      <div className="sd-editor">
        <section className="sd-card sd-setting-row">
          <span className="sd-crown">
            <Crown />
          </span>
          <div>
            <h2>
              {status?.plan.name ??
                t(mode === "demo" ? "settings.demo" : "subscription.free")}
            </h2>
            <p>
              {status?.subscription?.status
                ? t(`subscription.statuses.${status.subscription.status}`, {
                    defaultValue: status.subscription.status,
                  })
                : t("settingsDesign.subscriptionBody")}
            </p>
          </div>
        </section>
        <section className="sd-card sd-two-columns">
          <div className="sd-setting-row">
            <CalendarDays />
            <div>
              <h2>{t("settingsLive.renewal")}</h2>
              <p>
                {ends
                  ? new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                      dateStyle: "long",
                    }).format(new Date(ends))
                  : t("settingsLive.noRenewal")}
              </p>
            </div>
          </div>
          <div className="sd-setting-row">
            <CreditCard />
            <div>
              <h2>{t("settingsLive.payment")}</h2>
              <button
                className="sd-outline"
                type="button"
                disabled={busy || !status?.subscription}
                onClick={() => void portal()}
              >
                {t("settingsLive.updatePayment")}
              </button>
            </div>
          </div>
        </section>
        <section className="sd-card">
          <h2>{t("settingsLive.billingHistory")}</h2>
          <p>{t("settingsLive.portalHelp")}</p>
          <button
            className="sd-outline"
            type="button"
            disabled={busy || !status?.subscription}
            onClick={() => void portal()}
          >
            {t("settingsLive.invoices")}
          </button>
        </section>
        <section className="sd-card">
          <h2>{t("settingsLive.cancelPlan")}</h2>
          <div className="sd-setting-row">
            <p>{t("settingsLive.cancelPlanHelp")}</p>
            <button
              className="sd-outline"
              type="button"
              disabled={busy || !status?.subscription}
              onClick={() => void portal()}
            >
              {t("settingsLive.cancelPlan")}
            </button>
          </div>
        </section>
        {portalError && <p role="alert">{portalError}</p>}
      </div>
      <section className="sd-card sd-plan-benefits">
        <h2>{t("settingsLive.planDetails")}</h2>
        <p>{t("settingsLive.planDetailsHelp")}</p>
        <Link className="sd-outline" to="/billing">
          {t("settingsDesign.subscriptionAction")}
        </Link>
        <Link to="/billing/minutes">{t("accountUi.minutesPlan")}</Link>
      </section>
    </div>
  );
}
export function SettingsExtension() {
  const { t } = useTranslation();
  return (
    <>
      <section className="sd-card">
        <div className="sd-setting-row">
          <Chrome />
          <div>
            <h2>{t("settingsDesign.extensionTitle")}</h2>
            <p>{t("settingsLive.extensionStatus")}</p>
          </div>
          <Link className="sd-outline" to="/help">
            {t("settingsDesign.extensionAction")}
          </Link>
        </div>
        <div className="sd-setting-row">
          <div>
            <h2>{t("settingsLive.translationBubble")}</h2>
            <p>{t("settingsLive.extensionOptions")}</p>
          </div>
          <Link className="sd-outline" to="/help">
            {t("settingsDesign.change")}
          </Link>
        </div>
        <div className="sd-setting-row">
          <div>
            <h2>{t("settingsLive.doubleClick")}</h2>
            <p>{t("settingsLive.extensionOptions")}</p>
          </div>
          <Link className="sd-outline" to="/help">
            {t("settingsDesign.change")}
          </Link>
        </div>
      </section>
      <section className="sd-card">
        <h2>{t("settingsLive.excludedSites")}</h2>
        <p>{t("settingsLive.extensionOptions")}</p>
        <Link className="sd-outline" to="/help">
          {t("settingsLive.extensionGuide")}
        </Link>
      </section>
    </>
  );
}
