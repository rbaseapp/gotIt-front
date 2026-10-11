/** Decorative feedback follows the learner's existing sound preference. */
export function focusTone(frequency = 660) {
  if (
    document.documentElement.dataset.feedbackSounds !== "true" ||
    !window.AudioContext
  )
    return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => void context.close();
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  } catch {
    /* Decoration never blocks practice or provider audio. */
  }
}
