import { afterEach, expect, it, vi } from "vitest";
import { connectPrivateLesson } from "../src/lib/privateLesson";

afterEach(() => vi.restoreAllMocks());

it("connects through the product backend and asks the server to end the call", async () => {
  const channel = {
    readyState: "open",
    addEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  };
  class Peer {
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
    document.createElement("audio"),
    { onOpen() {}, onClose() {}, onEvent() {} },
    new AbortController().signal,
  );
  connection.close();
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
