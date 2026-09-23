/* eslint-disable react-refresh/only-export-components */
import {
  CircleAlert,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";

type ToastTone = "success" | "info" | "error";
type ConfirmTone = "warning" | "danger";

type ToastOptions = {
  tone?: ToastTone;
  duration?: number;
};

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ToastItem = Required<Pick<ToastOptions, "tone">> & {
  id: number;
  message: string;
};

type Confirmation = ConfirmOptions & {
  resolve: (approved: boolean) => void;
};

type FeedbackContextValue = {
  toast: (message: string, options?: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastIcons: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  error: CircleAlert,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const confirmationRef = useRef<Confirmation | undefined>(undefined);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++nextId.current;
      const duration = options.duration ?? 4500;
      setToasts((current) => [
        ...current.slice(-3),
        { id, message, tone: options.tone ?? "info" },
      ]);
      if (duration > 0)
        timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        confirmationRef.current?.resolve(false);
        const next = { ...options, resolve };
        confirmationRef.current = next;
        setConfirmation(next);
      }),
    [],
  );

  const settleConfirmation = useCallback((approved: boolean) => {
    const current = confirmationRef.current;
    if (!current) return;
    confirmationRef.current = undefined;
    setConfirmation(undefined);
    current.resolve(approved);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      confirmationRef.current?.resolve(false);
      confirmationRef.current = undefined;
    },
    [],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-label={t("feedback.notifications")}>
        {toasts.map((item) => {
          const Icon = toastIcons[item.tone];
          return (
            <div
              className={`toast toast-${item.tone}`}
              role={item.tone === "error" ? "alert" : "status"}
              key={item.id}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.message}</span>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={t("feedback.closeNotification")}
              >
                <X size={17} />
              </button>
            </div>
          );
        })}
      </div>
      <Modal
        open={Boolean(confirmation)}
        onClose={() => settleConfirmation(false)}
        title={confirmation?.title || t("feedback.confirmTitle")}
        size="sm"
      >
        {confirmation && (
          <div className="modal-body confirmation-dialog">
            <div
              className={`confirmation-icon confirmation-${confirmation.tone ?? "warning"}`}
              aria-hidden="true"
            >
              <CircleAlert size={24} />
            </div>
            <p>{confirmation.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => settleConfirmation(false)}
              >
                {confirmation.cancelLabel || t("feedback.cancel")}
              </button>
              <button
                type="button"
                className={`button ${confirmation.tone === "danger" ? "danger" : "primary"}`}
                onClick={() => settleConfirmation(true)}
              >
                {confirmation.confirmLabel || t("feedback.confirm")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value)
    throw new Error("useFeedback must be used within FeedbackProvider");
  return value;
}
