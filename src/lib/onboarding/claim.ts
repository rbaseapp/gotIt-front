/**
 * Saves the onboarding result to the new account: the learner's level, the plan and
 * the words they know. The server applies it once and never overwrites real progress.
 */
import { curriculumApi, type PlacementClaimInput } from "../structuredEnglish";
import { buildPlan, type Goal } from "../placement/plan";
import type { Band, SkillStatus } from "../placement/types";
import { goalFromInterests, type OnboardingState } from "./state";

const BANDS: Band[] = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];
const bandOfUnit = (unit: number): Band => {
  const edges = [6, 18, 30, 48, 66, 84];
  const index = edges.findIndex((end) => unit <= end);
  return BANDS[index < 0 ? 5 : index]!;
};

function skill(status: SkillStatus, theta: number) {
  if (status === "unknown") return null;
  const shift = status === "strong" ? 8 : status === "weak" ? -8 : 0;
  return {
    band: bandOfUnit(Math.min(84, Math.max(1, theta + shift))),
    score: status === "strong" ? 0.9 : status === "ok" ? 0.75 : 0.4,
  };
}

export function claimPayload(
  state: OnboardingState,
  eventId: string,
): PlacementClaimInput | null {
  const result = state.result;
  if (!result) return null;
  const theta = Math.min(84, Math.max(0, result.theta + state.adjust));
  const startUnit = Math.min(84, Math.max(1, Math.round(theta - 2)));
  const goal: Goal = state.goal ?? goalFromInterests(state.interests);
  const plan = buildPlan({
    startUnit,
    goal,
    targetBand: state.targetBand,
    minutesPerDay: state.minutes,
    deadlineMonths: state.deadline,
  });
  return {
    eventId,
    theta,
    startUnit: plan.startUnit,
    literacy:
      result.literacy === "reader"
        ? "independent"
        : result.literacy === "developing"
          ? "developing"
          : "starting",
    minutesPerDay: state.minutes,
    goal,
    deadlineMonths: state.deadline,
    reliability: result.reliability,
    skills: {
      vocabulary: { band: bandOfUnit(theta), score: result.reliability },
      reading: skill(result.skills.reading, theta),
      listening: skill(result.skills.listening, theta),
    },
    ...(state.selfLevel !== null ||
    state.talk ||
    state.interests.length ||
    state.priorities.length ||
    state.targetBand
      ? {
          profile: {
            ...(state.selfLevel !== null ? { selfLevel: state.selfLevel } : {}),
            ...(state.talk ? { talk: state.talk } : {}),
            ...(state.interests.length ? { interests: state.interests } : {}),
            ...(state.priorities.length
              ? { priorities: state.priorities }
              : {}),
            ...(state.targetBand ? { targetBand: state.targetBand } : {}),
          },
        }
      : {}),
    knownWords: result.knownWords
      .filter((word) => /^[A-Za-z]{2,40}$/.test(word))
      .slice(0, 1500),
  };
}

export async function claimOnboarding(
  state: OnboardingState,
  options: { replace?: boolean } = {},
) {
  const payload = claimPayload(state, crypto.randomUUID());
  if (!payload) return null;
  return curriculumApi.place(
    options.replace ? { ...payload, replace: true } : payload,
  );
}

/** The first words the learner tapped become real saved words, so "My words" is never empty. */
export async function saveFirstWords(state: OnboardingState) {
  const { product, captureReceipt } = await import("../product");
  const words = state.firstWords
    .map((entry) => entry.split("|"))
    .filter((pair): pair is [string, string] => pair.length === 2)
    .filter(([en]) => state.firstWordsDone.includes(en));
  for (const [en, he] of words) {
    try {
      await product(
        captureReceipt,
        "captures",
        "POST",
        {
          item: {
            sourceText: en,
            sourceLanguageCode: "en",
            translationLanguageCode: "he",
            itemType: "word",
            partOfSpeech: null,
            phoneticText: null,
            phoneticScheme: null,
          },
          translation: { text: he, variants: [] },
          context: {
            sentenceText: null,
            paragraphText: null,
            pageTitle: null,
            pageUrl: null,
            selectedText: en,
            sourceType: "web_manual",
            capturedAt: new Date().toISOString(),
          },
          senseDecision: { mode: "auto" },
        },
        crypto.randomUUID(),
      );
    } catch {
      // A word that cannot be saved right now must not block the plan.
    }
  }
}
