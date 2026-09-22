import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { getPaddleRuntime } from "../lib/paddle";

export function BillingCheckoutPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getPaddleRuntime().catch((reason: unknown) => {
      if (!cancelled)
        setError(
          reason instanceof Error
            ? reason.message
            : "לא ניתן לטעון את חלון התשלום.",
        );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="capability-notice">
      {error ? (
        <>
          <h1>התשלום אינו זמין</h1>
          <p className="form-error">{error}</p>
        </>
      ) : (
        <>
          <LoaderCircle className="spin" size={30} />
          <h1>פותחים תשלום מאובטח…</h1>
          <p>חלון התשלום של Paddle ייפתח מיד.</p>
        </>
      )}
      <Link className="button secondary" to="/billing">
        חזרה לעמוד המנוי
      </Link>
    </div>
  );
}
