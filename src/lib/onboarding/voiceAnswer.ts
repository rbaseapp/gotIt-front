/**
 * Voice mode for the questions: the avatar reads the question aloud, then listens, and the
 * spoken answer is matched to one of the choices on screen. Tapping always works too, so a
 * browser without speech recognition, a denied microphone or a noisy room cost nothing.
 *
 * Uses the browser's own speech services (no audio leaves for our servers).
 */
import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResult = {
  [index: number]: { transcript: string };
  length: number;
};
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;

const recognitionConstructor = (): RecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canListen = () => recognitionConstructor() !== null;

export const RECOGNITION_LANGUAGE: Record<string, string> = {
  he: "he-IL",
  en: "en-US",
  ru: "ru-RU",
  ar: "ar-SA",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
};

/* ------------------------------------------------------------ matching */
const DONT_KNOW: Record<string, string[]> = {
  he: [
    "לא יודע",
    "לא יודעת",
    "אין לי מושג",
    "לא בטוח",
    "לא בטוחה",
    "לא יודעים",
  ],
  en: [
    "i don't know",
    "i do not know",
    "don't know",
    "no idea",
    "not sure",
    "dunno",
  ],
  ru: ["не знаю", "понятия не имею", "не уверен", "не уверена"],
  ar: ["لا أعرف", "ما أعرف", "لست متأكد", "لست متأكدة"],
  es: ["no lo sé", "no sé", "ni idea", "no estoy seguro", "no estoy segura"],
  fr: ["je ne sais pas", "aucune idée", "pas sûr", "pas sûre"],
  de: ["ich weiß nicht", "ich weiss nicht", "keine ahnung", "nicht sicher"],
  zh: ["我不知道", "不知道", "不确定", "不太确定"],
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    // Hebrew vowel points and cantillation marks.
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j]!;
      row[j] = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = saved;
    }
  }
  return row[b.length]!;
}

const similarity = (a: string, b: string) =>
  a && b ? 1 - editDistance(a, b) / Math.max(a.length, b.length) : 0;

/** How well a heard phrase matches one choice: whole-phrase closeness, or shared words. */
function score(heard: string, option: string) {
  const o = normalize(option);
  if (!o || !heard) return 0;
  if (heard === o || heard.includes(o)) return 1;
  const whole = similarity(heard, o);
  const heardWords = new Set(heard.split(" "));
  const optionWords = o.split(" ").filter((word) => word.length > 1);
  const shared = optionWords.length
    ? optionWords.filter((word) =>
        [...heardWords].some(
          (h) => h === word || (word.length > 3 && similarity(h, word) >= 0.8),
        ),
      ).length / optionWords.length
    : 0;
  return Math.max(whole, shared);
}

export type VoiceChoice = { kind: "choice"; index: number } | { kind: "dk" };

/**
 * Picks the choice a spoken phrase most likely means, or says it was "I don't know".
 * Returns null when nothing is close enough or two choices are equally likely.
 */
export function matchSpoken(
  alternatives: string[],
  options: string[],
  language: string,
): VoiceChoice | null {
  const heard = alternatives.map(normalize).filter(Boolean);
  const phrases = (DONT_KNOW[language] ?? []).concat(DONT_KNOW.en ?? []);
  if (
    heard.some((h) =>
      phrases.some((phrase) => h === phrase || h.includes(phrase)),
    )
  )
    return { kind: "dk" };
  let best = { index: -1, value: 0 };
  let second = 0;
  options.forEach((option, index) => {
    const value = Math.max(0, ...heard.map((h) => score(h, option)));
    if (value > best.value) {
      second = best.value;
      best = { index, value };
    } else if (value > second) second = value;
  });
  if (best.index < 0 || best.value < 0.6) return null;
  if (best.value < 1 && best.value - second < 0.12) return null;
  return { kind: "choice", index: best.index };
}

