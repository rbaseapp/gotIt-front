import { describe, expect, it } from "vitest";
import { PrivateLessonFlow } from "../src/lib/privateLessonFlow";

function clock(thinkingTime?: number) {
  let time = 0;
  const flow = new PrivateLessonFlow(() => time, thinkingTime);
  return {
    flow,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("private lesson silence recovery", () => {
  it("waits for actual playback completion and a full thinking interval", () => {
    const { flow, advance } = clock();
    flow.observe({ type: "response.created" });
    flow.observe({ type: "output_audio_buffer.started" });
    flow.observe({ type: "response.done" });
    advance(40_000);
    expect(flow.shouldContinue("too-early")).toBe(false);
    flow.observe({ type: "output_audio_buffer.stopped" });
    advance(14_999);
    expect(flow.shouldContinue("still-thinking")).toBe(false);
    advance(1);
    expect(flow.shouldContinue("hint")).toBe(true);
    advance(30_000);
    expect(flow.shouldContinue("duplicate")).toBe(false);
  });

  it("protects learner speech, interruptions and freshly completed answers", () => {
    const { flow, advance } = clock();
    flow.observe({ type: "output_audio_buffer.started" });
    flow.observe({ type: "input_audio_buffer.speech_started" });
    flow.observe({ type: "output_audio_buffer.cleared" });
    flow.observe({ type: "response.done", response: { status: "cancelled" } });
    advance(60_000);
    expect(flow.shouldContinue("interrupt")).toBe(false);
    flow.observe({ type: "input_audio_buffer.speech_stopped" });
    advance(1_000);
    flow.observe({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "My answer.",
    });
    advance(14_999);
    expect(flow.shouldContinue("thinking")).toBe(false);
    advance(1);
    expect(flow.shouldContinue("next-step")).toBe(true);
  });

  it("also respects received audio when playback events are delayed", () => {
    const { flow, advance } = clock();
    flow.observe({ type: "response.done" });
    advance(20_000);
    flow.audioLevel(0.2);
    expect(flow.shouldContinue("over-audio", true)).toBe(false);
    advance(14_999);
    expect(flow.shouldContinue("early")).toBe(false);
    advance(1);
    expect(flow.shouldContinue("hint")).toBe(true);
  });

  it("allows at most two automatic hints without learner activity, then offers manual continuation", () => {
    const { flow, advance } = clock();
    for (let index = 0; index < 2; index++) {
      advance(15_000);
      expect(flow.shouldContinue(`hint-${index}`)).toBe(true);
      flow.observe({ type: "response.created" });
      flow.observe({ type: "response.done" });
    }
    advance(15_000);
    expect(flow.shouldContinue("third-hint")).toBe(false);
    expect(flow.needsContinue).toBe(true);
    advance(60_000);
    flow.observe({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: " ",
    });
    expect(flow.shouldContinue("empty-is-not-an-answer")).toBe(false);
    expect(flow.shouldContinue("manual", true)).toBe(true);
    expect(flow.needsContinue).toBe(false);
  });

  it("starts a fresh interval after mute, hidden tab, offline or wrapping suspension", () => {
    const { flow, advance } = clock(20_000);
    flow.observe({ type: "input_audio_buffer.speech_started" });
    flow.microphoneMuted();
    flow.setPaused(true);
    advance(60_000);
    expect(flow.shouldContinue("paused", true)).toBe(false);
    flow.setPaused(false);
    advance(19_999);
    expect(flow.shouldContinue("too-soon")).toBe(false);
    advance(1);
    expect(flow.shouldContinue("resumed")).toBe(true);
  });

  it("recovers from send errors and failed responses without an automatic retry loop", () => {
    const { flow, advance } = clock();
    advance(15_000);
    flow.shouldContinue("hint");
    flow.sendFailed();
    expect(flow.needsContinue).toBe(true);
    advance(60_000);
    expect(flow.shouldContinue("auto-retry")).toBe(false);
    expect(flow.shouldContinue("manual", true)).toBe(true);
    flow.observe({ type: "response.created" });
    flow.observe({ type: "response.done", response: { status: "failed" } });
    expect(flow.needsContinue).toBe(true);
    expect(flow.shouldContinue("retry-failed", true)).toBe(true);
  });

  it("handles a response-create/VAD race without generating overlapping responses", () => {
    const { flow, advance } = clock();
    advance(15_000);
    flow.shouldContinue("hint");
    flow.observe({
      type: "error",
      error: { event_id: "unrelated", code: "invalid_value" },
    });
    expect(flow.shouldContinue("duplicate", true)).toBe(false);
    flow.observe({
      type: "error",
      error: {
        event_id: "hint",
        code: "conversation_already_has_active_response",
      },
    });
    expect(flow.shouldContinue("overlapping", true)).toBe(false);
    flow.observe({ type: "response.done" });
    expect(flow.shouldContinue("manual", true)).toBe(true);
  });

  it("restores the hint budget when the learner returns", () => {
    const { flow, advance } = clock();
    for (let index = 0; index < 2; index++) {
      advance(15_000);
      expect(flow.shouldContinue(String(index))).toBe(true);
      flow.observe({ type: "response.done" });
    }
    flow.observe({ type: "input_audio_buffer.speech_started" });
    flow.observe({ type: "input_audio_buffer.speech_stopped" });
    advance(15_000);
    expect(flow.shouldContinue("new-hint")).toBe(true);
  });
});
