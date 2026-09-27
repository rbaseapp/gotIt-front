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
  }),
});

export type PrivateLessonSession = z.infer<typeof privateLessonSessionSchema>;
export type PrivateLessonInput = {
  targetLanguageCode: string;
  supportLanguageCode?: string;
  requestedLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  topic?: string;
  grammarFocus?: string;
};

export function createPrivateLessonSession(input: PrivateLessonInput) {
  return product(
    privateLessonSessionSchema,
    "private-lessons/realtime-sessions",
    "POST",
    input,
  );
}

export type PrivateLessonConnection = {
  send: (event: unknown) => boolean;
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
  const channel = peer.createDataChannel("oai-events");
  const close = () => {
    if (closed) return;
    closed = true;
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
      audioElement.srcObject = event.streams[0] ?? null;
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
