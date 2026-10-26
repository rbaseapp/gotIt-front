/**
 * The short "talk with Rachel" check, answered by tapping. Rachel asks a question in
 * English, the learner picks the best reply. It adds what the word check cannot see:
 * grammar and understanding in use, in the learner's own topic.
 *
 * It only nudges the level (at most two units either way): the word check stays the
 * measurement, this fine-tunes it.
 */
import type { Goal } from "./plan";

export type TalkBand = "A1" | "A2" | "B1" | "B2";
export type TalkTopic = "general" | "work" | "travel";
export type TalkItem = {
  id: string;
  band: TalkBand;
  topic: TalkTopic;
  /** What Rachel says. */
  prompt: string;
  /** Right answer first; the order is shuffled when shown. */
  replies: [string, string, string];
};

const item = (
  band: TalkBand,
  topic: TalkTopic,
  n: number,
  prompt: string,
  replies: [string, string, string],
): TalkItem => ({ id: `${band}-${topic}-${n}`, band, topic, prompt, replies });

export const TALK_ITEMS: TalkItem[] = [
  item("A1", "general", 1, "What is your name?", [
    "My name is Dana.",
    "I am name Dana.",
    "Name Dana my.",
  ]),
  item("A1", "general", 2, "Where do you live?", [
    "I live in Haifa.",
    "I living Haifa.",
    "I lives at Haifa.",
  ]),
  item("A1", "general", 3, "Do you like coffee?", [
    "Yes, I do.",
    "Yes, I like.",
    "Yes, I does.",
  ]),
  item("A1", "work", 1, "What do you do?", [
    "I work in a school.",
    "I am work in school.",
    "I working school.",
  ]),
  item("A1", "work", 2, "What time do you start work?", [
    "I start at nine.",
    "I starts nine.",
    "I start in nine o'clock.",
  ]),
  item("A1", "work", 3, "Do you work every day?", [
    "No, I work from Sunday to Thursday.",
    "No, I works Sunday Thursday.",
    "No, I am work Sunday.",
  ]),
  item("A1", "travel", 1, "Where are you from?", [
    "I am from Israel.",
    "I from Israel am.",
    "I am of Israel from.",
  ]),
  item("A1", "travel", 2, "How much is the ticket?", [
    "It is ten euros.",
    "It are ten euros.",
    "Is ten euro it.",
  ]),
  item("A1", "travel", 3, "Do you want water?", [
    "Yes, please.",
    "Yes, I want water please you.",
    "Yes, I wants.",
  ]),
  item("A2", "general", 1, "What did you do yesterday?", [
    "I watched a movie.",
    "I watch a movie yesterday.",
    "I have watched a movie yesterday.",
  ]),
  item("A2", "general", 2, "What are you going to do tomorrow?", [
    "I'm going to visit my friend.",
    "I going visit my friend.",
    "I will to visit my friend.",
  ]),
  item("A2", "general", 3, "Which is bigger, a cat or a dog?", [
    "A dog is bigger than a cat.",
    "A dog is more big than a cat.",
    "A dog is biggest than a cat.",
  ]),
  item("A2", "work", 1, "What did you do at work today?", [
    "I had two meetings.",
    "I have two meetings yesterday.",
    "I did had two meetings.",
  ]),
  item("A2", "work", 2, "Can you send me the report?", [
    "Sure, I'll send it now.",
    "Sure, I sent it tomorrow.",
    "Sure, I sending it now.",
  ]),
  item("A2", "work", 3, "When is the meeting?", [
    "It is at three o'clock.",
    "It is in three o'clock.",
    "It at three is.",
  ]),
  item("A2", "travel", 1, "Excuse me, how do I get to the station?", [
    "Go straight and turn left.",
    "Go straight and turns left.",
    "Going straight and turn to left.",
  ]),
  item("A2", "travel", 2, "What did you see on your trip?", [
    "We saw an old castle.",
    "We seen an old castle.",
    "We see an old castle yesterday.",
  ]),
  item("A2", "travel", 3, "Would you like a window seat?", [
    "Yes, please.",
    "Yes, I am like.",
    "Yes, I does please.",
  ]),
  item("B1", "general", 1, "If you had more free time, what would you do?", [
    "I would travel more.",
    "I will travel more.",
    "I would travelled more.",
  ]),
  item("B1", "general", 2, "Have you ever tried sushi?", [
    "Yes, I have tried it twice.",
    "Yes, I tried it twice ago.",
    "Yes, I have try it twice.",
  ]),
  item("B1", "general", 3, "What do you think about working from home?", [
    "I think it is more flexible than going to the office.",
    "I think it is more flexible that going to office.",
    "I think it flexible more than the office is.",
  ]),
  item("B1", "work", 1, "How long have you worked here?", [
    "I've worked here for three years.",
    "I work here since three years.",
    "I am working here for three years ago.",
  ]),
  item("B1", "work", 2, "Could you explain the problem?", [
    "Of course. The system stopped working after the update.",
    "Of course. The system stop work after update.",
    "Of course. System was stopping after updated.",
  ]),
  item("B1", "work", 3, "What would you do if a client complained?", [
    "I would listen carefully and apologize.",
    "I will listening carefully and apologizing.",
    "I would listened carefully and apologize.",
  ]),
  item("B1", "travel", 1, "What was the best part of your trip?", [
    "The food was incredible, and the people were friendly.",
    "The food were incredible and people was friendly.",
    "Food it was incredible and the people friendly were.",
  ]),
  item("B1", "travel", 2, "Have you booked a hotel yet?", [
    "Not yet, but I'm looking at a few options.",
    "Not yet, but I look at few options.",
    "No yet, but I am looked at a few options.",
  ]),
  item("B1", "travel", 3, "What should I pack for the trip?", [
    "You should bring warm clothes because it gets cold at night.",
    "You should to bring warm clothes because it get cold at night.",
    "You should bring warm clothes because it getting cold at night.",
  ]),
  item("B2", "general", 1, "Do you think technology has made life easier?", [
    "Not entirely; although it saves time, it also creates new pressures.",
    "Not entirely; despite it saves time, it also creates new pressures.",
    "Not entirely; although it saves time, it also create new pressure.",
  ]),
  item(
    "B2",
    "general",
    2,
    "Had you known about the delay, what would you have done?",
    [
      "I would have taken an earlier flight.",
      "I would have took an earlier flight.",
      "I will have taken an earlier flight.",
    ],
  ),
  item("B2", "general", 3, "How would you summarize the article?", [
    "It argues that cities should invest more in public transport.",
    "It argues that cities should to invest more public transport.",
    "It is arguing that cities should invested more in public transport.",
  ]),
  item(
    "B2",
    "work",
    1,
    "What would you change about the project, looking back?",
    [
      "I would have involved the client earlier.",
      "I would involve the client earlier have.",
      "I will have involved the client earlier.",
    ],
  ),
  item("B2", "work", 2, "Why was the deadline missed?", [
    "The team was understaffed, which caused delays.",
    "The team were understaff, what caused delays.",
    "The team was understaffed, who caused delays.",
  ]),
  item("B2", "work", 3, "Could you give me an update on the budget?", [
    "We're slightly over budget, but we expect to recover the difference next quarter.",
    "We are slightly over of budget, but we expect recovering the difference next quarter.",
    "We're slightly over budget, but we are expecting to recovered the difference next quarter.",
  ]),
  item("B2", "travel", 1, "What made the trip memorable?", [
    "Having no fixed plan meant we discovered places we would never have found otherwise.",
    "Having no fixed plan meant we discovered places we will never found otherwise.",
    "To have no fixed plan means we discovering places we would never have found otherwise.",
  ]),
  item("B2", "travel", 2, "How did the flight delay affect your plans?", [
    "We missed our connection, so we had to rebook.",
    "We missed our connection, so we had rebooked.",
    "We were missing our connection, so we have to rebooked.",
  ]),
  item("B2", "travel", 3, "Would you recommend the hotel?", [
    "Absolutely, as long as you don't mind the noise.",
    "Absolutely, as long as you wouldn't mind the noise.",
    "Absolutely, as long as you don't minded the noise.",
  ]),
];

