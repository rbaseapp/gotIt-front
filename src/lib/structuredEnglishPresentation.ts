import type { Curriculum, CurriculumUnit } from "./structuredEnglish";
import type { WordPack, WordPackEntry } from "./product";
import type { ProgramActivityStep, ProgramMapModel } from "./programMap";

/** Display adapters only: these identifiers must never be sent to word-pack APIs. */
export function curriculumDisplayPacks(data: Curriculum): WordPack[] {
  return data.units.map((unit, index) => {
    const done = Boolean(data.completed[`gate:${unit.id}`]);
    const levelCode = ["Pre-A1", "A1", "A2"].includes(unit.band)
      ? "beginner"
      : unit.band === "C1"
        ? "advanced"
        : "intermediate";
    const cefr = unit.band === "Pre-A1" ? "A1" : unit.band;
    return {
      id: unit.id,
      slug: unit.id,
      title: `${unit.band} · ${unit.title}`,
      description: unit.goal,
      moduleNumber: index + 1,
      version: 1,
      wordCount: unit.words,
      installed: false,
      installedVersion: null,
      topic: {
        id: data.program.id,
        slug: "english-learning-path-en-he",
        title: data.program.title,
      },
      track: {
        id: levelCode,
        slug: levelCode,
        title: unit.band,
        levelCode,
        cefrFrom: cefr,
        cefrTo: cefr,
        sourceLanguageCode: "en",
        translationLanguageCode: "he",
      },
      progress: {
        linked: 0,
        new: unit.words,
        learning: 0,
        reviewing: 0,
        mastered: 0,
        completed: done ? unit.words : 0,
        unitCompleted: done,
        pathSkipped: unit.skipped,
        due: 0,
      },
    };
  });
}

export function curriculumDisplayEntries(
  unit: CurriculumUnit,
): WordPackEntry[] {
  return unit.words.map((word) => ({
    id: word.id,
    sourceText: word.en,
    translationText: word.he,
    itemType: "word",
    partOfSpeech: null,
    learningItemId: null,
    excludedAt: null,
    known: Boolean(word.evidence),
    learned: ["usable", "retained", "maintenance"].includes(
      word.evidence?.status ?? "",
    ),
    exampleText:
      unit.dialogue.find((turn) =>
        turn.text_en.toLowerCase().includes(word.en.toLowerCase()),
      )?.text_en ?? null,
  }));
}

