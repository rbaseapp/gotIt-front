import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import {
  checkoutSuccessUrl,
  getPaddleRuntime,
  transactionIdFromCheckoutUrl,
} from "../lib/paddle";
import { useTranslation } from "react-i18next";

type CheckoutState = "loading" | "ready" | "missing" | "error";

export function BillingCheckoutPage() {
  const { t } = useTranslation();
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
        reason instanceof Error ? reason.message : t("checkout.invalidLink"),
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
            : t("checkout.loadFailed"),
        );
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
          : t("checkout.openFailed"),
      );
      setState("error");
    }
  }

  return (
    <div className="capability-notice">
      {state === "error" ? (
        <>
          <h1>{t("checkout.unavailable")}</h1>
          <p className="form-error">{error}</p>
          {transactionId ? (
            <button
              className="button primary"
              type="button"
              onClick={() => void reopenCheckout()}
            >
              {t("common.tryAgain")}
            </button>
          ) : null}
        </>
      ) : state === "missing" ? (
        <>
          <h1>{t("checkout.missingTitle")}</h1>
          <p>{t("checkout.missingDescription")}</p>
        </>
      ) : state === "ready" ? (
        <>
          <h1>{t("checkout.readyTitle")}</h1>
          <p>{t("checkout.readyDescription")}</p>
          <button
            className="button primary"
            type="button"
            onClick={() => void reopenCheckout()}
          >
            {t("checkout.open")}
          </button>
        </>
      ) : (
        <>
          <LoaderCircle className="spin" size={30} />
          <h1>{t("checkout.loadingTitle")}</h1>
          <p>{t("checkout.loadingDescription")}</p>
        </>
      )}
      <Link className="button secondary" to="/billing">
        {t("checkout.back")}
      </Link>
    </div>
  );
}
