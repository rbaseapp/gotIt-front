import { useEffect, useEffectEvent, useRef, useState } from "react";
import { z } from "zod";
import { api, ApiError } from "../lib/api";
import { useApp } from "../context/AppContext";
import {
  product,
  capabilitiesSchema,
  sessionSchema,
  studyCardsSchema,
  exerciseSchema,
  attemptReceipt,
  intent,
  errorMessage,
  uuid,
  dashboardSchema,
  type Session,
  type StudyCard,
  type Exercise,
  type Intent,
} from "../lib/product";
import {
  checkpointKey,
  readFocusCheckpoint,
  focusSequence,
  focusSkills,
  exerciseTypeFor,
  outcomeFrom,
  reviewItems,
  solved,
  focusOutcomeSchema,
  matchingItemIds,
  type FocusMode,
  type FocusCheckpoint,
} from "../lib/focusPractice";
import { recordVoice } from "../lib/voice";
import { speak } from "../lib/utils";
import { curriculumApi } from "../lib/structuredEnglish";
import { useTranslation } from "react-i18next";

const detailSchema = sessionSchema.extend({
  attempts: z
    .array(
      z.object({
        id: uuid,
        learningItemId: uuid,
        exerciseType: z.string(),
        result: focusOutcomeSchema.shape.result,
        score: z.number().nullable(),
      }),
    )
    .optional(),
});
type Pending = Omit<Intent, "body"> & {
  body: Record<string, unknown>;
  path: string;
};

