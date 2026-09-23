import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Brain,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useApp } from "../context/AppContext";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { FacebookSignIn } from "../components/FacebookSignIn";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UiLanguageSelect } from "../components/UiLanguageSelect";

export function AuthPage() {
  const { t } = useTranslation();
  const { authenticate, authenticateGoogle, authenticateFacebook, startDemo } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authenticate(mode, email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
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
          <p>
            {t("auth.description")}
          </p>
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
          <h2>{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h2>
          <p>
            {mode === "login"
              ? t("auth.loginDescription")
              : t("auth.registerDescription")}
          </p>
          <form onSubmit={submit} className="form-stack">
            <label className="field">
              <span>{t("auth.email")}</span>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  disabled={loading}
                />
              </div>
            </label>
            <label className="field">
              <span>{t("auth.password")}</span>
              <div className="input-with-icon">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordHint")}
                  dir="ltr"
                  disabled={loading}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary auth-submit" disabled={loading}>
              {loading && <LoaderCircle size={18} className="spin" />}
              {mode === "login" ? t("auth.loginSubmit") : t("auth.registerSubmit")}
              <ArrowLeft size={18} />
            </button>
          </form>
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
                {t("auth.demoSubmit")}<span>{t("auth.noRegistration")}</span>
              </button>
              <p className="auth-footnote">
                {t("auth.demoNote")}
              </p>
            </>
          )}
          <p className="auth-switch">
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              disabled={loading}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? t("auth.register") : t("auth.login")}
            </button>
          </p>
          <p className="auth-footnote">
            {t("auth.socialNote")}
          </p>
          <nav className="auth-legal-links" aria-label={t("auth.legalNavigation")}>
            <Link to="/terms-of-service">{t("auth.terms")}</Link>
            <Link to="/privacy-policy">{t("auth.privacy")}</Link>
            <Link to="/refund-policy">{t("auth.refunds")}</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
