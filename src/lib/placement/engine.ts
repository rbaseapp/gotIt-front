/**
 * The "Pocket" placement engine: a short adaptive vocabulary check.
 *
 * The learner sees one word at a time and says "I know it" or "not yet". A share of
 * the cards are pronounceable non-words, which measure how freely the learner says
 * "know" (guessing). A handful of known words are then verified with a meaning
 * question, and two or three reading/listening probes show skill gaps.
 *
 * Everything is a Bayesian update over one scale, theta = position on the 84-unit
 * "English zero to C1" curriculum. Each word's difficulty is the unit that teaches it,
 * so the answer is directly the unit where the learner's plan should start.
 *
 * Pure TypeScript, no DOM: the same code runs in the UI and in the simulation tests.
 */
import type {
  Band,
  Card,
  Estimate,
  Literacy,
  Observation,
  PlacementBank,
  PlacementResult,
  Probe,
  Skill,
  SkillStatus,
  VerifyItem,
} from "./types";

export const GRID = 85; // theta = 0..84
/** Width (in units) of the transition between "mostly unknown" and "mostly known". */
export const WORD_SCALE = 8;
const PROBE_SCALE = 10;
const SLIP = 0.05;
const VERIFY_SLIP = 0.06;
const GUESS_CHANCE = 1 / 3;
/** Chance of picking the right meaning of a word one does not know (4 options, plus a "don't know" button). */
const MEANING_GUESS = 0.18;
/** Chance of tapping "I don't know" when one does not know the answer, and when one does. */
const DK_IF_UNKNOWN = 0.55;
const DK_IF_KNOWN = 0.04;
const PRIOR_SD = 18;

