import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import {
  checkoutSuccessUrl,
  getPaddleRuntime,
  transactionIdFromCheckoutUrl,
} from "../lib/paddle";

type CheckoutState = "loading" | "ready" | "missing" | "error";

export function BillingCheckoutPage() {
  const [state, setState] = useState<CheckoutState>("loading");
  const [error, setError] = useState("");
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const paymentLink = new URL(window.location.href);
    if (!paymentLink.searchParams.has("_ptxn")) {
      setState("missing");
      return () => {
        cancelled = true;
      };
    }

    let parsedTransactionId: string;
    try {
      parsedTransactionId = transactionIdFromCheckoutUrl(
        paymentLink.toString(),
      );
      setTransactionId(parsedTransactionId);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "קישור התשלום אינו תקין.",
      );
      setState("error");
      return () => {
        cancelled = true;
      };
    }

    void getPaddleRuntime()
      .then(() => {
        if (!cancelled) setState("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "לא ניתן לטעון את חלון התשלום.",
        );
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reopenCheckout() {
    if (!transactionId) return;
    setState("loading");
    setError("");
    try {
      const { paddle } = await getPaddleRuntime();
      paddle.Checkout.open({
        transactionId,
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: checkoutSuccessUrl(),
        },
      });
      setState("ready");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "לא ניתן לפתוח את חלון התשלום.",
      );
      setState("error");
    }
  }

  return (
    <div className="capability-notice">
      {state === "error" ? (
        <>
          <h1>התשלום אינו זמין</h1>
          <p className="form-error">{error}</p>
          {transactionId ? (
            <button
              className="button primary"
              type="button"
              onClick={() => void reopenCheckout()}
            >
              ניסיון נוסף
            </button>
          ) : null}
        </>
      ) : state === "missing" ? (
        <>
          <h1>לא נמצא תשלום לפתיחה</h1>
          <p>
            זהו עמוד הבסיס של Paddle. קישור תשלום תקין כולל מזהה עסקה ייחודי.
            כדי להתחיל רכישה, חזרו לעמוד המנוי ובחרו תוכנית.
          </p>
        </>
      ) : state === "ready" ? (
        <>
          <h1>חלון התשלום מוכן</h1>
          <p>
            Paddle אמור להיפתח מעל עמוד זה. אם החלון לא הופיע או נסגר, אפשר
            לפתוח אותו שוב.
          </p>
          <button
            className="button primary"
            type="button"
            onClick={() => void reopenCheckout()}
          >
            פתיחת חלון התשלום
          </button>
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
