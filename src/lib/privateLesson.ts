import { z } from "zod";
import { product, uuid } from "./product";
import { readStorage, writeStorage } from "./storage";

export const privateLessonFocusAreas = [
  "speaking",
  "vocabulary",
  "grammar",
  "fluency",
  "pronunciation",
  "listening",
] as const;
export type PrivateLessonFocusArea = (typeof privateLessonFocusAreas)[number];

export const privateLessonCorrectionModes = [
  "critical_only",
  "recast",
  "deep_explanation",
] as const;
export type PrivateLessonCorrectionMode =
  (typeof privateLessonCorrectionModes)[number];

export const privateLessonVocabularyModes = ["learned", "none"] as const;
export type PrivateLessonVocabularyMode =
  (typeof privateLessonVocabularyModes)[number];

export const privateLessonSpeechRates = [
  "very_slow",
  "slow",
  "normal",
  "fast",
  "very_fast",
] as const;
export type PrivateLessonSpeechRate = (typeof privateLessonSpeechRates)[number];

export const privateLessonModes = ["standard", "absolute_beginner"] as const;
export type PrivateLessonMode = (typeof privateLessonModes)[number];

const roadmapMilestoneSchema = z.object({
  id: uuid,
  position: z.number().int().min(1).max(5),
  key: z.string(),
  title: z.string(),
  description: z.string(),
  communicationObjective: z.string(),
  grammarTopics: z.array(z.string()),
  successCriteria: z.object({
    minimumLessons: z.number().int(),
    targetScore: z.number().int(),
  }),
  status: z.enum(["locked", "current", "completed"]),
  progressScore: z.number().int().min(0).max(100),
  evidenceLessonCount: z.number().int().nonnegative(),
  lessonSessionCount: z.number().int().nonnegative().optional().default(0),
});

export const privateLessonRoadmapSchema = z.object({
  id: uuid,
  targetLanguageCode: z.string(),
  goalKind: z.enum(["recommended", "communication", "grammar"]),
  goalKey: z.string(),
  goalTitle: z.string(),
  recommendedReason: z.string(),
  status: z.enum(["active", "paused", "completed"]),
  currentMilestonePosition: z.number().int().min(1).max(5),
  milestones: z.array(roadmapMilestoneSchema).length(5),
});

const lessonRoadmapContextSchema = z
  .object({
    roadmapId: uuid,
    milestoneId: uuid,
    milestoneKey: z.string(),
    goalTitle: z.string(),
    communicationObjective: z.string(),
    grammarTopics: z.array(z.string()),
    successCriteria: z.object({
      minimumLessons: z.number().int(),
      targetScore: z.number().int(),
    }),
    evidenceLessonCount: z.number().int().nonnegative().optional().default(0),
    isFirstMilestoneLesson: z.boolean().optional().default(false),
  })
  .nullable();

export const privateLessonSetupSchema = z.object({
  preferences: z
    .object({
      supportLanguageCode: z.string().nullable(),
      lessonMode: z.enum(privateLessonModes).default("standard"),
      requestedDurationMinutes: z.union([
        z.literal(1),
        z.literal(5),
        z.literal(10),
        z.literal(15),
      ]),
      teacherVoice: z.enum(["female", "male"]),
      speechRate: z.enum(privateLessonSpeechRates),
      focusAreas: z.array(z.enum(privateLessonFocusAreas)),
      customFocus: z.string().nullable(),
      correctionMode: z.enum(privateLessonCorrectionModes),
      vocabularyMode: z.enum(privateLessonVocabularyModes),
    })
    .nullable(),
  roadmap: privateLessonRoadmapSchema.nullable(),
  curriculum: z.object({
    recommended: z.object({
      goalKind: z.literal("grammar"),
      goalKey: z.string(),
      reason: z.string(),
    }),
    communicationGoals: z.array(z.object({ key: z.string() })),
    grammarTopics: z.array(
      z.object({
        key: z.string(),
        cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
        prerequisites: z.array(z.string()),
      }),
    ),
  }),
});

export type PrivateLessonSetup = z.infer<typeof privateLessonSetupSchema>;
export type PrivateLessonRoadmap = z.infer<typeof privateLessonRoadmapSchema>;
export type PrivateLessonPreferences = NonNullable<
  PrivateLessonSetup["preferences"]
