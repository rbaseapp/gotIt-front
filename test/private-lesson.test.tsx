import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrivateLessonPage } from "../src/pages/PrivateLessonPage";
import { privateLessonSessionSchema } from "../src/lib/privateLesson";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  connect: vi.fn(),
  close: vi.fn(),
  send: vi.fn(() => true),
}));

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: {
      defaultSourceLanguage: "en",
      defaultTranslationLanguage: "he",
      languages: [{ languageCode: "en", effectiveLevel: "B1" }],
      interests: ["technology"],
    },
  }),
}));

vi.mock("../src/lib/privateLesson", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../src/lib/privateLesson")>();
  return {
    ...original,
    createPrivateLessonSession: mocks.create,
    connectPrivateLesson: mocks.connect,
  };
});

const session = {
  lesson: {
    id: "11111111-1111-4111-8111-111111111111",
    durationSeconds: 300,
    wrapUpAfterSeconds: 255,
    targetLanguageCode: "en",
    supportLanguageCode: "he",
    level: "B1",
    topic: "technology",
    grammarFocus: null,
    teacherVoice: "female",
    speechRate: "normal",
    targetWords: [
      {
        learningItemId: "22222222-2222-4222-8222-222222222222",
        sourceText: "achieve",
        translationText: "להשיג",
      },
    ],
  },
  realtime: {
    clientSecret: "ephemeral-secret",
    expiresAt: null,
    model: "gpt-realtime-test",
    connectionUrl: "https://api.openai.com/v1/realtime/calls",
    openingEvent: {
      type: "response.create",
      response: { instructions: "Begin." },
    },
    wrapUpEvent: {
      type: "response.create",
      response: { instructions: "Summarize." },
    },
    translationEvent: {
      type: "response.create",
      response: { instructions: "Translate." },
    },
  },
} as const;

describe("private voice lesson", () => {
  it("uses the authenticated app API without asking the learner for a token", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.connect.mockImplementation(
      async (
        _session: unknown,
        _audio: unknown,
        handlers: { onOpen: () => void },
      ) => {
        handlers.onOpen();
        return { close: mocks.close, send: mocks.send };
      },
    );
    const user = userEvent.setup();
    render(<PrivateLessonPage />);

    expect(screen.queryByLabelText(/אסימון/u)).not.toBeInTheDocument();
    expect(screen.getByLabelText("השפה לתרגול")).toHaveValue("en");
    await user.click(
      screen.getByRole("button", { name: "התחלת שיעור של חמש דקות" }),
    );

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        targetLanguageCode: "en",
        supportLanguageCode: "he",
        teacherVoice: "female",
        speechRate: "normal",
        topic: "technology",
      }),
    );
    expect(await screen.findByText("achieve · להשיג")).toBeInTheDocument();
    expect(mocks.connect).toHaveBeenCalledOnce();
  });

  it("lets the learner request a translation and ends through the recap event", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.send.mockClear();
    let onRealtimeEvent: ((event: Record<string, unknown>) => void) | undefined;
    mocks.connect.mockImplementation(
      async (
        _session: unknown,
        _audio: unknown,
        handlers: {
          onOpen: () => void;
          onEvent: (event: Record<string, unknown>) => void;
        },
      ) => {
        onRealtimeEvent = handlers.onEvent;
        handlers.onOpen();
        return { close: mocks.close, send: mocks.send };
      },
    );
    const user = userEvent.setup();
    render(<PrivateLessonPage />);

    await user.selectOptions(screen.getByLabelText("קול המורה"), "male");
    await user.selectOptions(screen.getByLabelText("מהירות דיבור"), "fast");
    await user.click(
      screen.getByRole("button", { name: "התחלת שיעור של חמש דקות" }),
    );
    await screen.findByRole("button", { name: "תרגום המשפט האחרון" });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ teacherVoice: "male", speechRate: "fast" }),
    );
    await user.click(
      screen.getByRole("button", { name: "תרגום המשפט האחרון" }),
    );
    expect(mocks.send).toHaveBeenCalledWith(session.realtime.translationEvent);

    await user.click(screen.getByRole("button", { name: "סיום השיעור" }));
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "session.update" }),
    );
    onRealtimeEvent?.({ type: "response.done" });
    expect(mocks.send).toHaveBeenCalledWith(session.realtime.wrapUpEvent);
  });

  it("rejects a server response that could send the ephemeral secret elsewhere", () => {
    expect(
      privateLessonSessionSchema.safeParse({
        ...session,
        realtime: {
          ...session.realtime,
          connectionUrl: "https://evil.example/realtime",
        },
      }).success,
    ).toBe(false);
  });
});
