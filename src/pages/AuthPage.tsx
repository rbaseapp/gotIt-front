import { useState } from "react";
import {
  BookOpenCheck,
  Brain,
  Check,
  Mail,
  MessageCircle,
  Sparkles,
} from "lucide-react";
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
    <div className="auth-page auth-production">
      <UiLanguageSelect compact />
      <section className="auth-showcase">
        <Logo />
        <div className="showcase-copy">
          <span className="pill light">
            <Sparkles size={14} />
            {t("auth.tagline")}
          </span>
          <h1>
            {t("auth.headlineLine1")}
            <br />
            {t("auth.headlineLine2")}
            <br />
            <em>{t("auth.headlineEmphasis")}</em>
          </h1>
          <p>{t("auth.description")}</p>
          <ul>
            <li>
              <Check size={17} />
              {t("auth.benefitPace")}
            </li>
            <li>
              <Check size={17} />
              {t("auth.benefitSkills")}
            </li>
            <li>
              <Check size={17} />
              {t("auth.benefitContext")}
            </li>
          </ul>
        </div>
        <div className="floating-word-card">
          <span>
            <Brain size={18} />
          </span>
          <div>
            <b dir="ltr">serendipity</b>
            <small>{t("auth.sampleTranslation")}</small>
          </div>
          <em>{t("auth.sampleWord")}</em>
        </div>
        <p className="showcase-footer">{t("auth.footer")}</p>
      </section>
      <main className="auth-main">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-card">
          <p className="eyebrow">{t("auth.welcome")}</p>
          <EmailAuthForm authenticate={authenticate} onBusy={setLoading}>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
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
          </EmailAuthForm>
          <p className="auth-footnote">{t("auth.socialNote")}</p>
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
