import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LearningStatusPublisher,
  LearningStatusSnapshot,
} from "../context/LearningStatusContext";
import {
  LearningStatusBar,
  type LearningStatusBarProps,
} from "./LearningStatusBar";

/** Retains the last server metrics for the active language during page handoffs. */
export function LearningStatusProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<LearningStatusBarProps | null>(null);
  const activeSource = useRef<string | null>(null);
  const publish = useCallback(
    (source: string, next: LearningStatusBarProps) => {
      activeSource.current = source;
      setStatus((previous) => {
        const sameLanguage = previous?.language.value === next.language.value;
        return {
          ...next,
          goal: next.goal ?? (sameLanguage ? previous?.goal : undefined),
          streakDays:
            next.streakDays ??
            (sameLanguage ? previous?.streakDays : undefined),
        };
      });
    },
    [],
  );
  const release = useCallback((source: string) => {
    if (activeSource.current !== source) return;
    activeSource.current = null;
    // Keep the display mounted, but never invoke an unmounted page's callback.
    setStatus((previous) =>
      previous
        ? { ...previous, language: { ...previous.language, disabled: true } }
        : previous,
    );
  }, []);
  const publisher = useMemo(() => ({ publish, release }), [publish, release]);
  return (
    <LearningStatusPublisher.Provider value={enabled ? publisher : null}>
      <LearningStatusSnapshot.Provider value={status}>
        {children}
      </LearningStatusSnapshot.Provider>
    </LearningStatusPublisher.Provider>
  );
}

export function PersistentLearningStatusBar() {
  const status = useContext(LearningStatusSnapshot);
  return status ? <LearningStatusBar {...status} /> : null;
}
