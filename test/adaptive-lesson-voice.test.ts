import { describe, expect, it } from "vitest";
import { AdaptiveLessonVoice } from "../src/lib/adaptiveLessonVoice";
import type { LessonActivity } from "../src/lib/privateLesson";
const activity = (revision = 0, activityId = "task-1") =>
  ({
    protocolVersion: "adaptive-v1",
    status: "active",
    activityId,
    revision,
  }) as LessonActivity;
describe("adaptive lesson voice boundaries", () => {
  it("binds an utterance to the task where speech began and consumes it once", () => {
    const voice = new AdaptiveLessonVoice();
    voice.observe(
      { type: "input_audio_buffer.speech_started", item_id: "speech-1" },
      activity(),
    );
    const event = {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "speech-1",
      transcript: "Where is the station?",
    };
    expect(voice.observe(event, activity())).toEqual({
      text: "Where is the station?",
      activityId: "task-1",
      revision: 0,
    });
    expect(voice.observe(event, activity())).toBeNull();
  });
  it("discards delayed speech from an older task or revision", () => {
    for (const current of [activity(1), activity(0, "task-2")]) {
      const voice = new AdaptiveLessonVoice();
      voice.observe(
        { type: "input_audio_buffer.speech_started", item_id: "old" },
        activity(),
      );
      expect(
        voice.observe(
          {
            type: "conversation.item.input_audio_transcription.completed",
            item_id: "old",
            transcript: "Old answer",
          },
          current,
        ),
      ).toBeNull();
    }
  });
  it("does not invent attempts from empty, unbound or finished speech", () => {
    const voice = new AdaptiveLessonVoice();
    expect(
      voice.observe(
        {
          type: "conversation.item.input_audio_transcription.completed",
          item_id: "unknown",
          transcript: "Answer",
        },
        activity(),
      ),
    ).toBeNull();
    voice.observe(
      { type: "input_audio_buffer.committed", item_id: "empty" },
      activity(),
    );
    expect(
      voice.observe(
        {
          type: "conversation.item.input_audio_transcription.completed",
          item_id: "empty",
          transcript: " ",
        },
        activity(),
      ),
    ).toBeNull();
    expect(
      voice.observe(
        { type: "input_audio_buffer.committed", item_id: "finished" },
        { ...activity(), status: "exhausted" },
      ),
    ).toBeNull();
  });
});
