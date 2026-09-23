import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "../config";
import { useTranslation } from "react-i18next";
import { normalizeUiLocale } from "../i18n";

interface Identity {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: Record<string, string | number>,
  ): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: Identity } };
  }
}
let loading: Promise<Identity> | undefined;
let currentCallback: ((token: string) => void) | undefined;
let initializedClient = "";
function loadGoogle(locale: string): Promise<Identity> {
  if (window.google?.accounts.id)
    return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<Identity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(locale)}`;
    script.async = true;
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error("GOOGLE_LOAD_TIMEOUT"));
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.accounts.id) resolve(window.google.accounts.id);
      else reject(new Error("GOOGLE_UNAVAILABLE"));
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error("GOOGLE_LOAD_FAILED"));
    };
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
export function GoogleSignIn({
  onCredential,
  disabled,
}: {
  onCredential: (token: string) => void;
  disabled: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizeUiLocale(i18n.resolvedLanguage) ?? "en";
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const busy = useRef(disabled);
  busy.current = disabled;
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const handler = (token: string) => {
      if (!cancelled && !busy.current) callback.current(token);
    };
    void loadGoogle(locale)
      .then((identity) => {
        if (cancelled || !ref.current) return;
        currentCallback = handler;
        if (initializedClient !== clientId) {
          identity.initialize({
            client_id: clientId,
            auto_select: false,
            callback: (response) => {
              if (
                typeof response.credential === "string" &&
                response.credential
              )
                currentCallback?.(response.credential);
            },
          });
          initializedClient = clientId;
        }
        ref.current.replaceChildren();
        identity.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale,
          width: 320,
        });
        setError("");
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error && reason.message === "GOOGLE_LOAD_TIMEOUT"
              ? t("google.timeout")
              : reason instanceof Error && reason.message === "GOOGLE_LOAD_FAILED"
                ? t("google.loadFailed")
                : t("google.unavailable"),
          );
      });
    return () => {
      cancelled = true;
      if (currentCallback === handler) currentCallback = undefined;
    };
  }, [clientId, locale, retry, t]);
  if (!clientId)
    return (
      <p className="auth-footnote">{t("google.notConfigured")}</p>
    );
  return (
    <div className="google-signin">
      <div ref={ref} aria-label={t("google.ariaLabel")} inert={disabled} />
      {error && (
        <p role="alert" className="form-error">
          {error}
          <button
            type="button"
            className="button ghost"
            onClick={() => setRetry((n) => n + 1)}
          >
            {t("google.retry")}
          </button>
        </p>
      )}
    </div>
  );
}
