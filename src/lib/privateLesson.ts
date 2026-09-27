import { z } from "zod";
import { product, uuid } from "./product";

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
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    topic: z.string().min(1).max(120),
    grammarFocus: z.string().min(1).max(160).nullable(),
    teacherVoice: z.enum(["female", "male"]),
    speechRate: z.enum(["slow", "normal", "fast"]),
    targetWords: z.array(
      z.object({
        learningItemId: uuid,
        sourceText: z.string().min(1),
        translationText: z.string().min(1),
      }),
    ),
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
  targetLanguageCode: string;
  supportLanguageCode?: string;
  requestedLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  requestedDurationMinutes?: PrivateLessonDurationMinutes;
  teacherVoice?: "female" | "male";
  speechRate?: "slow" | "normal" | "fast";
  topic?: string;
  grammarFocus?: string;
};

export const privateLessonReportSchema = z.object({
  summary: z.string(),
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
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  topic: z.string(),
  grammarFocus: z.string().nullable(),
  teacherVoice: z.enum(["female", "male"]),
  speechRate: z.enum(["slow", "normal", "fast"]),
  plannedDurationSeconds: z.number().int().positive(),
  actualDurationSeconds: z.number().int().nonnegative().nullable(),
  targetWords: privateLessonSessionSchema.shape.lesson.shape.targetWords,
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