>;

const PRIVATE_LESSON_LANGUAGE_KEY = "gotit.privateLesson.targetLanguage";
export const PRIVATE_LESSON_LANGUAGE_CHANGED_EVENT =
  "gotit:private-lesson-language-changed";

export function getSavedPrivateLessonLanguage(fallback: string) {
  return readStorage(PRIVATE_LESSON_LANGUAGE_KEY, fallback);
}

export function savePrivateLessonLanguage(languageCode: string) {
  const saved = writeStorage(PRIVATE_LESSON_LANGUAGE_KEY, languageCode);
  if (saved && typeof window !== "undefined")
    window.dispatchEvent(new Event(PRIVATE_LESSON_LANGUAGE_CHANGED_EVENT));
  return saved;
}

const instructionEventSchema = z
  .object({
    type: z.literal("response.create"),
    response: z.object({ instructions: z.string().min(1).max(1000) }).strict(),
  })
  .strict();

export const privateLessonSessionSchema = z.object({
  lesson: z.object({
    id: uuid,
    durationSeconds: z
      .number()
      .int()
      .positive()
      .max(20 * 60),
    wrapUpAfterSeconds: z
      .number()
      .int()
      .nonnegative()
      .max(20 * 60),
    targetLanguageCode: z.string().min(1).max(64),
    supportLanguageCode: z.string().min(1).max(64).nullable(),
    lessonMode: z.enum(privateLessonModes).default("standard"),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    topic: z.string().min(1).max(120),
    grammarFocus: z.string().min(1).max(160).nullable(),
    focusAreas: z.array(z.enum(privateLessonFocusAreas)).min(1).max(6),
    customFocus: z.string().min(1).max(300).nullable(),
    correctionMode: z.enum(privateLessonCorrectionModes),
    vocabularyMode: z.enum(privateLessonVocabularyModes),
    continuesFromLessonId: uuid.nullable(),
    teacherVoice: z.enum(["female", "male"]),
    speechRate: z.enum(privateLessonSpeechRates),
    targetWords: z.array(
      z.object({
        learningItemId: uuid,
        sourceText: z.string().min(1),
        translationText: z.string().min(1),
      }),
    ),
    roadmap: lessonRoadmapContextSchema.optional().default(null),
  }),
  realtime: z.object({
    clientSecret: z.string().min(1).max(4096),
    expiresAt: z.string().datetime().nullable(),
    model: z.string().min(1).max(200),
    connectionUrl: z.literal("https://api.openai.com/v1/realtime/calls"),
    openingEvent: instructionEventSchema,
    wrapUpEvent: instructionEventSchema,
    translationEvent: instructionEventSchema.nullable(),
  }),
});

export type PrivateLessonSession = z.infer<typeof privateLessonSessionSchema>;
export type PrivateLessonDurationMinutes = 1 | 5 | 10 | 15;
export type PrivateLessonInput = {
  courseId?: string;
  targetLanguageCode: string;
  supportLanguageCode?: string | null;
  lessonMode?: PrivateLessonMode;
  requestedLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  requestedDurationMinutes?: PrivateLessonDurationMinutes;
  teacherVoice?: "female" | "male";
  speechRate?: PrivateLessonSpeechRate;
  topic?: string;
  grammarFocus?: string;
  focusAreas?: PrivateLessonFocusArea[];
  customFocus?: string | null;
  correctionMode?: PrivateLessonCorrectionMode;
  vocabularyMode?: PrivateLessonVocabularyMode;
};

const legacySkillEvidence = {
  confidence: 0.1,
  evidenceQuality: "insufficient" as const,
  highestTestedLevel: null,
  evidenceCount: 0,
  dimensions: null,
  evidence: [],
};