const BANDS: TalkBand[] = ["A1", "A2", "B1", "B2"];
export const TALK_QUESTIONS = 4;

export const topicForGoal = (goal: Goal | null): TalkTopic =>
  goal === "work" || goal === "study" || goal === "abroad"
    ? "work"
    : goal === "travel"
      ? "travel"
      : "general";

/** A level on the 0-84 unit scale to the band the first question comes from. */
export const talkBandFor = (theta: number): TalkBand =>
  theta < 19 ? "A1" : theta < 31 ? "A2" : theta < 49 ? "B1" : "B2";

/** Nudge, in units, from the number of right answers out of four. */
export const talkDelta = (correct: number) =>
  Math.max(-2, Math.min(2, correct - 2));

type Rng = () => number;

export class TalkCheck {
  readonly answers: boolean[] = [];
  private band: TalkBand;
  private readonly used = new Set<string>();

  constructor(
    theta: number,
    private readonly topic: TalkTopic,
    private readonly rng: Rng = Math.random,
  ) {
    this.band = talkBandFor(theta);
  }

  get done() {
    return this.answers.length >= TALK_QUESTIONS;
  }

  get correct() {
    return this.answers.filter(Boolean).length;
  }

  /** The next question with its replies shuffled, or null when the check is over. */
  next(): { item: TalkItem; replies: string[]; answer: number } | null {
    if (this.done) return null;
    const pool = TALK_ITEMS.filter(
      (candidate) =>
        candidate.band === this.band &&
        !this.used.has(candidate.id) &&
        (candidate.topic === this.topic || candidate.topic === "general"),
    );
    // Prefer the learner's own topic, then the general ones.
    const own = pool.filter((candidate) => candidate.topic === this.topic);
    const from = own.length ? own : pool;
    let chosen = from[Math.floor(this.rng() * from.length)];
    if (!chosen) {
      // Every question of this level was used: take the nearest level that has one left.
      const here = BANDS.indexOf(this.band);
      chosen = TALK_ITEMS.filter(
        (candidate) =>
          !this.used.has(candidate.id) &&
          (candidate.topic === this.topic || candidate.topic === "general"),
      ).sort(
        (a, b) =>
          Math.abs(BANDS.indexOf(a.band) - here) -
          Math.abs(BANDS.indexOf(b.band) - here),
      )[0];
    }
    if (!chosen) return null;
    this.used.add(chosen.id);
    const replies = [...chosen.replies];
    for (let i = replies.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [replies[i], replies[j]] = [replies[j]!, replies[i]!];
    }
    return {
      item: chosen,
      replies,
      answer: replies.indexOf(chosen.replies[0]),
    };
  }

  /** Records an answer and moves the next question one band up or down. */
  answer(correct: boolean) {
    this.answers.push(correct);
    const index = BANDS.indexOf(this.band);
    this.band =
      BANDS[
        Math.max(0, Math.min(BANDS.length - 1, index + (correct ? 1 : -1)))
      ]!;
  }
}
