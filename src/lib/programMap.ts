import type { WordPack } from "./product";
import type { UnitLearningPath } from "./unitLearningPath";

export type MapStep = {
  skipped?: boolean;
  id: string;
  number: number;
  kind: "words" | "meeting" | "homework";
  station: UnitLearningPath["stations"][number];
  from: number;
  to: number;
  complete: boolean;
  available: boolean;
};

/** Additional authored content uses the same roadmap presentation and controls. */
export type ProgramActivityStep = {
  skipped?: boolean;
  id: string;
  number: number;
  kind: "activity";
  title: string;
  description: string;
  complete: boolean;
  available: boolean;
  lockReason?: string;
  minutes?: number;
  icon?: "meeting";
  onOpen: () => void;
};
export type ProgramMapStep = MapStep | ProgramActivityStep;
export type ProgramMapModel = {
  steps: ProgramMapStep[];
  active?: ProgramMapStep;
  completed: number;
  prefix: ProgramMapStep[];
  introduced: number;
  percent: number;
};

export function programUnitTitle(title: string) {
  return title.replace(/^(?:יחידה|Unit)\s*\d+\s*[:·–-]\s*/iu, "").trim();
}

/** A navigation projection of server evidence, never a learning score. */
export function programMapModel(pack: WordPack, path: UnitLearningPath) {
  const introduced = Math.min(pack.wordCount, pack.progress.introduced ?? 0);
  const steps: MapStep[] = [];
  let previousWords = 0;
  path.stations.forEach((station, index) => {
    const from = previousWords + 1;
    const to = station.requiredWords;
    steps.push({
      id: `${station.station}-words`,
      number: steps.length + 1,
      kind: "words",
      station,
      from,
      to,
      complete: introduced >= to,
      available: index === 0 || path.stations[index - 1].preparationComplete,
    });
    steps.push({
      id: `${station.station}-meeting`,
      number: steps.length + 1,
      kind: "meeting",
      station,
      from,
      to,
      complete: station.meetingCompleted,
      available: station.available,
    });
    steps.push({
      id: `${station.station}-homework`,
      number: steps.length + 1,
      kind: "homework",
      station,
      from,
      to,
      complete: station.meetingCompleted && station.preparationComplete,
      available: station.meetingCompleted && Boolean(station.homework),
    });
    previousWords = to;
  });
  // Current servers supply navigation separately from learning evidence.
  for (const step of steps) {
    const navigation = path.steps?.find(
      (item) =>
        item.station === step.station.station && item.kind === step.kind,
    );
    if (navigation) {
      step.complete = navigation.complete;
      step.available = navigation.available;
      step.skipped = navigation.skipped;
    }
  }
  const active = path.navigationComplete
    ? undefined
    : (steps.find(
        (step) =>
          !step.complete &&
          !step.skipped &&
          step.kind === path.nextAction.kind &&
          (step.kind === "words" ||
            step.station.station === path.nextAction.station),
      ) ?? steps.find((step) => !step.complete && !step.skipped));
  const completed = steps.filter((step) => step.complete).length;
  const prefix: MapStep[] = [];
  for (const step of steps) {
    if (!step.complete) break;
    prefix.push(step);
  }
  return {
    steps,
    active,
    completed,
    prefix,
    introduced,
    percent: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
}