const legacyAssessment = {
  overallLevel: null,
  levelRange: null,
  confidence: "low" as const,
  evidenceSufficient: false,
  calibrationTarget: null,
  basis: "More evidence is needed.",
  lessonPerformance: {
    taskLevel: "A2" as const,
    score: 0,
    result: "insufficient" as const,
    evidenceQuality: "insufficient" as const,
    independence: 0,
  },
  skills: {
    speaking: {
      ...legacySkillEvidence,
      score: 35,
      level: null,
      feedback: "Complete another lesson to refresh this estimate.",
    },
    vocabulary: {
      ...legacySkillEvidence,
      score: 35,
      level: null,
      feedback: "Complete another lesson to refresh this estimate.",
    },
    grammar: {
      ...legacySkillEvidence,
      score: 35,
      level: null,
      feedback: "Complete another lesson to refresh this estimate.",
    },
    fluency: {
      ...legacySkillEvidence,
      score: 35,
      level: null,
      feedback: "Complete another lesson to refresh this estimate.",
    },
    comprehension: {
      ...legacySkillEvidence,
      score: 35,
      level: null,
      feedback: "Complete another lesson to refresh this estimate.",
    },
  },
};

const skillAssessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable().default(null),
  feedback: z.string(),
  confidence: z.number().min(0).max(1).default(0.1),
  evidenceQuality: z
    .enum(["insufficient", "weak", "moderate", "strong"])
    .default("insufficient"),
  highestTestedLevel: z
    .enum(["A1", "A2", "B1", "B2", "C1", "C2"])
    .nullable()
    .default(null),
  evidenceCount: z.number().int().min(0).default(0),
  dimensions: z
    .object({
      accuracy: z.number().int().min(0).max(100),
      independence: z.number().int().min(0).max(100),
      range: z.number().int().min(0).max(100),
      complexity: z.number().int().min(0).max(100),
      consistency: z.number().int().min(0).max(100),
    })
    .nullable()
    .default(null),
  evidence: z
    .array(
      z.object({
        learnerQuote: z.string(),
        observation: z.string(),
        independent: z.boolean(),
      }),
    )
    .default([]),
});

export const privateLessonReportSchema = z.object({
  summary: z.string(),
  assessment: z
    .object({
      overallLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable(),
      levelRange: z
        .object({
          from: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
          to: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
        })
        .nullable()
        .default(null),
      confidence: z.enum(["low", "medium", "high"]),
      evidenceSufficient: z.boolean().default(false),
      calibrationTarget: z
        .enum(["A1", "A2", "B1", "B2", "C1", "C2"])
        .nullable()
        .default(null),
      basis: z.string().default("More evidence is needed."),
      lessonPerformance: z
        .object({
          taskLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
          score: z.number().int().min(0).max(100),
          result: z.enum([
            "insufficient",
            "developing",
            "successful",
            "strong",
          ]),
          evidenceQuality: z.enum([
            "insufficient",
            "weak",
            "moderate",
            "strong",
          ]),
          independence: z.number().int().min(0).max(100),
        })
        .default(legacyAssessment.lessonPerformance),
      skills: z.object({
        speaking: skillAssessmentSchema,
        vocabulary: skillAssessmentSchema,
        grammar: skillAssessmentSchema,
        fluency: skillAssessmentSchema,
        comprehension: skillAssessmentSchema,
      }),
    })
    .default(legacyAssessment),
  roadmapProgress: z
    .object({
      objectiveCompletionScore: z.number().int().min(0).max(100),
      targetFormControlScore: z.number().int().min(0).max(100),
      score: z.number().int().min(0).max(100),
      taskCompleted: z.boolean(),
      confidence: z.enum(["low", "medium", "high"]),
      evidence: z.string(),
    })
    .nullable()
    .optional()
    .default(null),
  strengths: z.array(z.string()),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    }),
  ),
  grammarPoints: z.array(
    z.object({
      topic: z.string(),
      explanation: z.string(),
      example: z.string().nullable(),
    }),
  ),
  vocabulary: z.array(
    z.object({
      learningItemId: uuid,
      sourceText: z.string(),
      translationText: z.string(),
      outcome: z.enum(["practiced", "needs_review", "not_observed"]),
      note: z.string(),
    }),
  ),
  newWordSuggestions: z.array(
    z.object({
      sourceText: z.string(),
      translationText: z.string(),
      example: z.string().nullable(),
    }),
  ),
  nextLessonPlan: z.string(),
  recommendedReviewItemIds: z.array(uuid),
});

