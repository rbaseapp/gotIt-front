import { describe, expect, it } from 'vitest';
import { seedItems, seedProfile } from '../src/data/seed';
import { answerQuality, normalizeAnswer, practiceQueue } from '../src/lib/practice';
import { demoAward, demoReducer, isDemoState, type DemoState } from '../src/lib/demo';
import type { Attempt } from '../src/types';

function state(): DemoState { return { items: structuredClone(seedItems), profile: structuredClone(seedProfile), attempts: [], sessions: [] }; }
const attempt = (): Attempt => ({ id: 'attempt-1', itemId: 'wander', game: 'recall', score: 100, correct: true, result: 'correct', createdAt: '2026-09-15T10:00:00Z' });
describe('practice and demo evidence', () => {
  it('excludes paused, archived and deleted words, respects targeted selection without mutating the source', () => {
    const items = structuredClone(seedItems); const before = structuredClone(items);
    expect(practiceQueue(items, 'recall', ['wander']).map(item => item.id)).toEqual(['wander']);
    expect(items).toEqual(before);
    items[0].deletedAt = new Date().toISOString(); items[1].userStatus = 'PAUSED'; items[2].userStatus = 'ARCHIVED';
    expect(practiceQueue(items, 'smart').every(item => !item.deletedAt && item.userStatus === 'ACTIVE')).toBe(true);
    expect(practiceQueue(items, 'matching').length).toBeLessThanOrEqual(4);
  });
  it('distinguishes typos from perfect spelling and normalizes Unicode and whitespace', () => {
    expect(normalizeAnswer(' ＨＥＬＬＯ  world ')).toBe('hello world');
    expect(answerQuality('WANDER ', 'wander')).toBe(100);
    expect(answerQuality('wandr', 'wander')).toBe(65);
    expect(answerQuality('banana', 'wander')).toBe(0);
    expect(answerQuality('ca', 'cat')).toBe(0);
  });
  it('records each evidence event once without manufacturing mastery or review dates', () => {
    const initial = state(); const event = attempt(); const next = demoReducer(initial, { type: 'attempt', attempt: event });
    expect(next.attempts).toHaveLength(1); expect(next.attempts[0].xp).toBe(10);
    expect(next.items[0].attempts).toBe(initial.items[0].attempts + 1);
    expect(next.items[0].mastery).toBe(initial.items[0].mastery);
    expect(next.items[0].skills).toEqual(initial.items[0].skills);
    expect(next.items[0].dueAt).toBe(initial.items[0].dueAt);
    expect(demoReducer(next, { type: 'attempt', attempt: event })).toBe(next);
  });
  it('caps replay XP and never awards pronunciation or skipped attempts', () => {
    const next = demoReducer(state(), { type: 'attempt', attempt: attempt() });
    expect(demoAward(next.attempts, { ...attempt(), id: 'attempt-2' })).toBe(0);
    expect(demoAward([], { ...attempt(), game: 'pronunciation' })).toBe(0);
    expect(demoAward([], { ...attempt(), result: 'skipped' })).toBe(0);
    expect(demoAward([], { ...attempt(), correct: false })).toBe(0);
  });
  it('soft delete and restore preserve attempts and accepted translations', () => {
    let next = demoReducer(state(), { type: 'attempt', attempt: attempt() });
    next = demoReducer(next, { type: 'patch', id: 'wander', patch: { deletedAt: '2026-09-15T10:10:00Z' } });
    expect(practiceQueue(next.items, 'smart', ['wander'])).toEqual([]);
    next = demoReducer(next, { type: 'patch', id: 'wander', patch: { deletedAt: null } });
    expect(next.attempts).toHaveLength(1); expect(next.items[0].translation).toBe(seedItems[0].translation);
    expect(practiceQueue(next.items, 'smart', ['wander'])).toHaveLength(1);
  });
  it('upserts measured sessions and rejects malformed persisted demo data', () => {
    const session = { id: 's1', game: 'recall' as const, status: 'active' as const, startedAt: new Date().toISOString(), itemIds: ['wander'], xp: 0, durationSeconds: 0 };
    const next = demoReducer(state(), { type: 'session', session });
    expect(demoReducer(next, { type: 'session', session: { ...session, status: 'completed', durationSeconds: 62 } }).sessions).toHaveLength(1);
    expect(isDemoState(state())).toBe(true); expect(isDemoState({})).toBe(false);
  });
});
