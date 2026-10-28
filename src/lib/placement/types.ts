export type Band = "Pre-A1" | "A1" | "A2" | "B1" | "B2" | "C1";
export type Skill = "reading" | "listening";
export type SkillStatus = "strong" | "ok" | "weak" | "unknown";
export type Literacy = "reader" | "developing" | "starting";

/** [english, difficulty = curriculum unit 1-84, short Hebrew gloss or null] */
export type BankWord = readonly [en: string, d: number, he: string | null];

export type Probe = {
  id: string;
  d: number;
  text?: string;
  audio?: string;
  q: string;
  options: string[];
  a: number;
};

export type PlacementBank = {
  v: 1;
  /** Words in the whole GotIt catalogue (the bank excludes phrases and loanwords). */
  total: number;
  units: { id: string; band: Band }[];
  words: BankWord[];
  pseudo: string[];
  probes: { reading: Probe[]; listening: Probe[] };
};

export type Card = {
  kind: "word" | "pseudo";
  text: string;
  d: number;
  /** Meaning question: the gloss options and the index of the right one. */
  options?: string[];
  answer?: number;
};

export type VerifyItem = {
  text: string;
  d: number;
  options: string[];
  answer: number;
};

export type Observation =
  | {
      t: "card";
      text: string;
      real: boolean;
      d: number;
      yes: boolean;
      ms: number;
      /** Answered as a meaning question: `yes` then means "picked the right meaning". */
      mc?: boolean;
    }
  | {
      t: "verify";
      text: string;
      d: number;
      correct: boolean;
      /** The learner chose "I don't know" instead of guessing. */
      dk?: boolean;
      ms: number;
    }
  | {
      t: "probe";
      id: string;
      skill: Skill;
      d: number;
      correct: boolean;
      /** The learner chose "I don't know" instead of guessing. */
      dk?: boolean;
      ms: number;
    };

export type Estimate = {
  median: number;
  mean: number;
  sd: number;
  p25: number;
  p75: number;
};

export type PlacementResult = {
  /** Learner position on the 0-84 unit scale (median of the posterior). */
  theta: number;
  low: number;
  high: number;
  /** Unit where the personal plan starts (two units of review below the level). */
  startUnit: number;
  band: Band;
  sub: "low" | "mid" | "high";
  /** Second band when the plausible range straddles a boundary. */
  upperBand: Band | null;
  /** Estimated core words known, out of the catalogue total, rounded to 50. */
  knownEstimate: number;
  total: number;
  skills: Record<Skill, SkillStatus> & { vocabulary: SkillStatus };
  reliability: number;
  uncertain: boolean;
  literacy: Literacy;
  cards: number;
  seconds: number;
  /** Words the learner marked as known and did not contradict. */
  knownWords: string[];
  /** Words marked as not known near the learner's level: the first things to learn. */
  seedWords: string[];
};