export const savedPrivateLessonSchema = z.object({
  id: uuid,
  targetLanguageCode: z.string(),
  supportLanguageCode: z.string().nullable(),
  lessonMode: z.enum(privateLessonModes).default("standard"),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  topic: z.string(),
  grammarFocus: z.string().nullable(),
  focusAreas: z
    .array(z.enum(privateLessonFocusAreas))
    .default(["speaking", "vocabulary"]),
  customFocus: z.string().nullable().default(null),
  correctionMode: z.enum(privateLessonCorrectionModes).default("recast"),
  vocabularyMode: z.enum(privateLessonVocabularyModes).default("learned"),
  continuesFromLessonId: uuid.nullable().default(null),
  teacherVoice: z.enum(["female", "male"]),
  speechRate: z.enum(privateLessonSpeechRates),
  plannedDurationSeconds: z.number().int().positive(),
  actualDurationSeconds: z.number().int().nonnegative().nullable(),
  targetWords: privateLessonSessionSchema.shape.lesson.shape.targetWords,
  roadmap: lessonRoadmapContextSchema.optional().default(null),
  status: z.enum(["active", "summarizing", "completed", "report_failed"]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  report: privateLessonReportSchema.nullable(),
});

export type SavedPrivateLesson = z.infer<typeof savedPrivateLessonSchema>;
export type PrivateLessonReport = z.infer<typeof privateLessonReportSchema>;
export type PrivateLessonTurn = { role: "learner" | "tutor"; text: string };

export function createPrivateLessonSession(input: PrivateLessonInput) {
  return product(
    privateLessonSessionSchema,
    "private-lessons/realtime-sessions",
    "POST",
    input,
  );
}

export function completePrivateLessonSession(
  id: string,
  input: {
    actualDurationSeconds: number;
    completionReason: "completed" | "stopped" | "disconnected";
    turns: PrivateLessonTurn[];
  },
) {
  return product(
    z.object({ lesson: savedPrivateLessonSchema }),
    `private-lessons/${id}/complete`,
    "POST",
    input,
  ).then((result) => result.lesson);
}

export function listPrivateLessons(limit = 20) {
  return product(
    z.object({ lessons: z.array(savedPrivateLessonSchema) }),
    `private-lessons?limit=${limit}`,
  ).then((result) => result.lessons);
}

export function getPrivateLessonSetup(targetLanguageCode: string) {
  return product(
    privateLessonSetupSchema,
    `private-lessons/setup?targetLanguageCode=${encodeURIComponent(targetLanguageCode)}`,
  );
}

export function savePrivateLessonPreferences(
  targetLanguageCode: string,
  preferences: PrivateLessonPreferences,
) {
  return product(
    z.object({ preferences: privateLessonSetupSchema.shape.preferences }),
    "private-lessons/preferences",
    "PUT",
    { targetLanguageCode, ...preferences },
  ).then((result) => result.preferences);
}

export function createPrivateLessonRoadmap(input: {
  targetLanguageCode: string;
  goalKind: "recommended" | "communication" | "grammar";
  goalKey: string;
}) {
  return product(
    z.object({ roadmap: privateLessonRoadmapSchema }),
    "private-lessons/roadmaps",
    "POST",
    input,
  ).then((result) => result.roadmap);
}

export function deletePrivateLesson(id: string) {
  return product(
    z.object({ deleted: z.literal(true) }),
    `private-lessons/${id}`,
    "DELETE",
  );
}

export type PrivateLessonConnection = {
  send: (event: unknown) => boolean;
  setMicrophoneMuted: (muted: boolean) => boolean;
  close: () => void;
};

export type PrivateLessonConnectionErrorCode =
  | "BROWSER_UNSUPPORTED"
  | "MICROPHONE_UNAVAILABLE"
  | "REALTIME_CONNECTION_FAILED"
  | "CANCELLED";

export class PrivateLessonConnectionError extends Error {
  constructor(public readonly code: PrivateLessonConnectionErrorCode) {
    super(code);
  }
}

type RealtimeHandlers = {
  onOpen: () => void;
  onClose: () => void;
  onEvent: (event: Record<string, unknown>) => void;
  onAudioLevel?: (level: number) => void;
};

export async function connectPrivateLesson(
  session: PrivateLessonSession,
  audioElement: HTMLAudioElement,
  handlers: RealtimeHandlers,
  signal: AbortSignal,
): Promise<PrivateLessonConnection> {
  if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia)
    throw new PrivateLessonConnectionError("BROWSER_UNSUPPORTED");

  const peer = new RTCPeerConnection();
  let stream: MediaStream | undefined;
  let closed = false;
  let audioContext: AudioContext | undefined;
  let meterFrame: number | undefined;
  const channel = peer.createDataChannel("oai-events");
  const stopAudioMeter = () => {
    if (meterFrame !== undefined) window.cancelAnimationFrame(meterFrame);
    meterFrame = undefined;
    handlers.onAudioLevel?.(0);
    if (audioContext) void audioContext.close().catch(() => undefined);
    audioContext = undefined;
  };
  const startAudioMeter = (remoteStream: MediaStream) => {
    if (!handlers.onAudioLevel) return;
    stopAudioMeter();
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(remoteStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let lastUpdate = 0;
      let smoothedLevel = 0;
      const sample = (timestamp: number) => {
        analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (const sampleValue of samples) {
          const centered = (sampleValue - 128) / 128;
          sumSquares += centered * centered;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const measuredLevel = Math.min(1, Math.max(0, (rms - 0.012) * 14));
        smoothedLevel = smoothedLevel * 0.58 + measuredLevel * 0.42;
        if (timestamp - lastUpdate >= 70) {
          handlers.onAudioLevel?.(smoothedLevel);
          lastUpdate = timestamp;
        }
        meterFrame = window.requestAnimationFrame(sample);
      };
      meterFrame = window.requestAnimationFrame(sample);
    } catch {
      stopAudioMeter();
    }
  };
  const close = () => {
    if (closed) return;
    closed = true;
    stopAudioMeter();
    channel.close();
    peer.close();
    stream?.getTracks().forEach((track) => track.stop());
    audioElement.srcObject = null;
  };
  const abort = () => close();
  signal.addEventListener("abort", abort, { once: true });

  try {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch {
      if (signal.aborted) throw new PrivateLessonConnectionError("CANCELLED");
      throw new PrivateLessonConnectionError("MICROPHONE_UNAVAILABLE");
    }
    if (signal.aborted) throw new PrivateLessonConnectionError("CANCELLED");

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0] ?? new MediaStream([event.track]);
      audioElement.srcObject = remoteStream;
      startAudioMeter(remoteStream);
      void audioElement.play().catch(() => undefined);
    };
    peer.addTrack(stream.getAudioTracks()[0]!, stream);
    channel.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;
      try {
        const event: unknown = JSON.parse(message.data);
        if (event && typeof event === "object" && !Array.isArray(event))
          handlers.onEvent(event as Record<string, unknown>);
      } catch {
        // Ignore malformed provider events.
      }
    });
    channel.addEventListener("open", () => {
      channel.send(JSON.stringify(session.realtime.openingEvent));
      handlers.onOpen();
    });
    channel.addEventListener("close", handlers.onClose);

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const response = await fetch(session.realtime.connectionUrl, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${session.realtime.clientSecret}`,
        "Content-Type": "application/sdp",
      },
      signal,
      credentials: "omit",
    });
    if (!response.ok)
      throw new PrivateLessonConnectionError("REALTIME_CONNECTION_FAILED");
    await peer.setRemoteDescription({
      type: "answer",
      sdp: await response.text(),
    });

    return {
      send(event) {
        if (channel.readyState !== "open") return false;
        channel.send(JSON.stringify(event));
        return true;
      },
      setMicrophoneMuted(muted) {
        const track = stream?.getAudioTracks()[0];
        if (!track || track.readyState === "ended") return false;
        track.enabled = !muted;
        return true;
      },
      close() {
        signal.removeEventListener("abort", abort);
        close();
      },
    };
  } catch (error) {
    signal.removeEventListener("abort", abort);
    close();
    if (error instanceof PrivateLessonConnectionError) throw error;
    if (signal.aborted) throw new PrivateLessonConnectionError("CANCELLED");
    throw new PrivateLessonConnectionError("REALTIME_CONNECTION_FAILED");
  }
}
