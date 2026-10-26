/** Reads English aloud with the browser's own voice: free, instant, no account needed. */
export const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, rate = 0.9): boolean {
  if (!canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
