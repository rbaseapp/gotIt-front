import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../lib/api";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";
export function EmailAuthForm({
  authenticate,
  onBusy,
}: {
  authenticate: (
    mode: "login" | "register",
    email: string,
    password: string,
  ) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const initial = new URLSearchParams(window.location.search).get("auth");
  const [mode, setMode] = useState<Mode>(
    initial === "register"
      ? "register"
      : initial === "reset"
        ? "forgot"
        : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const completing = mode === "verify" || mode === "reset";
  useEffect(() => {
    heading.current?.focus();
  }, [mode]);
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
    setConfirm("");
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
      if (completing) {
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
        setCooldown(result.retryAfter);
        setNotice(t("auth.emailCodeRequested"));
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
          await requestCode("verify");
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
            ? "auth.codeInstructions"
            : mode === "forgot"
              ? "auth.forgotInstructions"
              : mode === "login"
                ? "auth.loginDescription"
                : "auth.registerDescription",
        )}
      </p>
      <form onSubmit={submit} className="form-stack" aria-busy={busy}>
        <label className="field">
          <span>{t("auth.email")}</span>
          <input
            type="email"
            autoComplete="email"
            maxLength={320}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            dir="ltr"
            disabled={busy || completing}
          />
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
              dir="ltr"
              disabled={busy}
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="field">
            <span>{t(completing ? "auth.newPassword" : "auth.password")}</span>
            <input
              type="password"
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
          </label>
        )}
        {completing && (
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
            className="button"
            disabled={busy}
            onClick={() => changeMode("forgot")}
          >
            {t("auth.forgotPassword")}
          </button>
        )}
      </form>
      <p className="auth-switch">
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
