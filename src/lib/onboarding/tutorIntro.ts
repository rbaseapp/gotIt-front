import type { PlacementResult } from "../placement/types";

/**
 * Estimated core words a learner should already know before we offer a first
 * conversation with the teacher. A starting value: tune it on real learners.
 */
export const TUTOR_INTRO_MIN_WORDS = 150;

/** A learner whose level check shows they can hold a short, simple conversation. */
export function canMeetTutor(result: PlacementResult | null | undefined) {
  if (!result) return false;
  return (
    result.theta >= 7 &&
    result.knownEstimate >= TUTOR_INTRO_MIN_WORDS &&
    result.literacy !== "starting" &&
    result.skills.listening !== "weak"
  );
}

/** The tap-to-answer conversation check: for learners who can read simple English. */
export function canTalkCheck(result: PlacementResult | null | undefined) {
  if (!result) return false;
  return (
    result.theta >= 7 &&
    result.knownEstimate >= TUTOR_INTRO_MIN_WORDS &&
    result.literacy !== "starting"
  );
}
