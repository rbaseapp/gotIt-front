import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FACEBOOK_APP_ID } from "../config";

interface FacebookAuthResponse {
  accessToken?: string;
}

interface FacebookLoginResponse {
  authResponse?: FacebookAuthResponse;
  status?: string;
}

interface FacebookSdk {
  // Meta's bootstrap exposes queued methods before the actual SDK is ready.
  __buffer?: unknown;
  init(options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: { scope: string; return_scopes: boolean },
  ): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let loading: Promise<FacebookSdk> | undefined;
let initializedAppId = "";
let initializedSdk: FacebookSdk | undefined;
const LOGIN_TIMEOUT_MS = 60_000;

function sdkLocale(language?: string): string {
  const locales: Record<string, string> = {
    ar: "ar_AR",
    de: "de_DE",
    es: "es_ES",
    fr: "fr_FR",
    he: "he_IL",
    ru: "ru_RU",
    zh: "zh_CN",
  };
  return locales[language?.toLowerCase().split("-")[0] ?? ""] ?? "en_US";
}

function loadFacebook(locale: string): Promise<FacebookSdk> {
  if (window.FB && !window.FB.__buffer) return Promise.resolve(window.FB);
  if (loading) return loading;
  loading = new Promise<FacebookSdk>((resolve, reject) => {
    const previousInit = window.fbAsyncInit;
    const script = document.createElement("script");
    script.src = `https://connect.facebook.net/${locale}/sdk.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    const cleanup = () => {
      window.clearTimeout(timer);
      if (window.fbAsyncInit === onReady) window.fbAsyncInit = previousInit;
    };
    const fail = (code: string) => {
      cleanup();
      script.remove();
      if (window.FB?.__buffer) {
        // The bootstrap would otherwise refuse to load again on retry.
        delete window.FB;
        document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((candidate) => {
          if (candidate.src === `https://connect.facebook.net/${locale}/bundle/sdk.js/`)
            candidate.remove();
        });
      }
      reject(new Error(code));
    };
    const onReady = () => {
      const readySdk = window.FB;
      if (!readySdk || readySdk.__buffer) return;
      cleanup();
      resolve(readySdk);
      previousInit?.();
    };
    window.fbAsyncInit = onReady;
    const timer = window.setTimeout(() => {
      fail("FACEBOOK_LOAD_TIMEOUT");
    }, 15_000);
    script.onerror = () => {
      fail("FACEBOOK_LOAD_FAILED");
    };
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export function FacebookSignIn({
  onCredential,
  disabled,
}: {
  onCredential: (accessToken: string) => void;
  disabled: boolean;
}) {
  const { t, i18n } = useTranslation();
  const mounted = useRef(true);
  const loginTimer = useRef<number | undefined>(undefined);
  const loginAttempt = useRef(0);
  const [sdk, setSdk] = useState<FacebookSdk | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID || FACEBOOK_APP_ID;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loginAttempt.current += 1;
      window.clearTimeout(loginTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    setSdk(null);
    setError("");
    void loadFacebook(sdkLocale(i18n.resolvedLanguage))
      .then((loadedSdk) => {
        if (cancelled) return;
        if (initializedAppId !== appId || initializedSdk !== loadedSdk) {
          loadedSdk.init({
            appId,
            cookie: false,
            xfbml: false,
            version: "v26.0",
          });
          initializedAppId = appId;
          initializedSdk = loadedSdk;
        }
        setSdk(loadedSdk);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(
          reason instanceof Error && reason.message === "FACEBOOK_LOAD_TIMEOUT"
            ? t("facebook.timeout")
            : reason instanceof Error && reason.message === "FACEBOOK_LOAD_FAILED"
              ? t("facebook.loadFailed")
              : t("facebook.unavailable"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [appId, i18n.resolvedLanguage, retry, t]);

  if (!appId) return <p className="auth-footnote">{t("facebook.notConfigured")}</p>;

  const signIn = () => {
    if (disabled || busy || !sdk) return;
    setBusy(true);
    setError("");
    const attempt = ++loginAttempt.current;
    loginTimer.current = window.setTimeout(() => {
      if (!mounted.current || loginAttempt.current !== attempt) return;
      loginAttempt.current += 1;
      loginTimer.current = undefined;
      setBusy(false);
      setError(t("facebook.loginTimeout"));
    }, LOGIN_TIMEOUT_MS);
    try {
      sdk.login(
        (response) => {
          if (!mounted.current || loginAttempt.current !== attempt) return;
          window.clearTimeout(loginTimer.current);
          loginTimer.current = undefined;
          loginAttempt.current += 1;
          setBusy(false);
          const token = response.authResponse?.accessToken;
          if (response.status === "connected" && token) onCredential(token);
          else setError(t("facebook.cancelled"));
        },
        { scope: "public_profile,email", return_scopes: true },
      );
    } catch {
      if (!mounted.current || loginAttempt.current !== attempt) return;
      window.clearTimeout(loginTimer.current);
      loginTimer.current = undefined;
      loginAttempt.current += 1;
      setBusy(false);
      setError(t("facebook.unavailable"));
    }
  };

  return (
    <div className="facebook-signin">
      <button
        type="button"
        className="button facebook-button"
        disabled={disabled || busy || !sdk}
        onClick={signIn}
      >
        {busy ? <LoaderCircle size={18} className="spin" /> : <span aria-hidden="true">f</span>}
        {t("facebook.continue")}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
          {!sdk && (
            <button
              type="button"
              className="button ghost"
              onClick={() => setRetry((value) => value + 1)}
            >
              {t("facebook.retry")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