/* -------------------------------------------------------------- audio */
function speakAsync(text: string, lang: string, rate = 0.95): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return resolve();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      const done = () => resolve();
      utterance.onend = done;
      utterance.onerror = done;
      // Some browsers never fire the end event for an unsupported voice.
      window.setTimeout(done, 12_000);
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

function listenOnce(
  lang: string,
  signal: { cancelled: boolean },
  onStart: () => void,
): Promise<{ heard: string[]; error?: string }> {
  return new Promise((resolve) => {
    const Recognition = recognitionConstructor();
    if (!Recognition) return resolve({ heard: [], error: "unsupported" });
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.maxAlternatives = 4;
    recognition.interimResults = false;
    recognition.continuous = false;
    let settled = false;
    const finish = (value: { heard: string[]; error?: string }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
      finish({ heard: [] });
    }, 9_000);
    recognition.onresult = (event) => {
      const heard: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!;
        for (let j = 0; j < result.length; j++)
          heard.push(result[j]!.transcript);
      }
      finish({ heard });
    };
    recognition.onerror = (event) => finish({ heard: [], error: event.error });
    recognition.onend = () => finish({ heard: [] });
    const poll = window.setInterval(() => {
      if (signal.cancelled) {
        window.clearInterval(poll);
        try {
          recognition.abort();
        } catch {
          // Already stopped.
        }
        finish({ heard: [], error: "cancelled" });
      }
    }, 150);
    try {
      recognition.start();
      onStart();
    } catch {
      finish({ heard: [], error: "unsupported" });
    }
  });
}

/* ---------------------------------------------------------------- hook */
export type VoiceState =
  "idle" | "speaking" | "listening" | "nomatch" | "unsupported" | "denied";

let microphoneDenied = false;

/**
 * Asks the current question aloud and listens for the answer.
 * `promptKey` changes with every question; `onAnswer` is called with the matched choice.
 */
export function useVoiceQuestion(options: {
  enabled: boolean;
  promptKey: string | number | null;
  /** What to say, in order, each in its own language. */
  say: { text: string; lang: string }[];
  /** The choices the learner can speak, and the language they are spoken in. */
  choices: string[];
  listenLanguage: string;
  /** UI language code, for the "I don't know" phrases. */
  dkLanguage: string;
  onAnswer: (answer: VoiceChoice) => void;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [heard, setHeard] = useState("");
  const ticket = useRef({ cancelled: false });
  const latest = useRef(options);
  latest.current = options;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const current = latest.current;
    if (!current.enabled || current.promptKey === null) {
      setState("idle");
      return;
    }
    if (!canListen()) {
      setState("unsupported");
      return;
    }
    if (microphoneDenied) {
      setState("denied");
      return;
    }
    const mine = { cancelled: false };
    ticket.current = mine;
    setHeard("");
    void (async () => {
      setState("speaking");
      for (const part of current.say) {
        if (mine.cancelled) return;
        await speakAsync(part.text, part.lang);
      }
      for (let round = 0; round < 2 && !mine.cancelled; round++) {
        const outcome = await listenOnce(
          current.listenLanguage,
          mine,
          () => !mine.cancelled && setState("listening"),
        );
        if (mine.cancelled) return;
        if (
          outcome.error === "not-allowed" ||
          outcome.error === "service-not-allowed"
        ) {
          microphoneDenied = true;
          setState("denied");
          return;
        }
        if (outcome.error === "unsupported") {
          setState("unsupported");
          return;
        }
        const match = matchSpoken(
          outcome.heard,
          current.choices,
          current.dkLanguage,
        );
        if (match) {
          setHeard(outcome.heard[0] ?? "");
          current.onAnswer(match);
          return;
        }
        setHeard(outcome.heard[0] ?? "");
        setState("nomatch");
      }
    })();
    return () => {
      mine.cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
    // A new question (or an explicit retry) restarts the voice turn.
  }, [options.enabled, options.promptKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, heard, retry };
}
