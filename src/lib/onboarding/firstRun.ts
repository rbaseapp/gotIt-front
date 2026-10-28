const key = (userId: string) => `gotit.onboarding.skipped.${userId}`;

/** True when this learner already chose "not now" (or finished) on this browser. */
export function firstRunSkipped(userId: string): boolean {
  try {
    return localStorage.getItem(key(userId)) === "1";
  } catch {
    return false;
  }
}

export function markFirstRunSkipped(userId: string) {
  try {
    localStorage.setItem(key(userId), "1");
  } catch {
    // Without storage the learner may be asked again; that is harmless.
  }
}
