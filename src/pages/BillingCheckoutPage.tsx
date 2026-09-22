import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

declare global {
  interface Window { Paddle?: { Environment: { set(value: "sandbox"): void }; Initialize(input: { token: string }): void }; }
}

export function BillingCheckoutPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const runtime = await fetch("/runtime-config", { signal: AbortSignal.timeout(5000) })
        .then((response) => response.ok ? response.json() : undefined).catch(() => undefined) as
        | { paddleClientToken?: string; paddleEnvironment?: string } | undefined;
      if (cancelled) return;
      const token = runtime?.paddleClientToken || import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
      const environment = runtime?.paddleEnvironment || import.meta.env.VITE_PADDLE_ENVIRONMENT;
      if (!token) { setError("Paddle עדיין אינו מוגדר בסביבה הזו."); return; }
      const initialize = () => {
        if (environment === "sandbox") window.Paddle?.Environment.set("sandbox");
        window.Paddle?.Initialize({ token });
      };
      const existing = document.querySelector<HTMLScriptElement>('script[data-paddle-js]');
      if (existing) {
        if (window.Paddle) initialize(); else existing.addEventListener("load", initialize, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.dataset.paddleJs = "true";
      script.addEventListener("load", initialize, { once: true });
      script.addEventListener("error", () => setError("לא ניתן לטעון את חלון התשלום."), { once: true });
      document.head.append(script);
    };
    void load();
    return () => { cancelled = true; };
  }, []);
  return <div className="capability-notice">
    {error ? <><h1>התשלום אינו זמין</h1><p className="form-error">{error}</p></> : <><LoaderCircle className="spin" size={30} /><h1>פותחים תשלום מאובטח…</h1><p>חלון התשלום של Paddle ייפתח מיד.</p></>}
    <Link className="button secondary" to="/billing">חזרה לעמוד המנוי</Link>
  </div>;
}
