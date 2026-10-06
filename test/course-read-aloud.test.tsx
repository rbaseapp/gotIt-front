import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ReadAloud } from "../src/components/CourseComposer";
import i18n from "../src/i18n";

afterEach(() => vi.unstubAllGlobals());

it("reads the actual objective in its target language and allows stopping and cleanup", async () => {
  const voice = { lang: "ja-JP", name: "Device Japanese" };
  const synth = {
    getVoices: () => [{ lang: "en-US" }, voice],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const user = userEvent.setup();
  const view = render(
    <ReadAloud text="水をください。" language="ja" showLabel />,
  );
  await user.click(
    screen.getByRole("button", { name: i18n.t("courses.readAloud") }),
  );
  expect(synth.speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "水をください。",
      lang: "ja",
      voice,
      rate: 0.9,
    }),
  );
  await user.click(
    screen.getByRole("button", { name: i18n.t("courses.stopAudio") }),
  );
  expect(synth.speak).toHaveBeenCalledOnce();
  expect(synth.cancel).toHaveBeenCalled();
  view.unmount();
  expect(synth.removeEventListener).toHaveBeenCalledWith(
    "voiceschanged",
    expect.any(Function),
  );
});

it("does not offer a playback button when device speech is unavailable", () => {
  vi.stubGlobal("speechSynthesis", undefined);
  render(<ReadAloud text="A real objective" language="en" showLabel />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
