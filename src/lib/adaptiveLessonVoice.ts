import type { LessonActivity } from "./privateLesson";

/** A late/duplicate transcription must never become an answer to a newer task. */
export class AdaptiveLessonVoice {
  private items = new Map<string, { activityId: string; revision: number }>();
  private consumed = new Set<string>();

  observe(event: Record<string, unknown>, activity: LessonActivity | null) {
    if (!activity?.activityId || activity.status !== "active") return null;
    const id = typeof event.item_id === "string" ? event.item_id : null;
    if (!id) return null;
    if (
      event.type === "input_audio_buffer.speech_started" ||
      event.type === "input_audio_buffer.committed"
    ) {
      if (!this.items.has(id))
        this.items.set(id, {
          activityId: activity.activityId,
          revision: activity.revision,
        });
      if (this.items.size > 256)
        this.items.delete(this.items.keys().next().value!);
      return null;
    }
    if (
      event.type !== "conversation.item.input_audio_transcription.completed" ||
      this.consumed.has(id)
    )
      return null;
    const original = this.items.get(id);
    this.consumed.add(id);
    if (this.consumed.size > 256)
      this.consumed.delete(this.consumed.values().next().value!);
    if (
      !original ||
      original.activityId !== activity.activityId ||
      original.revision !== activity.revision ||
      typeof event.transcript !== "string" ||
      !event.transcript.trim()
    )
      return null;
    return { text: event.transcript.trim(), ...original };
  }
}
