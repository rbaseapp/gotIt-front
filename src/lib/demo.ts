import type { Attempt, LearningItem, PracticeSession, UserProfile } from '../types';

export interface DemoState { items: LearningItem[]; profile: UserProfile; attempts: Attempt[]; sessions: PracticeSession[]; }
export type DemoAction =
  | { type: 'replace'; state: DemoState }
  | { type: 'item'; item: LearningItem }
  | { type: 'patch'; id: string; patch: Partial<LearningItem> }
  | { type: 'profile'; profile: UserProfile }
  | { type: 'attempt'; attempt: Attempt }
  | { type: 'session'; session: PracticeSession };

export function demoAward(attempts: Attempt[], attempt: Attempt): number {
  if (attempts.some(value => value.id === attempt.id)) return 0;
  if (!attempt.correct || attempt.result === 'skipped' || attempt.game === 'pronunciation') return 0;
  // Illustrative demo XP only, not the production XP curve. One award per item/game/day.
  return attempts.some(value => value.itemId === attempt.itemId && value.game === attempt.game && value.xp && value.createdAt.slice(0, 10) === attempt.createdAt.slice(0, 10)) ? 0 : 10;
}
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === 'replace') return action.state;
  if (action.type === 'profile') return { ...state, profile: action.profile };
  if (action.type === 'item') return { ...state, items: [action.item, ...state.items] };
  if (action.type === 'patch') return { ...state, items: state.items.map(item => item.id === action.id ? { ...item, ...action.patch } : item) };
  if (action.type === 'session') return { ...state, sessions: [...state.sessions.filter(session => session.id !== action.session.id), action.session] };
  if (state.attempts.some(attempt => attempt.id === action.attempt.id)) return state;
  const attempt = { ...action.attempt, xp: demoAward(state.attempts, action.attempt) };
  return { ...state, attempts: [...state.attempts, attempt], items: state.items.map(item => item.id === attempt.itemId ? { ...item, attempts: item.attempts + 1 } : item) };
}
const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(+new Date(value));
const strings = (value: unknown) => Array.isArray(value) && value.every(part => typeof part === 'string');
const games = ['smart', 'flashcards', 'recall', 'listening', 'matching', 'pronunciation'];
export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as DemoState;
  return Array.isArray(state.items) && state.items.every(item =>
    item && typeof item.id === 'string' && !!item.source && typeof item.source === 'string' &&
    typeof item.translation === 'string' && typeof item.context === 'string' &&
    typeof item.sourceLanguage === 'string' && typeof item.translationLanguage === 'string' &&
    validDate(item.createdAt) && validDate(item.dueAt) && (!item.deletedAt || validDate(item.deletedAt)) &&
    ['NEW', 'LEARNING', 'REVIEWING', 'MASTERED'].includes(item.status) &&
    ['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(item.userStatus) && ['LOW', 'NORMAL', 'HIGH'].includes(item.priority) &&
    typeof item.hard === 'boolean' && Number.isInteger(item.attempts) && item.attempts >= 0 &&
    Number.isFinite(item.mastery) && item.mastery >= 0 && item.mastery <= 100 && strings(item.tags) &&
    item.skills && ['recognition', 'recall', 'listening', 'spelling', 'pronunciation'].every(key => {
      const score = item.skills[key as keyof typeof item.skills]; return Number.isFinite(score) && score >= 0 && score <= 100;
    }) && (!item.examples || strings(item.examples)) && (!item.translations || strings(item.translations)) &&
    (!item.occurrences || Array.isArray(item.occurrences) && item.occurrences.every(part => typeof part.context === 'string' && validDate(part.createdAt)))
  ) && Array.isArray(state.attempts) && state.attempts.every(attempt =>
    attempt && typeof attempt.id === 'string' && typeof attempt.itemId === 'string' && games.includes(attempt.game) &&
    validDate(attempt.createdAt) && Number.isFinite(attempt.score) && attempt.score >= 0 && attempt.score <= 100 &&
    typeof attempt.correct === 'boolean' && (attempt.xp === undefined || Number.isFinite(attempt.xp) && attempt.xp >= 0)
  ) && Array.isArray(state.sessions) && state.sessions.every(session =>
    session && typeof session.id === 'string' && validDate(session.startedAt) &&
    (!session.endedAt || validDate(session.endedAt)) && games.includes(session.game) &&
    ['active', 'completed', 'abandoned'].includes(session.status) && strings(session.itemIds) &&
    Number.isFinite(session.durationSeconds) && session.durationSeconds >= 0 && Number.isFinite(session.xp) && session.xp >= 0
  ) && !!state.profile && typeof state.profile.name === 'string' && typeof state.profile.email === 'string' &&
    Array.isArray(state.profile.languages) && Array.isArray(state.profile.interests) && !!state.profile.dailyGoal;
}
