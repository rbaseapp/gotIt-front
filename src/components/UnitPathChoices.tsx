import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  chooseUnitPath,
  homeworkTaskLink,
  type UnitLearningPath,
} from "../lib/unitLearningPath";
import { errorMessage } from "../lib/product";
import { ApiError } from "../lib/api";
import { LearningPathControls } from "./LearningPathControls";

export function UnitPathChoices({
  path,
  stationUrl,
  onChanged,
}: {
  path: UnitLearningPath;
  stationUrl: (station: string) => string;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const pending = useRef<{ key: string; eventId: string } | null>(null);
  const choices = path.steps ?? [];
  if (!choices.length) return null;
  const returnTo = `/english-learning?unit=${path.packId}`;
  async function choose(skipped: boolean, step?: string) {
    if (lock.current) return;
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
  return (
    <LearningPathControls
      title={t("pathChoices.chooseStep")}
      busy={busy}
      error={error}
      onChoice={choose}
      items={choices.map((step) => {
        const station = path.stations.find(
          (item) => item.station === step.station,
        );
        return {
          key: step.key,
          title: `${t(`pathUi.${step.station}`)} · ${t(`pathChoices.${step.kind}`)}`,
          complete: step.complete,
          skipped: step.skipped,
          href:
            step.kind === "meeting"
              ? stationUrl(step.station)
              : step.kind === "words"
                ? `${returnTo}&tab=words&station=${step.station}`
                : step.homeworkId && step.available
                  ? homeworkTaskLink(
                      step.homeworkId,
                      undefined,
                      step.complete,
                      returnTo,
                    )
                  : undefined,
          unavailable:
            step.kind === "homework"
              ? t("unitMap.practiceAfterMeeting")
              : undefined,
          recommendation:
            step.kind === "meeting" && station
              ? t("pathChoices.wordsRecommended", {
                  count: station.requiredWords,
                })
              : undefined,
        };
      })}
    />
  );
}
