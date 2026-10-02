import { afterEach, expect, it, vi } from "vitest";
import { connectPrivateLesson } from "../src/lib/privateLesson";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("connects through the product backend and asks the server to end the call", async () => {
  const channel = {
    readyState: "open",
    addEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  };
  class Peer {
    static instance: Peer;
    constructor() {
      Peer.instance = this;
    }
    ontrack: ((event: unknown) => void) | null = null;
    createDataChannel() {
      return channel;
    }
    addTrack() {}
    async createOffer() {
      return { sdp: "v=0\r\no=browser\r\n" };
    }
    async setLocalDescription() {}
    async setRemoteDescription() {}
    close() {}
  }
  let frame: FrameRequestCallback | undefined;
  let sampleValue = 138;
  const cancelFrame = vi.fn(() => {
    frame = undefined;
  });
  const closeContext = vi.fn(async () => undefined);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.stubGlobal(
    "AudioContext",
    class {
      createMediaStreamSource() {
        return { connect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 512,
          smoothingTimeConstant: 0,
          getByteTimeDomainData: (samples: Uint8Array) =>
            samples.fill(sampleValue),
        };
      }
      close = closeContext;
    },
  );
  vi.stubGlobal("RTCPeerConnection", Peer);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({
        getAudioTracks: () => [{ readyState: "live", stop: vi.fn() }],
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  });
  const requests: Array<{ url: string; authorization: string | null }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      return new Response(
        url.endsWith("/connect") ? "v=0\r\no=provider\r\n" : null,
        { status: url.endsWith("/connect") ? 200 : 204 },
      );
    }),
  );
  const audio = document.createElement("audio");
  vi.spyOn(audio, "play").mockResolvedValue(undefined);
  const onAudioLevel = vi.fn();
  const connection = await connectPrivateLesson(
    {
      realtime: {
        openingEvent: {
          type: "response.create",
          response: { instructions: "Start" },
        },
        connectionUrl: "/api/v1/realtime/connect",
        clientSecret: "ticket-id",
      },
    },
    audio,
    { onOpen() {}, onClose() {}, onEvent() {}, onAudioLevel },
    new AbortController().signal,
  );
  Peer.instance.ontrack?.({ streams: [{}] });
  onAudioLevel.mockClear();
  for (const timestamp of [16, 32, 48, 64, 80, 96]) frame?.(timestamp);
  // The previous 70ms publication cadence misses these syllable updates.
  expect(onAudioLevel).toHaveBeenCalledTimes(3);
  expect(onAudioLevel.mock.calls[2][0]).toBeGreaterThan(0.5);
  expect(onAudioLevel.mock.calls[2][0]).toBeLessThan(0.65);
  sampleValue = 128;
  for (let timestamp = 112; timestamp <= 672; timestamp += 16)
    frame?.(timestamp);
  expect(onAudioLevel.mock.lastCall?.[0]).toBe(0);
  connection.close();
  expect(onAudioLevel.mock.lastCall?.[0]).toBe(0);
  expect(cancelFrame).toHaveBeenCalledWith(1);
  expect(closeContext).toHaveBeenCalledOnce();
  expect(frame).toBeUndefined();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  expect(requests).toEqual([
    {
      url: "/gotit-api/api/v1/realtime/connect",
      authorization: "Bearer ticket-id",
    },
    {
      url: "/gotit-api/api/v1/realtime/end",
      authorization: "Bearer ticket-id",
    },
  ]);
});
