/** Playback and learner activity, rather than generation completion, start the
 * thinking-time clock. This controller never schedules timers or sends audio. */
export class PrivateLessonFlow {
  private lastActivity: number;
  private lastAudio = -Infinity;
  private generating = false;
  private playing = false;
  private speaking = false;
  private pendingEventId: string | null = null;
  private attempts = 0;
  private paused = false;
  needsContinue = false;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly thinkingTimeMs = 15_000,
  ) {
    this.lastActivity = now();
  }

  get busy() {
    return (
      this.generating ||
      this.playing ||
      this.speaking ||
      this.pendingEventId !== null ||
      this.now() - this.lastAudio < 1_000
    );
  }

  setPaused(paused: boolean) {
    if (paused || paused !== this.paused) this.lastActivity = this.now();
    this.paused = paused;
  }

  microphoneMuted() {
    // A muted track may never produce the matching speech_stopped event.
    this.speaking = false;
    this.lastActivity = this.now();
  }

  audioLevel(level: number) {
    if (level > 0.015) this.lastAudio = this.lastActivity = this.now();
  }

  requested(eventId: string) {
    this.pendingEventId = eventId;
    this.needsContinue = false;
    this.lastActivity = this.now();
  }

  sendFailed() {
    this.pendingEventId = null;
    this.needsContinue = true;
    this.lastActivity = this.now();
  }

  observe(event: Record<string, unknown>) {
    switch (event.type) {
      case "response.created":
        this.pendingEventId = null;
        this.generating = true;
        this.needsContinue = false;
        break;
      case "response.done": {
        this.pendingEventId = null;
        this.generating = false;
        const response = event.response as { status?: string } | undefined;
        if (response?.status === "failed" || response?.status === "incomplete")
          this.needsContinue = true;
        // Audio may still be playing after generation is complete.
        break;
      }
      case "output_audio_buffer.started":
        this.playing = true;
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        this.playing = false;
        break;
      case "input_audio_buffer.speech_started":
        this.speaking = true;
        this.attempts = 0;
        this.needsContinue = false;
        break;
      case "input_audio_buffer.speech_stopped":
        this.speaking = false;
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (typeof event.transcript !== "string" || !event.transcript.trim())
          return;
        this.attempts = 0;
        this.needsContinue = false;
        break;
      case "response.output_audio_transcript.delta":
        break;
      case "error": {
        const error = event.error as
          { event_id?: string; code?: string } | undefined;
        // Never clear a genuinely active response because a concurrent request
        // or an unrelated session/transcription event failed.
        if (!this.pendingEventId || error?.event_id !== this.pendingEventId)
          return;
        this.pendingEventId = null;
        if (error.code === "conversation_already_has_active_response")
          this.generating = true;
        this.needsContinue = true;
        break;
      }
      default:
        return;
    }
    this.lastActivity = this.now();
  }

  /** Reserve before returning true so the next tick cannot send a duplicate. */
  shouldContinue(eventId: string, manual = false) {
    if (this.paused || this.busy) return false;
    if (!manual) {
      if (
        this.needsContinue ||
        this.now() - this.lastActivity < this.thinkingTimeMs
      )
        return false;
      if (this.attempts >= 2) {
        this.needsContinue = true;
        return false;
      }
      this.attempts += 1;
    } else {
      this.attempts = 0;
    }
    this.requested(eventId);
    return true;
  }
}
