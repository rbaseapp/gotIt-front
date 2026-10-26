import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../lib/api";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";
export function EmailAuthForm({
  authenticate,
  onBusy,
  children,
  startingMode,
  initialEmail = "",
}: {
  authenticate: (
    mode: "login" | "register",
    email: string,
    password: string,
  ) => Promise<void>;
  onBusy: (busy: boolean) => void;
  children?: ReactNode;
  startingMode?: Mode;
  initialEmail?: string;
}) {
  const { t } = useTranslation();
  const initial = new URLSearchParams(window.location.search).get("auth");
  const [mode, setMode] = useState<Mode>(
    startingMode ??
      (initial === "register"
        ? "register"
        : initial === "reset"
          ? "forgot"
          : "login"),
  );
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  // The password typed once at registration, kept in memory only so the verification step
  // asks for the code alone and then signs the learner in.
  const [remembered, setRemembered] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const completing = mode === "verify" || mode === "reset";
  const codeOnly = mode === "verify" && remembered !== null;
  useEffect(() => {
    heading.current?.focus();
  }, [mode]);
  // With nothing else to type, a full code submits itself.
  useEffect(() => {
    if (codeOnly && code.length === 6) formRef.current?.requestSubmit();
  }, [codeOnly, code]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
    setCode("");
    setPassword("");
    setShowPassword(false);
    setConfirm("");
    setRemembered(null);
  };
  const requestCode = async (purpose: "verify" | "reset") => {
    const result = await api.requestEmailCode(email, purpose);
    setCooldown(result.retryAfter);
    setNotice(t("auth.emailCodeRequested"));
    setCode("");
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("auth.genericError"),
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (codeOnly) {
        await api.completeEmailCode(email, code, remembered, "verify");
        try {
          await authenticate("login", email, remembered);
        } catch {
          changeMode("login");
          setNotice(t("auth.emailVerified"));
        }
      } else if (completing) {
        if (password !== confirm) {
          setError(t("auth.passwordMismatch"));
          return;
        }
        await api.completeEmailCode(
          email,
          code,
          password,
          mode === "verify" ? "verify" : "reset",
        );
        changeMode("login");
        setNotice(
          t(mode === "verify" ? "auth.emailVerified" : "auth.passwordReset"),
        );
      } else if (mode === "register") {
        const result = await api.registerEmail(email, password);
        // Local development: the Core hands the code back, so there is no mail to wait for.
        if (import.meta.env.DEV && result.devCode) {
          await api.completeEmailCode(
            email,
            result.devCode,
            password,
            "verify",
          );
          await authenticate("login", email, password);
          return;
        }
        setCooldown(result.retryAfter);
        setNotice(t("auth.emailCodeRequested"));
        setRemembered(password);
        setPassword("");
        setMode("verify");
      } else if (mode === "forgot") {
        await requestCode("reset");
        setMode("reset");
      } else {
        try {
          await authenticate("login", email, password);
        } catch (reason) {
          if (
            !(reason instanceof ApiError) ||
            reason.code !== "EMAIL_VERIFICATION_REQUIRED"
          )
            throw reason;
          const again = await api.requestEmailCode(email, "verify");
          if (import.meta.env.DEV && again.devCode) {
            await api.completeEmailCode(
              email,
              again.devCode,
              password,
              "verify",
            );
            await authenticate("login", email, password);
            return;
          }
          setCooldown(again.retryAfter);
          setNotice(t("auth.emailCodeRequested"));
          setCode("");
          setMode("verify");
          setPassword("");
        }
      }
    });
  };
  const title =
    mode === "login"
      ? "loginTitle"
      : mode === "register"
        ? "registerTitle"
        : mode === "verify"
          ? "verifyTitle"
          : "resetTitle";
  return (
    <div className="email-auth-flow" data-auth-state={mode}>
      <h2 ref={heading} tabIndex={-1}>
        {t(`auth.${title}`)}
      </h2>
      <p>
        {t(
          completing
            ? codeOnly
              ? "start.codeOnly"
              : "auth.codeInstructions"
            : mode === "forgot"
              ? "auth.forgotInstructions"
              : mode === "login"
                ? "auth.loginDescription"
                : "auth.registerDescription",
        )}
      </p>
      <form
        ref={formRef}
        onSubmit={submit}
        className="form-stack"
        aria-busy={busy}
      >
        <label className="field">
          <span>{t("auth.email")}</span>
          <div className="input-with-icon">
            <Mail size={18} aria-hidden="true" />
            <input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              maxLength={320}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              dir="ltr"
              disabled={busy || completing}
            />
          </div>
        </label>
        {completing && (
          <label className="field">
            <span>{t("auth.emailCode")}</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              className="otp-input"
              dir="ltr"
              disabled={busy}
              autoFocus={codeOnly}
            />
          </label>
        )}
        {mode !== "forgot" && !codeOnly && (
          <label className="field">
            <span>{t(completing ? "auth.newPassword" : "auth.password")}</span>
            <div className="input-with-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.passwordHint")}
                dir="ltr"
                disabled={busy}
              />
              <button
                type="button"
                disabled={busy}
                aria-label={t(
                  showPassword ? "auth.hidePassword" : "auth.showPassword",
                )}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
        )}
        {completing && !codeOnly && (
          <label className="field">
            <span>{t("auth.confirmPassword")}</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              dir="ltr"
              disabled={busy}
            />
          </label>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="button primary auth-submit" disabled={busy}>
          {busy && (
            <LoaderCircle size={18} className="spin" aria-hidden="true" />
          )}
          {t(
            busy
              ? "common.loading"
              : mode === "login"
                ? "auth.loginSubmit"
                : mode === "register"
                  ? "auth.registerSubmit"
                  : mode === "verify"
                    ? "auth.verifySubmit"
                    : mode === "reset"
                      ? "auth.resetSubmit"
                      : "auth.sendCode",
          )}
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        {completing && (
          <button
            type="button"
            className="button"
            disabled={busy || cooldown > 0}
            onClick={() =>
              void run(() =>
                requestCode(mode === "verify" ? "verify" : "reset"),
              )
            }
          >
            {cooldown
              ? t("auth.resendCountdown", { seconds: cooldown })
              : t("auth.resendCode")}
          </button>
        )}
        {mode === "login" && (
          <button
            type="button"
            className="button auth-forgot-password"
            disabled={busy}
            onClick={() => changeMode("forgot")}
          >
            {t("auth.forgotPassword")}
          </button>
        )}
      </form>
      {children}
      <p className="auth-switch">
        {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
        <button
          disabled={busy}
          onClick={() => changeMode(mode === "login" ? "register" : "login")}
        >
          {t(mode === "login" ? "auth.register" : "auth.backToLogin")}
        </button>
      </p>
    </div>
  );
}
