import type { AppStats, LearningItem, UserProfile } from '../types';

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
};

export const seedItems: LearningItem[] = [
  {
    id: 'wander', source: 'wander', translation: 'לשוטט', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'verb', phonetic: '/ˈwɒndər/', context: 'We decided to wander through the old city without a map.',
    sourceTitle: 'A weekend in Lisbon', status: 'REVIEWING', userStatus: 'ACTIVE', priority: 'HIGH', hard: false,
    mastery: 74, skills: { recognition: 88, recall: 68, listening: 72, spelling: 76, pronunciation: 64 },
    tags: ['Travel'], dueAt: day(-1), createdAt: day(-18), attempts: 12,
  },
  {
    id: 'thrive', source: 'thrive', translation: 'לשגשג', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'verb', phonetic: '/θraɪv/', context: 'Small teams thrive when everyone has room to contribute.',
    sourceTitle: 'Building better teams', status: 'LEARNING', userStatus: 'ACTIVE', priority: 'NORMAL', hard: true,
    mastery: 52, skills: { recognition: 70, recall: 42, listening: 55, spelling: 61, pronunciation: 34 },
    tags: ['Work'], dueAt: day(0), createdAt: day(-10), attempts: 7,
  },
  {
    id: 'glimpse', source: 'glimpse', translation: 'הצצה', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'noun', phonetic: '/ɡlɪmps/', context: 'From the train window, she caught a glimpse of the sea.',
    sourceTitle: 'The long journey', status: 'LEARNING', userStatus: 'ACTIVE', priority: 'NORMAL', hard: false,
    mastery: 61, skills: { recognition: 78, recall: 51, listening: 63, spelling: 69, pronunciation: 45 },
    tags: ['Travel'], dueAt: day(0), createdAt: day(-8), attempts: 8,
  },
  {
    id: 'subtle', source: 'subtle', translation: 'עדין, דק', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/ˈsʌtəl/', context: 'The room was filled with a subtle scent of jasmine.',
    sourceTitle: 'Design details', status: 'REVIEWING', userStatus: 'ACTIVE', priority: 'NORMAL', hard: true,
    mastery: 67, skills: { recognition: 82, recall: 58, listening: 49, spelling: 71, pronunciation: 54 },
    tags: ['Design'], dueAt: day(-2), createdAt: day(-22), attempts: 15,
  },
  {
    id: 'resilient', source: 'resilient', translation: 'עמיד, בעל חוסן', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/rɪˈzɪliənt/', context: 'A resilient system recovers quickly after a failure.',
    sourceTitle: 'Modern engineering', status: 'LEARNING', userStatus: 'ACTIVE', priority: 'HIGH', hard: false,
    mastery: 48, skills: { recognition: 66, recall: 38, listening: 51, spelling: 47, pronunciation: 40 },
    tags: ['Technology', 'Work'], dueAt: day(0), createdAt: day(-5), attempts: 5,
  },
  {
    id: 'serendipity', source: 'serendipity', translation: 'תגלית מקרית משמחת', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'noun', phonetic: '/ˌserənˈdɪpəti/', context: 'Finding that tiny bookstore was pure serendipity.',
    sourceTitle: 'City notes', status: 'NEW', userStatus: 'ACTIVE', priority: 'NORMAL', hard: false,
    mastery: 12, skills: { recognition: 24, recall: 0, listening: 0, spelling: 16, pronunciation: 0 },
    tags: ['Travel'], dueAt: day(0), createdAt: day(-1), attempts: 1,
  },
  {
    id: 'inevitable', source: 'inevitable', translation: 'בלתי נמנע', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/ɪnˈevɪtəbəl/', context: 'Change is inevitable, but growth is a choice.',
    sourceTitle: 'Morning newsletter', status: 'MASTERED', userStatus: 'ACTIVE', priority: 'NORMAL', hard: false,
    mastery: 91, skills: { recognition: 96, recall: 90, listening: 88, spelling: 94, pronunciation: 82 },
    tags: ['Ideas'], dueAt: day(14), createdAt: day(-62), attempts: 24,
  },
  {
    id: 'contemplate', source: 'contemplate', translation: 'להרהר', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'verb', phonetic: '/ˈkɒntəmpleɪt/', context: 'He sat quietly to contemplate his next move.',
    sourceTitle: 'Short stories', status: 'MASTERED', userStatus: 'ACTIVE', priority: 'NORMAL', hard: false,
    mastery: 88, skills: { recognition: 94, recall: 86, listening: 84, spelling: 91, pronunciation: 80 },
    tags: ['Ideas'], dueAt: day(8), createdAt: day(-44), attempts: 20,
  },
  {
    id: 'feasible', source: 'feasible', translation: 'בר־ביצוע', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/ˈfiːzəbəl/', context: 'We need a feasible plan before the end of the week.',
    sourceTitle: 'Project planning', status: 'REVIEWING', userStatus: 'ACTIVE', priority: 'NORMAL', hard: false,
    mastery: 79, skills: { recognition: 91, recall: 75, listening: 70, spelling: 84, pronunciation: 66 },
    tags: ['Work'], dueAt: day(1), createdAt: day(-28), attempts: 17,
  },
  {
    id: 'reluctant', source: 'reluctant', translation: 'מסויג, מהסס', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/rɪˈlʌktənt/', context: 'She was reluctant to speak before hearing all the facts.',
    sourceTitle: 'The difficult decision', status: 'LEARNING', userStatus: 'PAUSED', priority: 'NORMAL', hard: false,
    mastery: 43, skills: { recognition: 63, recall: 34, listening: 48, spelling: 44, pronunciation: 27 },
    tags: ['Stories'], dueAt: day(-4), createdAt: day(-14), attempts: 6,
  },
  {
    id: 'unprecedented', source: 'unprecedented', translation: 'חסר תקדים', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/ʌnˈpresɪdentɪd/', context: 'The discovery opened opportunities on an unprecedented scale.',
    sourceTitle: 'Science weekly', status: 'NEW', userStatus: 'ACTIVE', priority: 'NORMAL', hard: false,
    mastery: 6, skills: { recognition: 18, recall: 0, listening: 0, spelling: 8, pronunciation: 0 },
    tags: ['Science'], dueAt: day(0), createdAt: day(0), attempts: 0,
  },
  {
    id: 'deliberate', source: 'deliberate', translation: 'מכוון, מחושב', sourceLanguage: 'en', translationLanguage: 'he',
    partOfSpeech: 'adjective', phonetic: '/dɪˈlɪbərət/', context: 'Her progress was the result of deliberate daily practice.',
    sourceTitle: 'Learning science', status: 'MASTERED', userStatus: 'ARCHIVED', priority: 'NORMAL', hard: false,
    mastery: 93, skills: { recognition: 97, recall: 92, listening: 89, spelling: 96, pronunciation: 84 },
    tags: ['Learning'], dueAt: day(30), createdAt: day(-90), attempts: 31,
  },
];

export const seedProfile: UserProfile = {
  name: 'אורי', email: 'ori@example.com', defaultTranslationLanguage: 'he', timezone: 'Asia/Jerusalem',
  dailyGoal: { type: 'items', value: 10 }, defaultNewItemsPerDay: 5, translationMethodPreference: 'auto',
  languages: [{ languageCode: 'en', selfAssessedLevel: 'B1' }],
  interests: ['טכנולוגיה', 'נסיעות', 'עסקים'],
};

export const seedStats: AppStats = {
  xp: 1240, streak: 7, learnedToday: 4, minutesThisWeek: 86, lastPracticeDate: day(-1),
};
