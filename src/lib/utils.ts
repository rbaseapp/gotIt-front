import type { LearningItem, SkillKey } from '../types';

export const statusLabels = {
  NEW: 'חדש', LEARNING: 'בלמידה', REVIEWING: 'בחזרה', MASTERED: 'נלמד',
} as const;

export const skillLabels: Record<SkillKey, string> = {
  recognition: 'זיהוי', recall: 'שליפה', listening: 'האזנה', spelling: 'איות', pronunciation: 'הגייה',
};

export function isDue(item: LearningItem) {
  return !item.deletedAt && item.userStatus === 'ACTIVE' && new Date(item.dueAt).getTime() <= Date.now();
}

export function levelFromXp(xp: number) {
  return Math.floor(xp / 500) + 1;
}

export function xpInLevel(xp: number) {
  return xp % 500;
}

export function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function speak(text: string, lang = 'en-US') {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}
