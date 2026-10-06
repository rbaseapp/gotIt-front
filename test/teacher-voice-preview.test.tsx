import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { TeacherVoicePreview } from "../src/components/TeacherVoicePreview";
import i18n from "../src/i18n";
const mocks = vi.hoisted(() => ({
  product: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  audioSource: vi.fn(),
  createUrl: vi.fn(() => "blob:https://gotit.test/voice-sample"),
  revokeUrl: vi.fn(),
}));
vi.mock("../src/lib/product", async (original) => ({
  ...(await original<typeof import("../src/lib/product")>()),
  product: mocks.product,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("voice sample failure allows retry without microphone, a lesson or changing teacher preferences", async () => {
  mocks.product
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({
      contentType: "audio/mpeg",
      audioBase64: "AQID",
      teacherVoice: "male",
      sampleLanguageCode: "en",
    });
  mocks.play.mockResolvedValue(undefined);
  vi.stubGlobal("URL", {
    createObjectURL: mocks.createUrl,
    revokeObjectURL: mocks.revokeUrl,
  });
  vi.stubGlobal(
    "Audio",
    class {
      constructor(source: string) {
        mocks.audioSource(source);
      }
      play = mocks.play;
      pause = mocks.pause;
    },
  );
  const user = userEvent.setup(),
    view = render(<TeacherVoicePreview voice="male" />);
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.voiceSample") }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.voiceSample") }),
  );
  await waitFor(() => expect(mocks.play).toHaveBeenCalledOnce());
  expect(mocks.createUrl).toHaveBeenCalledWith(expect.any(Blob));
  expect(mocks.createUrl.mock.calls[0]?.[0]).toMatchObject({
    type: "audio/mpeg",
    size: 3,
  });
  expect(mocks.audioSource).toHaveBeenCalledWith(
    "blob:https://gotit.test/voice-sample",
  );
  expect(
    mocks.product.mock.calls.every(
      (call) =>
        call[1] === "private-lessons/voice-sample" &&
        call[3].teacherVoice === "male",
    ),
  ).toBe(true);
  view.unmount();
  expect(mocks.pause).toHaveBeenCalled();
  expect(mocks.revokeUrl).toHaveBeenCalledWith(
    "blob:https://gotit.test/voice-sample",
  );
});
