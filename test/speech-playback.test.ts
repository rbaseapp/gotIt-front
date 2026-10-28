import { expect, it, vi } from "vitest";
import { speak } from "../src/lib/utils";

function speechFixture() {
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const synth = { cancel: vi.fn(), speak: vi.fn() };
  vi.stubGlobal("speechSynthesis", synth);
  return synth;
}

it.each(["onend", "onerror"] as const)(
  "finishes speech on %s exactly once",
  (event) => {
    const synth = speechFixture();
    const finish = vi.fn();
    const text = "Hello, my name is Noa. It is nice to meet you.";
    expect(speak(text, "en", 0.85, finish)).toBe(true);
    const utterance = synth.speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance).toMatchObject({ text, lang: "en", rate: 0.85 });
    expect(finish).not.toHaveBeenCalled();
    utterance[event]!(new Event(event) as SpeechSynthesisEvent);
    utterance.onend!(new Event("end") as SpeechSynthesisEvent);
    expect(finish).toHaveBeenCalledTimes(1);
  },
);

it("reports unavailable or rejected speech instead of leaving playback pending", () => {
  vi.stubGlobal("speechSynthesis", undefined);
  expect(speak("hello")).toBe(false);
  const synth = speechFixture();
  synth.speak.mockImplementation(() => {
    throw new Error("Audio unavailable");
  });
  const finish = vi.fn();
  expect(speak("hello", "en", 0.85, finish)).toBe(false);
  expect(finish).toHaveBeenCalledOnce();
});
