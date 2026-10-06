import { useState } from "react";
import { BookOpenCheck, Mail, MessageCircle } from "lucide-react";
import { EmailAuthForm } from "../components/EmailAuthForm";
import { Logo } from "../components/Logo";
import { useApp } from "../context/AppContext";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { FacebookSignIn } from "../components/FacebookSignIn";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UiLanguageSelect } from "../components/UiLanguageSelect";
import { supportEmailHref, supportWhatsappHref } from "../lib/supportContact";

export function AuthPage() {
  const { t } = useTranslation();
  const { authenticate, authenticateGoogle, authenticateFacebook, startDemo } =
    useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div
      className="auth-page auth-review"
      data-figma-desktop="98:3162"
      data-figma-mobile="98:40117"
    >
      <UiLanguageSelect compact />
      <header className="auth-review-header">
        <Logo />
      </header>
      <main className="auth-main">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-card">
          <EmailAuthForm authenticate={authenticate} onBusy={setLoading} />
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <details className="auth-extra">
            <summary>{t("authUi.moreOptions")}</summary>
            <div className="or-divider">
              <span>{t("auth.or")}</span>
            </div>
            <GoogleSignIn
              disabled={loading}
              onCredential={(token) => {
                setLoading(true);
                setError("");
                void authenticateGoogle(token)
                  .catch((reason) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : t("auth.googleError"),
                    ),
                  )
                  .finally(() => setLoading(false));
              }}
            />
            <FacebookSignIn
              disabled={loading}
              onCredential={(token) => {
                setLoading(true);
                setError("");
                void authenticateFacebook(token)
                  .catch((reason) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : t("auth.facebookError"),
                    ),
                  )
                  .finally(() => setLoading(false));
              }}
            />
            {import.meta.env.VITE_DEMO_MODE === "true" && (
              <>
                <button
                  className="button demo-button"
                  disabled={loading}
                  onClick={startDemo}
                >
                  <BookOpenCheck size={19} />
                  {t("auth.demoSubmit")}
                  <span>{t("auth.noRegistration")}</span>
                </button>
                <p className="auth-footnote">{t("auth.demoNote")}</p>
              </>
            )}
            <p className="auth-footnote">{t("auth.socialNote")}</p>
          </details>
          <nav
            className="auth-support-links"
            aria-label={t("help.contactTitle")}
          >
            <a href={supportEmailHref(t("help.emailSubject"))}>
              <Mail size={15} aria-hidden="true" />
              {t("help.contactEmail")}
            </a>
            <a
              href={supportWhatsappHref(t("help.whatsappMessage"))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={15} aria-hidden="true" />
              {t("help.contactWhatsapp")}
            </a>
          </nav>
          <nav
            className="auth-legal-links"
            aria-label={t("auth.legalNavigation")}
          >
            <Link to="/terms-of-service">{t("auth.terms")}</Link>
            <Link to="/privacy-policy">{t("auth.privacy")}</Link>
            <Link to="/refund-policy">{t("auth.refunds")}</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