type Rng = () => number;
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function seededRandom(seed: number): Rng {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SessionOptions = {
  /** Where the first guess sits on the 0-84 scale (from what the learner said they want). */
  prior: number;
  /** "quick" is used for learners who only want to save words from the web. */
  mode?: "full" | "quick";
  /**
   * "meaning": every word is a multiple-choice meaning question (needs glosses in the
   * learner's language), so the answer is checked, not claimed.
   * "yesno": "I know it / not yet", with non-words to estimate guessing.
   */
  format?: "yesno" | "meaning";
  rng?: Rng;
  /** Posterior spread (in units) at which the check stops. Tuned by simulation. */
  sdTarget?: number;
  /**
   * A hard cap on all questions of the check (the start flow uses 10). It also stops the
   * check early once the estimate is steady, and skips the separate verification and probes.
   */
  maxQuestions?: number;
  /** How sure the first guess is, in units. A self-reported level is worth about 12. */
  priorSd?: number;
};

export class PlacementSession {
  readonly log: Observation[] = [];
  private readonly rng: Rng;
  private readonly mode: "full" | "quick";
  private readonly format: "yesno" | "meaning";
  private readonly priorMean: number;
  private readonly sdOverride?: number;
  private readonly maxQuestions?: number;
  private readonly priorSd: number;
  private readonly seen = new Set<string>();
  private readonly askedProbes = new Set<string>();
  private pseudoShown = 0;
  private cardCount = 0;
  private lastD = -1;

  constructor(
    private readonly bank: PlacementBank,
    options: SessionOptions,
  ) {
    this.rng = options.rng ?? Math.random;
    this.mode = options.mode ?? "full";
    this.format = options.format ?? "yesno";
    this.priorMean = clamp(options.prior, 0, 84);
    this.sdOverride = options.sdTarget;
    this.maxQuestions = options.maxQuestions;
    this.priorSd = options.priorSd ?? PRIOR_SD;
  }

  /** Rebuilds a session from a saved log, so a learner can close the tab and come back. */
  static restore(
    bank: PlacementBank,
    options: SessionOptions,
    log: Observation[],
  ) {
    const session = new PlacementSession(bank, options);
    for (const o of log) {
      session.log.push(o);
      if (o.t === "card") {
        session.seen.add(o.text.toLowerCase());
        session.cardCount += 1;
        if (!o.real) session.pseudoShown += 1;
        else session.lastD = o.d;
      } else if (o.t === "probe") session.askedProbes.add(o.id);
    }
    return session;
  }

  /* ---------------- limits ---------------- */
  private get maxCards() {
    if (this.maxQuestions) return this.maxQuestions;
    if (this.format === "meaning") return this.mode === "full" ? 20 : 14;
    return this.mode === "full" ? 40 : 22;
  }
  private get maxPseudo() {
    if (this.maxQuestions)
      return this.format === "meaning" ? 0 : Math.floor(this.maxQuestions / 5);
    if (this.format === "meaning") return 0;
    return this.mode === "full" ? 10 : 6;
  }
  private get sdTarget() {
    if (this.maxQuestions) return this.sdOverride ?? 7;
    // Chosen by simulation (see test/placement-engine.test.ts): about 22 cards, +-4 units.
    if (this.format === "meaning" && this.sdOverride === undefined)
      return this.mode === "full" ? 6 : 7.5;
    return this.sdOverride ?? (this.mode === "full" ? 5 : 6.5);
  }
  private get minCards() {
    if (this.maxQuestions) return Math.min(this.maxQuestions, 6);
    const beginner = this.estimate().median < 8;
    if (this.format === "meaning") {
      if (this.mode === "full") return beginner ? 8 : 10;
      return beginner ? 8 : 8;
    }
    if (this.mode === "full") return beginner ? 14 : 20;
    return beginner ? 10 : 12;
  }

  /* ---------------- posterior ---------------- */
  /** Share of "yes" answers to non-words, smoothed; also the guess rate on unknown real words. */
  falseAlarmRate() {
    const shown = this.log.filter((o) => o.t === "card" && !o.real);
    const yes = shown.filter((o) => o.t === "card" && o.yes).length;
    return clamp((1 + yes) / (10 + shown.length), 0.02, 0.85);
  }

  private posteriorFor(
    log: Observation[],
    mean: number,
    sd: number,
  ): Float64Array {
    const fa = this.falseAlarmRate();
    const post = new Float64Array(GRID);
    for (let theta = 0; theta < GRID; theta++) {
      let p = Math.exp(-0.5 * ((theta - mean) / sd) ** 2) + 1e-6;
      for (const o of log) {
        if (o.t === "card") {
          if (!o.real) continue;
          const know = sigmoid((theta - o.d) / WORD_SCALE);
          if (o.mc) {
            const pCorrect = know * (1 - SLIP) + (1 - know) * MEANING_GUESS;
            p *= o.yes ? pCorrect : 1 - pCorrect;
            continue;
          }
          const pYes = know * (1 - SLIP) + (1 - know) * fa;
          p *= o.yes ? pYes : 1 - pYes;
        } else if (o.t === "verify") {
          const know = sigmoid((theta - o.d) / WORD_SCALE) * (1 - VERIFY_SLIP);
          if (o.dk) {
            // An honest "I don't know" says much more than a wrong guess.
            p *= (1 - know) * DK_IF_UNKNOWN + know * DK_IF_KNOWN;
            continue;
          }
          const pCorrect = GUESS_CHANCE + (1 - GUESS_CHANCE) * know;
          p *= o.correct ? pCorrect : 1 - pCorrect;
        } else {
          const know = sigmoid((theta - o.d) / PROBE_SCALE) * (1 - SLIP);
          if (o.dk) {
            p *= (1 - know) * DK_IF_UNKNOWN + know * DK_IF_KNOWN;
            continue;
          }
          const pCorrect = GUESS_CHANCE + (1 - GUESS_CHANCE) * know;
          p *= o.correct ? pCorrect : 1 - pCorrect;
        }
      }
      post[theta] = p;
    }
    const total = post.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < GRID; i++) post[i] /= total;
    return post;
  }

  posterior() {
    // Word cards and verification are vocabulary evidence; probes are skill evidence.
    return this.posteriorFor(
      this.log.filter((o) => o.t !== "probe"),
      this.priorMean,
      this.priorSd,
    );
  }

  private summarise(post: Float64Array): Estimate {
    let mean = 0;
    for (let i = 0; i < GRID; i++) mean += i * post[i];
    let variance = 0;
    for (let i = 0; i < GRID; i++) variance += post[i] * (i - mean) ** 2;
    const quantile = (q: number) => {
      let sum = 0;
      for (let i = 0; i < GRID; i++) {
        sum += post[i];
        if (sum >= q) return i;
      }
      return GRID - 1;
    };
    return {
      median: quantile(0.5),
      mean,
      sd: Math.sqrt(variance),
      p25: quantile(0.25),
      p75: quantile(0.75),
    };
  }

  estimate(): Estimate {
    return this.summarise(this.posterior());
  }

  /* ---------------- cards ---------------- */
  get cards() {
    return this.cardCount;
  }

  get done() {
    if (this.cardCount >= this.maxCards) return true;
    if (this.cardCount < this.minCards) return false;
    return this.estimate().sd <= this.sdTarget;
  }

  nextCard(): Card | null {
    if (this.done) return null;
    const index = this.cardCount;
    if (index >= 3 && index % 4 === 3 && this.pseudoShown < this.maxPseudo) {
      const pool = this.bank.pseudo.filter((w) => !this.seen.has(w));
      if (pool.length) {
        const text = pool[Math.floor(this.rng() * pool.length)]!;
        return { kind: "pseudo", text, d: 0 };
      }
    }
    const { median } = this.estimate();
    // The first two cards are deliberately easy so nobody starts with two "not yet" answers.
    const target =
      index < 2 ? Math.max(1, median - 10) : median - 4 + this.rng() * 10;
    let best: { word: PlacementBank["words"][number]; score: number } | null =
      null;
    const meaning = this.format === "meaning";
    for (const word of this.bank.words) {
      const key = word[0].toLowerCase();
      if (this.seen.has(key)) continue;
      if (meaning && !word[2]) continue;
      let score = Math.abs(word[1] - target) + this.rng() * 1.5;
      if (word[1] === this.lastD) score += 4;
      if (!best || score < best.score) best = { word, score };
    }
    if (!best) return null;
    if (meaning) {
      const gloss = best.word[2]!;
      // Hebrew infinitives start with lamed: keep verbs among verbs so the
      // part of speech does not give the answer away.
      const looksLikeVerb = (g: string) =>
        g.startsWith("ל") && !g.includes(" ");
      const verb = looksLikeVerb(gloss);
      const candidates = this.bank.words.filter(
        (other) =>
          other[2] &&
          other[2] !== gloss &&
          other[0] !== best!.word[0] &&
          Math.abs(other[1] - best!.word[1]) <= 16,
      );
      const sameKind = candidates.filter(
        (other) => looksLikeVerb(other[2]!) === verb,
      );
      const distractors = this.shuffle(
        sameKind.length >= 6 ? sameKind : candidates,
      )
        .map((other) => other[2]!)
        .filter((g, i, all) => all.indexOf(g) === i)
        .slice(0, 3);
      const options = this.shuffle([gloss, ...distractors]);
      return {
        kind: "word",
        text: best.word[0],
        d: best.word[1],
        options,
        answer: options.indexOf(gloss),
      };
    }
    return { kind: "word", text: best.word[0], d: best.word[1] };
  }

  answerCard(card: Card, yes: boolean, ms: number) {
    const real = card.kind === "word";
    this.seen.add(card.text.toLowerCase());
    this.cardCount += 1;
    if (!real) this.pseudoShown += 1;
    else this.lastD = card.d;
    this.log.push({
      t: "card",
      text: card.text,
      real,
      d: card.d,
      yes,
      ms,
      ...(card.options ? { mc: true } : {}),
    });
  }

  /** Undo the last card answer (the learner tapped back). */
  undoCard() {
    for (let i = this.log.length - 1; i >= 0; i--) {
      const o = this.log[i]!;
      if (o.t !== "card") return false;
      this.log.splice(i, 1);
      this.seen.delete(o.text.toLowerCase());
      this.cardCount -= 1;
      if (!o.real) this.pseudoShown -= 1;
      return true;
    }
    return false;
  }

  /* ---------------- verification ---------------- */
  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  verifyItems(count = 4): VerifyItem[] {
    // Meaning questions already check every answer; no separate verification.
    if (this.format === "meaning") return [];
    const { median } = this.estimate();
    const glosses = new Map(
      this.bank.words.filter((w) => w[2]).map((w) => [w[0].toLowerCase(), w]),
    );
    const claimed = this.log
      .filter((o) => o.t === "card" && o.real && o.yes)
      .map((o) => glosses.get((o as { text: string }).text.toLowerCase()))
      .filter((w): w is NonNullable<typeof w> => Boolean(w));
    if (claimed.length < 2) return [];
    // Words near the learner's boundary tell us the most about over-claiming.
    const nearEdge = claimed
      .filter((w) => w[1] >= median - 8)
      .sort((a, b) => b[1] - a[1]);
    const pool =
      nearEdge.length >= count
        ? nearEdge
        : [...claimed].sort((a, b) => b[1] - a[1]);
    const chosen = this.shuffle(pool.slice(0, Math.max(count, 8))).slice(
      0,
      count,
    );
    return chosen.map((word) => {
      const distractors = this.shuffle(
        this.bank.words.filter(
          (other) =>
            other[2] &&
            other[2] !== word[2] &&
            other[0] !== word[0] &&
            Math.abs(other[1] - word[1]) <= 14,
        ),
      )
        .map((other) => other[2]!)
        .filter((gloss, i, all) => all.indexOf(gloss) === i)
        .slice(0, 2);
      const options = this.shuffle([word[2]!, ...distractors]);
      return {
        text: word[0],
        d: word[1],
        options,
        answer: options.indexOf(word[2]!),
      };
    });
  }

  answerVerify(item: VerifyItem, picked: number | null, ms: number) {
    this.log.push({
      t: "verify",
      text: item.text,
      d: item.d,
      correct: picked === item.answer,
      ...(picked === null ? { dk: true } : {}),
      ms,
    });
  }

  /* ---------------- skill probes ---------------- */
  nextProbe(skill: Skill): Probe | null {
    const previous = this.log.filter(
      (o): o is Extract<Observation, { t: "probe" }> =>
        o.t === "probe" && o.skill === skill,
    );
    const { median } = this.estimate();
    let target = median;
    const last = previous.at(-1);
    if (last) target = last.d + (last.correct ? 14 : -14);
    const items = this.bank.probes[skill]
      .filter((p) => !this.askedProbes.has(p.id))
      .map((p) => ({ p, score: Math.abs(p.d - target) + this.rng() * 2 }))
      .sort((a, b) => a.score - b.score);
    return items[0]?.p ?? null;
  }

  answerProbe(probe: Probe, skill: Skill, picked: number | null, ms: number) {
    this.askedProbes.add(probe.id);
    this.log.push({
      t: "probe",
      id: probe.id,
      skill,
      d: probe.d,
      correct: picked === probe.a,
      ...(picked === null ? { dk: true } : {}),
      ms,
    });
  }

  private skillStatus(skill: Skill, vocabulary: number): SkillStatus {
    const probes = this.log.filter(
      (o): o is Extract<Observation, { t: "probe" }> =>
        o.t === "probe" && o.skill === skill,
    );
    if (!probes.length) return "unknown";
    const post = this.posteriorFor(probes, vocabulary, 12);
    const level = this.summarise(post).median;
    if (level >= vocabulary + 6) return "strong";
    if (level <= vocabulary - 6) return "weak";
    return "ok";
  }

  /* ---------------- result ---------------- */
  bandOf(unit: number): Band {
    return this.bank.units[clamp(Math.round(unit), 1, 84) - 1]!.band;
  }

  private knownEstimate(post: Float64Array) {
    let expected = 0;
    for (const word of this.bank.words) {
      let p = 0;
      for (let theta = 0; theta < GRID; theta++)
        p += post[theta]! * sigmoid((theta - word[1]) / WORD_SCALE);
      expected += p;
    }
    const scaled = (expected / this.bank.words.length) * this.bank.total;
    return Math.round(scaled / 50) * 50;
  }

  reliability() {
    const verify = this.log.filter((o) => o.t === "verify");
    const wrong = verify.filter((o) => o.t === "verify" && !o.correct).length;
    const fa = this.falseAlarmRate();
    const score =
      1 -
      0.8 * Math.max(0, fa - 0.08) -
      (verify.length ? 0.45 * (wrong / verify.length) : 0);
    return clamp(score, 0, 1);
  }

  result(extra: { literacy: Literacy; seconds: number }): PlacementResult {
    const post = this.posterior();
    const est = this.summarise(post);
    const theta = est.median;
    const band = this.bandOf(theta);
    const bandUnits = this.bank.units
      .map((u, i) => (u.band === band ? i + 1 : 0))
      .filter(Boolean);
    const first = bandUnits[0]!;
    const span = bandUnits.length;
    const progress = (Math.max(1, theta) - first) / span;
    const sub = progress < 1 / 3 ? "low" : progress < 2 / 3 ? "mid" : "high";
    const lowBand = this.bandOf(est.p25);
    const highBand = this.bandOf(est.p75);
    const reliability = this.reliability();
    const claimed = this.log.filter(
      (o): o is Extract<Observation, { t: "card" }> =>
        o.t === "card" && o.real && o.yes,
    );
    const contradicted = new Set(
      this.log
        .filter((o) => o.t === "verify" && !o.correct)
        .map((o) => (o as { text: string }).text.toLowerCase()),
    );
    const seeds = this.log
      .filter(
        (o): o is Extract<Observation, { t: "card" }> =>
          o.t === "card" &&
          o.real &&
          !o.yes &&
          o.d >= theta - 4 &&
          o.d <= theta + 10,
      )
      .sort((a, b) => Math.abs(a.d - theta - 2) - Math.abs(b.d - theta - 2))
      .map((o) => o.text);
    return {
      theta,
      low: est.p25,
      high: est.p75,
      startUnit: clamp(Math.round(theta - 2), 1, 84),
      band,
      sub,
      upperBand: highBand !== lowBand ? highBand : null,
      knownEstimate: this.knownEstimate(post),
      total: this.bank.total,
      skills: {
        vocabulary: "ok",
        reading: this.skillStatus("reading", theta),
        listening: this.skillStatus("listening", theta),
      },
      reliability,
      uncertain: est.sd > 6 || reliability < 0.5,
      literacy: extra.literacy,
      cards: this.cardCount,
      seconds: extra.seconds,
      knownWords: claimed
        .filter((o) => !contradicted.has(o.text.toLowerCase()))
        .map((o) => o.text),
      seedWords: seeds,
    };
  }
}