export function curriculumRoadmap(
  data: Curriculum,
  unit: CurriculumUnit,
  label: (key: string, values?: Record<string, unknown>) => string,
  onOpen: (activity: string, batch?: number) => void,
): ProgramMapModel {
  const steps: ProgramActivityStep[] = [];
  const done = (id: string) => Boolean(data.completed[id]);
  const introduced = unit.words.filter((word) => word.evidence).length;
  const add = (
    id: string,
    title: string,
    complete: boolean,
    available: boolean,
    options: Partial<ProgramActivityStep> = {},
  ) =>
    steps.push({
      id,
      title,
      kind: "activity",
      number: steps.length + 1,
      complete,
      available,
      description: complete
        ? label("unitMap.completed")
        : label("programMap.wordsHelp"),
      onOpen: () => onOpen(id),
      ...options,
    });
  unit.lessons.forEach((lesson, index) => {
    const targets = lesson.targets;
    const exposed = targets.every((target) =>
      unit.words.some((word) => word.en === target.en && word.evidence),
    );
    const prior = index === 0 || done(`post:${unit.lessons[index - 1].id}`);
    const batch = Math.max(
      0,
      Math.floor(
        unit.words.findIndex((word) => word.en === targets[0]?.en) / 6,
      ),
    );
    add(
      `introduce:${lesson.id}`,
      label("programMap.wordStage", {
        from: index * 6 + 1,
        to: index * 6 + targets.length,
      }),
      exposed,
      prior,
      { onOpen: () => onOpen(`words:${unit.id}`, batch) },
    );
    add(
      `teacher:${lesson.id}`,
      lesson.title,
      done(`teacher:${lesson.id}`),
      prior && exposed,
      {
        icon: "meeting",
        minutes: lesson.minutes,
        description: label("programMap.meetingHelp"),
        lockReason: label("c1.errors.CURRICULUM_WORDS_REQUIRED"),
      },
    );
    add(
      `post:${lesson.id}`,
      label("c1.postlesson"),
      done(`post:${lesson.id}`),
      done(`teacher:${lesson.id}`),
      { description: label("unitMap.followUpHelp") },
    );
  });
  if (unit.words.length > 12)
    add(
      `introduce:${unit.id}`,
      label("c1.studyWords"),
      introduced === unit.words.length,
      true,
      {
        onOpen: () =>
          onOpen(
            `words:${unit.id}`,
            Math.floor(
              Math.max(
                0,
                unit.words.findIndex((word) => !word.evidence),
              ) / 6,
            ),
          ),
      },
    );
  for (const game of unit.games.filter((item) => item.mode !== "matching"))
    add(
      `words:${unit.id}:${game.mode}`,
      label(`c1.games.${game.mode}`),
      game.practised >= unit.words.length,
      game.eligible > 0,
    );
  const index = data.units.findIndex((item) => item.id === unit.id);
  const count = index < 6 ? (index + 1) * 2 : index < 18 ? index + 7 : 0;
  const needsPhonics =
    data.settings?.literacy !== "independent" &&
    !data.placement.decoding?.independent;
  if (needsPhonics)
    for (const session of data.phonics.slice(0, count))
      add(
        `phonics:${session.id}`,
        session.title,
        done(`phonics:${session.id}`),
        session.unlocked,
        { minutes: session.minutes, description: label("c1.tabs.phonics") },
      );
  add(
    `text:${unit.id}`,
    label("c1.unitReading"),
    done(`text:${unit.id}`),
    true,
    { description: label("c1.comprehension") },
  );
  const gateReady =
    unit.lessons.every(
      (lesson) => done(`teacher:${lesson.id}`) && done(`post:${lesson.id}`),
    ) &&
    introduced === unit.words.length &&
    (!needsPhonics ||
      data.phonics.slice(0, count).every((item) => done(`phonics:${item.id}`)));
  add(
    `gate:${unit.id}`,
    label("c1.checkpoint"),
    done(`gate:${unit.id}`),
    gateReady,
    { description: label("c1.unitReading") },
  );
  const checkpoint = data.units.find((item) => item.id === unit.id)?.unseen;
  if (checkpoint)
    add(
      `unseen:${checkpoint}`,
      label("c1.unseen"),
      done(`unseen:${checkpoint}`),
      done(`gate:${unit.id}`),
    );
  if (unit.id === data.units.at(-1)?.id)
    for (const skill of data.graduation.skills)
      add(
        `exit:${skill}`,
        `${label("c1.finalAssessment")} · ${label(`c1.skills.${skill}`)}`,
        done(`exit:${skill}`),
        data.graduation.ready,
      );
  for (const step of steps) {
    step.skipped =
      !step.complete &&
      Boolean(
        data.pathChoices?.units.includes(unit.id) ||
        data.pathChoices?.activities.includes(step.id) ||
        (step.id.startsWith("post:") &&
          data.pathChoices?.activities.includes(
            `teacher:${step.id.slice(5)}`,
          ) &&
          !done(`teacher:${step.id.slice(5)}`)),
      );
    // All content can be selected. A postlesson still needs its actual teacher source.
    step.available =
      !step.id.startsWith("post:") || done(`teacher:${step.id.slice(5)}`);
    if (step.id.startsWith("post:"))
      step.lockReason = label("unitMap.practiceAfterMeeting");
  }
  const next = data.nextAction;
  const nextId =
    next?.kind === "words"
      ? next.game
        ? `words:${next.id}:${next.game}`
        : undefined
      : next?.kind === "teacher"
        ? `teacher:${next.id}`
        : next?.kind === "phonics"
          ? `phonics:${next.id}`
          : next?.id;
  const active =
    steps.find(
      (step) =>
        step.id === nextId && !step.complete && !step.skipped && step.available,
    ) ?? steps.find((step) => !step.complete && !step.skipped);
  const prefix: ProgramActivityStep[] = [];
  for (const step of steps) {
    if (!step.complete) break;
    prefix.push(step);
  }
  const completed = steps.filter((step) => step.complete).length;
  return {
    steps,
    active,
    prefix,
    completed,
    introduced,
    percent: Math.round((completed / Math.max(1, steps.length)) * 100),
  };
}
