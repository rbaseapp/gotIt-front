import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { billing, type BillingStatus } from "../lib/billing";
import i18n from "../i18n";

type SubscriptionContextValue = {
  status?: BillingStatus;
  loading: boolean;
  error: string;
  hasEntitlement: (entitlement: string) => boolean;
  reload: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

export function SubscriptionProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<BillingStatus>();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setStatus(await billing.status());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : i18n.t("subscription.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void reload();
    else {
      setStatus(undefined);
      setLoading(false);
      setError("");
    }
  }, [enabled, reload]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      status,
      loading,
      error,
      hasEntitlement: (entitlement) =>
        !enabled || !status || status.entitlements.includes(entitlement),
      reload,
    }),
    [enabled, error, loading, reload, status],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// The provider and its hook intentionally share the same private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value)
    throw new Error("useSubscription must be used inside SubscriptionProvider");
  return value;
}