export function useFocusSession(
  type: string,
  params: URLSearchParams,
  language: string,
  onSession: (id: string) => void,
) {
  const { user } = useApp();
  const { t } = useTranslation();
  const [state, setState] = useState<FocusCheckpoint>();
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState("");
  useEffect(() => {
    if (!audioError) return;
    const timer = setTimeout(() => setAudioError(""), 3000);
    return () => clearTimeout(timer);
  }, [audioError]);
  const [recording, setRecording] = useState(false);
  const [microphoneConsented, setMicrophoneConsented] = useState(false);
  const [listeningSilent, setListeningSilent] = useState(false);
  const [pending, setPending] = useState<Pending>();
  const current = useRef(state);
  current.current = state;
  const alive = useRef(true);
  const lock = useRef(false);
  const booted = useRef(false);
  const creation = useRef<Intent | undefined>(undefined);
  const creationCacheKey = useRef<string | undefined>(undefined);
  const frozen = useRef<Pending | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const release = useRef<AbortController | undefined>(undefined);
  const audio = useRef<HTMLAudioElement | undefined>(undefined);
  const audioUrl = useRef<string | undefined>(undefined);
  const playbackVersion = useRef(0);
  const audioCache = useRef(new Map<string, Promise<Blob>>());
  const audioFor = (id: string) => {
    let cached = audioCache.current.get(id);
    if (!cached) {
      cached = api.audio(id).catch((reason) => {
        audioCache.current.delete(id);
        throw reason;
      });
      audioCache.current.set(id, cached);
    }
    return cached;
  };
  const shownAt = useRef(performance.now());
  const retryAction = useRef<(() => Promise<unknown>) | undefined>(undefined);
  const update = (fn: (value: FocusCheckpoint) => FocusCheckpoint) => {
    if (!alive.current || !current.current) return;
    const next = fn(current.current);
    current.current = next;
    setState(next);
    try {
      sessionStorage.setItem(
        checkpointKey(user!.id, next.sessionId),
        JSON.stringify(next),
      );
    } catch {
      /* Practice remains usable without storage. */
    }
  };
  const stopAudio = () => {
    playbackVersion.current++;
    audio.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = undefined;
    window.speechSynthesis?.cancel();
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
      stopAudio();
    };
  }, []);
  const active =
    state?.exercises.find((exercise) => exercise.id === state.activeId) ??
    state?.exercises[0];
  const mode = state?.sequence[state.stage];
  const curriculumUnit = params.get("curriculumUnit");
  useEffect(() => {
    if (!curriculumUnit || state?.session.status !== "active") return;
    const pulse = () => {
      if (document.visibilityState === "visible" && !lock.current)
        void curriculumApi.heartbeat(`unit:${curriculumUnit}`).catch(() => {});
    };
    pulse();
    const timer = window.setInterval(pulse, 20000);
    return () => window.clearInterval(timer);
  }, [curriculumUnit, state?.session.status]);

  const issue = async (
    value: FocusCheckpoint,
    allCards: StudyCard[],
    forceIds?: string[],
  ) => {
    const mode = value.sequence[value.stage];
    const done = new Set(
      value.outcomes
        .filter((outcome) => outcome.stage === value.stage)
        .map((outcome) => outcome.itemId),
    );
    const remaining = forceIds ?? [
      ...value.stageItems.filter((id) => !done.has(id)),
      ...(mode === "listening"
        ? (value.listeningRequeues ?? []).filter(
            (id) =>
              value.outcomes.filter(
                (outcome) =>
                  outcome.stage === value.stage && outcome.itemId === id,
              ).length < 2,
          )
        : []),
    ];
    if (!remaining.length) return { ...value, phase: "transition" as const };
    const boardCount =
      remaining.length > 4
        ? remaining.length === 5 || remaining.length === 6
          ? remaining.length - 3
          : 4
        : remaining.length;
    // Issue only the visible question (or visible matching board). Unseen questions
    // remain on the server-selected queue instead of expiring while the learner plays.
    const selected =
      mode === "matching"
        ? remaining.slice(0, boardCount)
        : remaining.slice(0, 1);
    // A real, owned extra meaning prevents the final pair becoming automatic.
    // All choices and their opaque ids still come from the exercise issuer.
    const extra =
      mode === "matching"
        ? matchingItemIds(allCards).find((id) => !selected.includes(id))
        : undefined;
    const requested = extra ? [...selected, extra] : selected;
    const result = await product(
      z.object({ exercises: z.array(exerciseSchema).min(1) }),
      `practice/sessions/${value.sessionId}/exercises`,
      "POST",
      {
        count: requested.length,
        learningItemIds: requested,
        exerciseType: exerciseTypeFor(mode),
        kind:
          mode === "matching" || mode === "drag_drop"
            ? "multiple_choice"
            : "typed",
        direction:
          mode === "matching" ||
          mode === "flashcards" ||
          mode === "pronunciation"
            ? "source_to_translation"
            : "translation_to_source",
      },
    );
    // All responses are bound to this session's actual selected language/items.
    if (
      result.exercises.some(
        (exercise) =>
          !allCards.some(
            (card) => card.learningItemId === exercise.learningItemId,
          ),
      )
    )
      throw new Error(t("game.languageMismatch"));
    const visible = selected
      .map((id) =>
        result.exercises.find((exercise) => exercise.learningItemId === id),
      )
      .filter((exercise): exercise is Exercise => !!exercise);
    if (visible.length !== selected.length)
      throw new Error(t("focusGames.unavailable"));
    for (const id of remaining.slice(0, selected.length + 1))
      if (allCards.find((card) => card.learningItemId === id)?.audioUrl)
        void audioFor(id).catch(() => {});
    return {
      ...value,
      exercises:
        mode === "flashcards"
          ? [
              ...value.exercises.filter((exercise) =>
                value.outcomes.some(
                  (outcome) => outcome.exerciseId === exercise.id,
                ),
              ),
              ...visible,
            ]
          : visible,
      activeId: visible[0].id,
      phase: "play" as const,
      answer: "",
      flipped: false,
      hintIds: [],
    };
  };
  const initialize = async () => {
    if (lock.current || !language || !user) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const resume = params.get("resume");
      let session: Session;
      let cached: FocusCheckpoint | undefined;
      let serverAttempts: z.infer<typeof detailSchema>["attempts"] = [];
      const capabilities = await product(capabilitiesSchema, "capabilities");
      const configuredLanguage = capabilities.learningLanguages.find(
        (item) => item.languageCode === language,
      );
      const preferences = configuredLanguage
        ? undefined
        : (await api.getProfile()).learningPreferences;
      const skills = focusSkills(capabilities, language, preferences);
      if (!capabilities.configured.practice)
        throw new Error(t("focusGames.unavailable"));
      if (
        !focusSequence(type, skills, capabilities.configured.speech, 2).length
      )
        throw new Error(t("focusGames.unavailable"));
      if (resume) {
        if (!uuid.safeParse(resume).success)
          throw new Error(t("game.invalidItems"));
        session = (
          await product(
            z.object({ session: detailSchema }),
            `practice/sessions/${resume}`,
          )
        ).session;
        serverAttempts =
          (session as z.infer<typeof detailSchema>).attempts ?? [];
        cached = readFocusCheckpoint(user.id, resume);
      } else {
        const items = params.get("items")?.split(",");
        const pack = params.get("pack");
        const curriculumUnit = params.get("curriculumUnit");
        if (
          (items &&
            (!items.length ||
              items.length > 100 ||
              items.some((id) => !uuid.safeParse(id).success))) ||
          (pack && !uuid.safeParse(pack).success) ||
          (curriculumUnit &&
            (items || pack || !/^[A-Z][A-Z0-9]{1,10}$/.test(curriculumUnit)))
        )
          throw new Error(t("game.invalidItems"));
        const requested = Number(params.get("count") || 10);
        const count =
          Number.isInteger(requested) && requested > 0
            ? Math.min(100, requested)
            : 10;
        creation.current ??= intent({
          sessionType:
            type === "smart"
              ? "smart_review"
              : exerciseTypeFor(type as FocusMode),
          count,
          sourceLanguageCode: language,
          ...(curriculumUnit ? { curriculumUnitId: curriculumUnit } : {}),
          ...(items ? { learningItemIds: items } : {}),
          ...(pack ? { scope: { type: "pack", id: pack } } : {}),
          ...(type === "smart"
            ? {
                includeNewItems: params.get("includeNew") !== "0",
                ...(pack ? { curriculumOrder: true } : {}),
              }
            : {}),
        });
        creationCacheKey.current = `gotit.focus.creation.v1:${user.id}:${type}:${JSON.stringify(creation.current.body)}`;
        try {
          const cachedIntent = z
            .object({ eventId: uuid, body: z.record(z.string(), z.unknown()) })
            .safeParse(
              JSON.parse(
                sessionStorage.getItem(creationCacheKey.current) || "null",
              ),
            );
          if (
            cachedIntent.success &&
            JSON.stringify(cachedIntent.data.body) ===
              JSON.stringify(creation.current.body)
          )
            creation.current = cachedIntent.data;
          sessionStorage.setItem(
            creationCacheKey.current,
            JSON.stringify(creation.current),
          );
        } catch {
          /* Keep in-memory intent when storage is unavailable. */
        }
        session = (
          await product(
            z.object({ session: sessionSchema }),
            "practice/sessions",
            "POST",
            creation.current.body,
            creation.current.eventId,
          )
        ).session;
      }
      if (
        params.has("curriculumUnit") &&
        session.curriculumUnitId !== params.get("curriculumUnit")
      )
        throw new Error(t("game.languageMismatch"));
      if (cached && (cached.type !== type || cached.language !== language))
        throw new Error(t("game.languageMismatch"));
      if (session.status !== "active") {
        if (alive.current) {
          const sequence = cached?.sequence ?? [
            type === "smart" ? "flashcards" : (type as FocusMode),
          ];
          const finished: FocusCheckpoint = cached
            ? { ...cached, session, phase: "end", pending: undefined }
            : {
                version: 1,
                type,
                language,
                sessionId: session.id,
                session,
                sequence,
                stage: 0,
                phase: "end",
                exercises: [],
                outcomes: [],
                stageItems: [],
                answer: "",
                flipped: false,
                hintIds: [],
              };
          current.current = finished;
          setState(finished);
          setCards(cached?.studyCards ?? []);
        }
        return;
      }
      const study = (
        await product(studyCardsSchema, `practice/sessions/${session.id}/study`)
      ).cards;
      if (study.some((card) => card.sourceLanguageCode !== language))
        throw new Error(t("game.languageMismatch"));
      const matchingIds = matchingItemIds(study);
      if (type === "matching" && matchingIds.length < 2)
        throw new Error(t("focusGames.unavailable"));
      let speakingPaused = false;
      try {
        speakingPaused =
          Number(
            sessionStorage.getItem(`gotit.focus.speakingPause:${user.id}`) ?? 0,
          ) > Date.now();
      } catch {
        /* Storage is optional. */
      }
      const sequence =
        cached?.sequence ??
        focusSequence(
          type,
          skills,
          capabilities.configured.speech,
          study.length,
          matchingIds.length,
        ).filter((mode) => mode !== "pronunciation" || !speakingPaused);
      if (!sequence.length) throw new Error(t("focusGames.unavailable"));
      // Warm the visible and next item's server audio without blocking entry.
      for (const card of study.slice(0, 2))
        if (card.audioUrl) void audioFor(card.learningItemId).catch(() => {});
      let next: FocusCheckpoint = cached
        ? { ...cached, session }
        : {
            version: 1,
            type,
            language,
            sessionId: session.id,
            session,
            sequence,
            stage: 0,
            phase: "play",
            exercises: [],
            outcomes: [],
            stageItems:
              sequence[0] === "matching"
                ? matchingIds
                : study.map((card) => card.learningItemId),
            answer: "",
            flipped: false,
            hintIds: [],
          };
      if (!cached) {
        const dashboard = await product(
          dashboardSchema,
          `dashboard?sourceLanguageCode=${encodeURIComponent(language)}`,
        ).catch(() => undefined);
        if (dashboard)
          next.initialStreak = dashboard.gamification.currentStreakDays;
      }
      // Recover a receipt committed before a tab interruption, including transient voice requests.
      if (cached && !cached.pending)
        for (const attempt of serverAttempts ?? []) {
          if (
            cached.baselineAttemptIds?.includes(attempt.id) ||
            next.outcomes.some((outcome) => outcome.attemptId === attempt.id)
          )
            continue;
          const exercise = next.exercises.find(
            (exercise) =>
              exercise.learningItemId === attempt.learningItemId &&
              exercise.exerciseType === attempt.exerciseType &&
              !next.outcomes.some(
                (outcome) => outcome.exerciseId === exercise.id,
              ),
          );
          if (exercise)
            next = {
              ...next,
              outcomes: [
                ...next.outcomes,
                {
                  attemptId: attempt.id,
                  itemId: attempt.learningItemId,
                  exerciseId: exercise.id,
                  stage: next.stage,
                  mode: next.sequence[next.stage],
                  review: next.reviewStages?.includes(next.stage),
                  result: attempt.result,
                  score: attempt.score,
                  xp: 0,
                  xpKnown: false,
                  expectedAnswer:
                    study.find(
                      (card) => card.learningItemId === attempt.learningItemId,
                    )?.[
                      exercise.direction === "source_to_translation"
                        ? "translationText"
                        : "sourceText"
                    ] ?? null,
                },
              ],
            };
        }
      next = {
        ...next,
        studyCards: study,
        baselineXp: session.xpEarned,
        baselineAttemptIds: [
          ...new Set([
            ...(serverAttempts?.map((attempt) => attempt.id) ?? []),
            ...next.outcomes.map((outcome) => outcome.attemptId),
          ]),
        ],
        stageStartedAt: next.stageStartedAt ?? session.startedAt,
      };
      if (
        next.phase === "play" &&
        !next.pending &&
        (!next.exercises.length ||
          next.exercises.some(
            (exercise) =>
              Date.parse(exercise.expiresAt) <= Date.now() &&
              !next.outcomes.some(
                (outcome) => outcome.exerciseId === exercise.id,
              ),
          ))
      )
        next = await issue(
          { ...next, exercises: [], pending: undefined },
          study,
        );
      if (alive.current) {
        setCards(study);
        current.current = next;
        setState(next);
        if (next.pending) {
          frozen.current = next.pending;
          setPending(next.pending);
        }
        try {
          sessionStorage.setItem(
            checkpointKey(user.id, session.id),
            JSON.stringify(next),
          );
        } catch {
          /* Storage is optional. */
        }
        if (!resume) {
          onSession(session.id);
          try {
            if (creationCacheKey.current)
              sessionStorage.removeItem(creationCacheKey.current);
          } catch {
            /* Storage is optional. */
          }
        }
      }
    } catch (reason) {
      if (alive.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const boot = useEffectEvent(() => void initialize());
  useEffect(() => {
    if (language && !booted.current) {
      booted.current = true;
      boot();
    }
  }, [language]);

  const submit = async (
    exercise: Exercise,
    fields: Record<string, unknown>,
    path = "practice/attempts",
  ) => {
    const value = current.current;
    if (
      !value ||
      lock.current ||
      value.outcomes.some((outcome) => outcome.exerciseId === exercise.id)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    const operation: Pending = frozen.current ?? {
      ...(intent({
        exerciseId: exercise.id,
        ...fields,
        ...(path === "practice/attempts"
          ? {
              hintsUsed: value.hintIds.includes(exercise.id) ? 1 : 0,
              responseTimeMs: Math.min(
                3600000,
                Math.max(0, Math.round(performance.now() - shownAt.current)),
              ),
            }
          : {}),
      }) as Intent & { body: Record<string, unknown> }),
      path,
    };
    frozen.current = operation;
    setPending(operation);
    // Raw microphone audio is transient: never place provider requests in storage.
    if (operation.path === "practice/attempts")
      update((state) => ({
        ...state,
        pending: { ...operation, path: "practice/attempts" },
      }));
    try {
      const receipt = await product(
        attemptReceipt,
        operation.path,
        "POST",
        operation.body,
        operation.eventId,
      );
      if (alive.current) {
        update((state) => ({
          ...state,
          pending: undefined,
          outcomes: state.outcomes.some(
            (outcome) => outcome.attemptId === receipt.attempt.id,
          )
            ? state.outcomes
            : [
                ...state.outcomes,
                {
                  ...outcomeFrom(
                    receipt,
                    exercise.id,
                    state.stage,
                    state.sequence[state.stage],
                    state.reviewStages?.includes(state.stage),
                  ),
                  choiceText: exercise.prompt.choices?.find(
                    (choice) => choice.id === operation.body.choiceId,
                  )?.text,
                },
              ],
        }));
        frozen.current = undefined;
        setPending(undefined);
      }
      return receipt;
    } catch (reason) {
      if (alive.current) {
        if (
          reason instanceof ApiError &&
          [
            "EXERCISE_EXPIRED",
            "EXERCISE_STALE",
            "EXERCISE_CONSUMED",
            "SESSION_CLOSED",
          ].includes(reason.code)
        ) {
          frozen.current = undefined;
          setPending(undefined);
          update((state) => ({
            ...state,
            pending: undefined,
            ...(reason.code === "EXERCISE_CONSUMED" ||
            reason.code === "SESSION_CLOSED"
              ? {}
              : { exercises: [] }),
          }));
          retryAction.current = initialize;
        }
        setError(errorMessage(reason));
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const close = async () => {
    const value = current.current;
    if (!value || lock.current) return;
    retryAction.current = close;
    lock.current = true;
    setBusy(true);
    setError("");
    stopAudio();
    try {
      const result = await product(
        z.object({ session: sessionSchema }),
        `practice/sessions/${value.sessionId}`,
        "PATCH",
        { status: "completed" },
      );
      update((state) => ({
        ...state,
        session: result.session,
        phase: "end",
        pending: undefined,
      }));
    } catch (reason) {
      if (alive.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const advance = async () => {
    const value = current.current;
    if (!value || lock.current || frozen.current) return;
    retryAction.current = advance;
    stopAudio();
    if (
      value.exercises.some(
        (exercise) =>
          !value.outcomes.some((outcome) => outcome.exerciseId === exercise.id),
      )
    ) {
      update((state) => ({
        ...state,
        activeId: state.exercises.find(
          (exercise) =>
            !state.outcomes.some(
              (outcome) => outcome.exerciseId === exercise.id,
            ),
        )?.id,
        answer: "",
        flipped: false,
      }));
      shownAt.current = performance.now();
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await issue(value, cards);
      update(() => next);
      shownAt.current = performance.now();
    } catch (reason) {
      if (alive.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const nextStage = async (replay = false, review = false) => {
    const value = current.current;
    if (!value || lock.current || frozen.current) return;
    if (!replay && !review && value.stage + 1 === value.sequence.length) {
      await close();
      return;
    }
    retryAction.current = () => nextStage(replay, review);
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      // Replays are real fresh exercises, with new server receipts and normal XP policy.
      const reviewMode: FocusMode =
        value.sequence.includes("recall") ||
        value.sequence.includes("drag_drop")
          ? "recall"
          : "flashcards";
      const sequence = replay
        ? [
            ...value.sequence.slice(0, value.stage + 1),
            value.sequence[value.stage],
            ...value.sequence.slice(value.stage + 1),
          ]
        : review
          ? [...value.sequence, reviewMode]
          : value.sequence;
      const stage = review ? sequence.length - 1 : value.stage + 1;
      const stageItems = review
        ? [
            ...new Set([
              ...reviewItems(value.outcomes),
              ...(value.difficultIds ?? []),
            ]),
          ]
        : sequence[stage] === "matching"
          ? matchingItemIds(cards)
          : cards.map((card) => card.learningItemId);
      const next = await issue(
        {
          ...value,
          sequence,
          stage,
          stageItems,
          reviewStages: review
            ? [...(value.reviewStages ?? []), stage]
            : value.reviewStages,
          stageStartedAt: new Date().toISOString(),
          exercises: [],
          answer: "",
          flipped: false,
        },
        cards,
      );
      update(() => next);
      shownAt.current = performance.now();
    } catch (reason) {
      if (alive.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const play = async (
    exercise: Exercise | undefined = active,
    slow = false,
  ) => {
    if (!exercise) return;
    // Cloze audio contains the answer. A committed successful receipt is the
    // only point at which either word or sentence playback becomes available.
    if (
      mode === "drag_drop" &&
      !current.current?.outcomes.some(
        (entry) => entry.exerciseId === exercise.id && solved(entry),
      )
    )
      return;
    stopAudio();
    const version = playbackVersion.current;
    setAudioError("");
    try {
      if (
        exercise.prompt.audioUrl ||
        cards.find((card) => card.learningItemId === exercise.learningItemId)
          ?.audioUrl
      ) {
        const blob = await audioFor(exercise.learningItemId);
        if (!alive.current || playbackVersion.current !== version) return;
        audioUrl.current = URL.createObjectURL(blob);
        audio.current = new Audio(audioUrl.current);
        audio.current.playbackRate = slow ? 0.65 : 1;
        await audio.current.play();
      } else if (exercise.exerciseType !== "listening_spelling") {
        const card = cards.find(
          (card) => card.learningItemId === exercise.learningItemId,
        );
        if (
          !card ||
          !speak(card.sourceText, card.sourceLanguageCode, slow ? 0.6 : 0.9)
        )
          throw new Error(t("game.speechUnavailable"));
      } else throw new Error(t("game.speechUnavailable"));
    } catch {
      if (alive.current) setAudioError(t("game.speechUnavailable"));
    }
  };
  const playCard = async (card: StudyCard) => {
    stopAudio();
    setAudioError("");
    const version = playbackVersion.current;
    try {
      if (card.audioUrl) {
        const blob = await audioFor(card.learningItemId);
        if (!alive.current || playbackVersion.current !== version) return;
        audioUrl.current = URL.createObjectURL(blob);
        audio.current = new Audio(audioUrl.current);
        await audio.current.play();
      } else if (!speak(card.sourceText, card.sourceLanguageCode))
        throw new Error(t("game.speechUnavailable"));
    } catch {
      if (alive.current && playbackVersion.current === version)
        setAudioError(t("game.speechUnavailable"));
    }
  };
  const record = async (exercise: Exercise) => {
    if (controller.current || lock.current || frozen.current) return;
    setMicrophoneConsented(true);
    const abort = new AbortController(),
      end = new AbortController();
    controller.current = abort;
    release.current = end;
    setRecording(true);
    setError("");
    stopAudio();
    try {
      const audioBase64 = await recordVoice(abort.signal, end.signal, 5);
      if (alive.current)
        await submit(
          exercise,
          { audioBase64, languageCode: language },
          "pronunciation/assessments",
        );
    } catch (reason) {
      if (alive.current && !abort.signal.aborted)
        setError(errorMessage(reason));
    } finally {
      controller.current = undefined;
      release.current = undefined;
      if (alive.current) setRecording(false);
    }
  };
  const retry = () => {
    if (frozen.current && state) {
      const exercise = state.exercises.find(
        (exercise) => exercise.id === frozen.current!.body.exerciseId,
      );
      if (exercise) void submit(exercise, {}, frozen.current.path);
    } else if (retryAction.current) void retryAction.current();
    else void initialize();
  };
  const retryExercise = async (target: Exercise | undefined = active) => {
    let value = current.current;
    if (!value || !target || lock.current || frozen.current) return;
    if (
      ["matching", "drag_drop"].includes(mode ?? "") &&
      value.outcomes.some(
        (outcome) =>
          outcome.exerciseId === target.id && outcome.result === "incorrect",
      )
    ) {
      value = {
        ...value,
        hintIds: [...new Set([...value.hintIds, target.id])],
        difficultIds: [
          ...new Set([...(value.difficultIds ?? []), target.learningItemId]),
        ],
      };
    }
    retryAction.current = () => retryExercise(target);
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      // Matching requires at least two cards and new opaque choice ids. Issue a
      // bounded board, retaining only the replacement for the consumed question.
      const ids =
        mode === "matching"
          ? value.exercises.map((exercise) => exercise.learningItemId)
          : [target.learningItemId];
      const next = await issue(value, cards, ids);
      const replacement = next.exercises.find(
        (exercise) => exercise.learningItemId === target.learningItemId,
      )!;
      update(() => ({
        ...next,
        exercises: value.exercises.map((exercise) =>
          exercise.id === target.id ? replacement : exercise,
        ),
        activeId:
          value.activeId === target.id ? replacement.id : value.activeId,
        hintIds: [
          ...value.hintIds,
          ...(value.hintIds.includes(target.id) ? [replacement.id] : []),
        ],
      }));
      shownAt.current = performance.now();
      return replacement;
    } catch (reason) {
      if (alive.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const recoverWrong = useEffectEvent(() => {
    const value = current.current;
    const wrong = value?.exercises.find((exercise) =>
      value.outcomes.some(
        (outcome) =>
          outcome.exerciseId === exercise.id && outcome.result === "incorrect",
      ),
    );
    if (wrong) void retryExercise(wrong);
  });
  useEffect(() => {
    if (
      state?.phase === "play" &&
      !busy &&
      !pending &&
      !error &&
      ["matching", "drag_drop"].includes(mode ?? "")
    )
      recoverWrong();
  }, [state, busy, pending, error, mode]);
  const playSentence = () => {
    if (
      mode === "drag_drop" &&
      !current.current?.outcomes.some(
        (entry) => entry.exerciseId === active?.id && solved(entry),
      )
    )
      return;
    const card = cards.find(
      (card) => card.learningItemId === active?.learningItemId,
    );
    stopAudio();
    if (
      card &&
      !speak(card.context || card.sourceText, card.sourceLanguageCode, 0.85)
    )
      setAudioError(t("game.speechUnavailable"));
  };
  const markDifficult = (itemId: string, requeue = false) =>
    update((value) => ({
      ...value,
      difficultIds: [...new Set([...(value.difficultIds ?? []), itemId])],
      listeningRequeues: requeue
        ? [...new Set([...(value.listeningRequeues ?? []), itemId])]
        : value.listeningRequeues,
    }));
  const pauseSpeaking = async () => {
    if (!active || lock.current || frozen.current) return;
    const receipt = await submit(active, { skipped: true });
    if (!receipt) return;
    const until = Date.now() + 15 * 60 * 1000;
    try {
      sessionStorage.setItem(
        `gotit.focus.speakingPause:${user!.id}`,
        String(until),
      );
    } catch {
      /* Tab storage is optional. */
    }
    update((value) => ({
      ...value,
      phase: "transition",
      speakingPausedUntil: until,
    }));
  };
  return {
    state,
    cards,
    mode,
    active,
    busy,
    error,
    audioError,
    recording,
    microphoneConsented,
    listeningSilent,
    setListeningSilent,
    pending,
    update,
    submit,
    advance,
    nextStage,
    close,
    play,
    playSentence,
    playCard,
    record,
    retry,
    retryExercise,
    markDifficult,
    pauseSpeaking,
    stopAudio,
    stopRecording: () => release.current?.abort(),
    cancelRecording: () => controller.current?.abort(),
  };
}
