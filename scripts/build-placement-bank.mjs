#!/usr/bin/env node
/**
 * Builds src/data/placement/bank.json for the "Pocket" placement test.
 *
 * One-off generator; the output is committed so the front end never depends on
 * the backend repository at build time.
 *
 *   npm i --no-save an-array-of-english-words
 *   node scripts/build-placement-bank.mjs [--assets ../gotIt-backend/assets/english-zero-c1]
 *
 * Inputs
 *   lexicon.json + curriculum.json  the GotIt "English zero to C1" catalogue
 *   scripts/placement-probes.json   hand-authored reading/listening probes
 * Output
 *   words   [english, difficulty (curriculum unit 1-84), hebrew gloss | null]
 *   pseudo  pronounceable non-words (used to detect over-claiming)
 *   probes  reading and listening items
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argIndex = process.argv.indexOf("--assets");
const assets = path.resolve(
  argIndex > 0
    ? process.argv[argIndex + 1]
    : path.join(here, "../../gotIt-backend/assets/english-zero-c1"),
);
const out = path.join(here, "../src/data/placement/bank.json");

const lexicon = JSON.parse(fs.readFileSync(path.join(assets, "lexicon.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(assets, "curriculum.json"), "utf8"));
const probes = JSON.parse(fs.readFileSync(path.join(here, "placement-probes.json"), "utf8"));

let dictionary;
try {
  // The package ships a plain JSON array of ~275k words.
  const file = path.join(here, "../node_modules/an-array-of-english-words/index.json");
  dictionary = new Set(JSON.parse(fs.readFileSync(file, "utf8")));
} catch {
  console.error(
    "Missing dictionary: run `npm i --no-save an-array-of-english-words` first (needed to keep pseudowords unreal).",
  );
  process.exit(1);
}

const unitIndex = new Map(curriculum.units.map((u, i) => [u.id, i + 1]));
const units = curriculum.units.map((u) => ({ id: u.id, band: u.band }));

/* ---------- Hebrew-speaker cognates ("international" words) ---------- */
// Words every Hebrew speaker already recognises (hotel, taxi, bank...). They say
// nothing about English level, so the test must not use them.
const strip = (s) => s.normalize("NFD").replace(/[֑-ׇ]/g, "");
const finalForm = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const hebrewSkeleton = (he) =>
  [...strip(he).split(/[;,/(]| או /)[0]]
    .filter((c) => /[א-ת]/.test(c))
    .map((c) => finalForm[c] ?? c)
    .filter((c) => !"אהויע".includes(c))
    .join("");
const soundClass = { b: "ב", v: "ב", w: "", p: "פ", f: "פ", k: "ק", c: "ק", q: "ק", g: "ג", d: "ד", t: "ט", s: "ס", z: "ז", x: "קס", m: "מ", n: "נ", l: "ל", r: "ר", j: "ג", h: "ח", y: "" };
const fold = (c) => ({ ט: "ת", כ: "ק", ח: "ה", צ: "ס", ז: "ס" })[c] ?? c;
const englishSkeleton = (en) =>
  [...en.toLowerCase().replace(/ph/g, "f").replace(/ck/g, "k").replace(/ch/g, "כ").replace(/sh/g, "ש").replace(/th/g, "ת").replace(/[^a-zכשת]/g, "")]
    .map((c) => soundClass[c] ?? (["כ", "ש", "ת"].includes(c) ? c : ""))
    .join("");
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function looksLikeLoanword(en, he) {
  const a = [...hebrewSkeleton(he)].map(fold).join("");
  const b = [...englishSkeleton(en)].map(fold).join("");
  if (a.length < 2 || b.length < 2) return false;
  return 1 - distance(a, b) / Math.max(a.length, b.length) >= 0.74;
}
// Reviewed by hand: heuristic false positives, and loanwords the heuristic misses.
const notLoanwords = new Set(["English", "love", "side", "prize", "aside", "map", "symbol", "tone"].map((w) => w.toLowerCase()));
const loanwords = new Set(
  (
    "salad coffee bus museum criteria specific archive political cent television basic scene critical fashion technical " +
    "intelligence boss urban sugar jacket ethnic clinical humor sanction ocean psychological biological inflation " +
    "theoretical base hotel sandwich football passport computer phone restaurant okay yeah film video menu internet " +
    "taxi pizza banana tomato chocolate hamburger email jazz yoga hebrew " +
    "january february march april may june july august september october november december"
  ).split(" "),
);

/* ---------- Real words ---------- */
const best = new Map();
for (const t of lexicon.targets) {
  const en = t.en.trim();
  const key = en.toLowerCase();
  if (/[\s\-'’]/.test(en) || en.length < 2 || /^[A-Z]+$/.test(en)) continue; // phrases, TRUE
  if (!/^[A-Za-z]+$/.test(en)) continue;
  const d = unitIndex.get(t.unit);
  if (!d) continue;
  if (notLoanwords.has(key) ? false : loanwords.has(key) || looksLikeLoanword(en, t.he)) continue;
  const gloss = strip(t.he).split(/[;,(]| או /)[0].trim();
  const entry = [en, d, gloss && gloss.length <= 22 ? gloss : null];
  const prev = best.get(key);
  if (!prev || d < prev[1]) best.set(key, entry);
}
const words = [...best.values()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

/* ---------- Pseudowords (seeded, reproducible) ---------- */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261025);
const pick = (list) => list[Math.floor(rand() * list.length)];
const onsets = ["b", "bl", "br", "c", "ch", "cl", "cr", "d", "dr", "f", "fl", "fr", "g", "gl", "gr", "h", "j", "k", "l", "m", "n", "p", "pl", "pr", "r", "s", "sc", "sh", "sk", "sl", "sm", "sn", "sp", "st", "str", "sw", "t", "th", "tr", "tw", "v", "w", "wh", "z"];
const nuclei = ["a", "e", "i", "o", "u", "a", "e", "i", "o", "ai", "ea", "ee", "oa", "oo", "ou"];
const codas = ["b", "ck", "d", "f", "g", "ld", "lm", "lt", "m", "mp", "n", "nd", "nk", "nt", "p", "rk", "rm", "rn", "rt", "s", "sh", "sk", "t", "th", "x", "z", "mm", "nn", "ll", "tt", "pp"];
const endings = ["er", "el", "en", "et", "ic", "id", "il", "in", "is", "it", "on", "or", "ot", "um", "us", "ow", "ar", "and", "ent", "ond", "ump"];
const blocked = ["ass", "tit", "cum", "sex", "gay", "nig", "fag", "dik", "cok", "fuc", "shit", "piss", "porn", "kill", "nazi", "hell", "damn", "crap", "slut", "whor", "rape"];
const suffixes = ["s", "es", "ed", "d", "ing", "er", "ers", "ly", "y", "ness", "en"];
const lexiconSet = new Set(lexicon.targets.map((t) => t.en.toLowerCase()));
const pseudoSet = new Set();
let guard = 0;
while (pseudoSet.size < 320 && guard++ < 200000) {
  const word = pick(onsets) + pick(nuclei) + pick(codas) + pick(endings);
  if (word.length < 5 || word.length > 9 || /(.)\1\1/.test(word)) continue;
  if (blocked.some((b) => word.includes(b))) continue;
  if (dictionary.has(word) || lexiconSet.has(word)) continue;
  if (suffixes.some((s) => word.endsWith(s) && (dictionary.has(word.slice(0, -s.length)) || dictionary.has(word.slice(0, -s.length) + "e")))) continue;
  if (/q(?!u)/.test(word)) continue;
  pseudoSet.add(word);
}
const pseudo = [...pseudoSet].sort();

/* ---------- Output ---------- */
const perBand = {};
for (const [, d] of words) perBand[units[d - 1].band] = (perBand[units[d - 1].band] ?? 0) + 1;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  JSON.stringify({ v: 1, total: lexicon.targets.length, units, words, pseudo, probes: { reading: probes.reading, listening: probes.listening } }),
);
console.log(`bank written: ${words.length} words ${JSON.stringify(perBand)}, ${pseudo.length} pseudowords, ${probes.reading.length} reading + ${probes.listening.length} listening probes`);
console.log(`bytes: ${fs.statSync(out).size}`);
console.log("sample pseudowords:", pseudo.filter((_, i) => i % 8 === 0).join(" "));
