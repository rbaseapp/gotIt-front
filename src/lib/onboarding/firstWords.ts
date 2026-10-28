import type { PlacementBank } from "../placement/types";
import type { OnboardingState } from "./state";

/** Up to three words the learner does not have yet, at their level, with a Hebrew gloss. */
export function firstWordsFor(state: OnboardingState, bank: PlacementBank) {
  const gloss = new Map(
    bank.words.filter((w) => w[2]).map((w) => [w[0].toLowerCase(), w]),
  );
  const picked: Array<{ en: string; he: string }> = [];
  for (const word of state.result?.seedWords ?? []) {
    const entry = gloss.get(word.toLowerCase());
    if (entry && picked.length < 3)
      picked.push({ en: entry[0], he: entry[2]! });
  }
  if (picked.length < 3) {
    const theta = (state.result?.theta ?? 20) + state.adjust;
    const known = new Set(
      (state.result?.knownWords ?? []).map((w) => w.toLowerCase()),
    );
    for (const entry of bank.words
      .filter(
        (w) =>
          w[2] &&
          w[1] >= theta &&
          w[1] <= theta + 10 &&
          !known.has(w[0].toLowerCase()),
      )
      .sort((a, b) => a[1] - b[1])) {
      if (picked.length >= 3) break;
      if (!picked.some((p) => p.en === entry[0]))
        picked.push({ en: entry[0], he: entry[2]! });
    }
  }
  return picked;
}
