import { useRef, useState } from "react";
import { chooseUnitPath, type UnitLearningPath } from "../lib/unitLearningPath";
import { errorMessage } from "../lib/product";
import { ApiError } from "../lib/api";
import type { PathChoiceControl } from "./LearningPathControls";

export function useUnitPathChoices(
  path?: UnitLearningPath,
  onChanged?: () => Promise<void>,
): PathChoiceControl | undefined {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const pending = useRef<{ key: string; eventId: string } | null>(null);
  async function choose(skipped: boolean, step?: string) {
    if (lock.current || !path || !onChanged) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const revision = path.navigationRevision ?? -1;
    const key = JSON.stringify([path.packId, revision, skipped, step]);
    if (pending.current?.key !== key)
      pending.current = { key, eventId: crypto.randomUUID() };
    try {
      await chooseUnitPath(path.packId, {
        revision,
        eventId: pending.current.eventId,
        skipped,
        ...(step ? { step } : {}),
      });
      pending.current = null;
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) await onChanged();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return path?.steps?.length && onChanged
    ? { busy, error, onChoice: choose }
    : undefined;
}
