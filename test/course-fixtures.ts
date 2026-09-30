import type { Course, Homework } from "../src/lib/courses";
export const fixtureCourse: Course = {
  id: "10000000-0000-4000-8000-000000000001",
  revision: 3,
  createdAt: "2026-09-30T00:00:00.000Z",
  preferences: {
    targetLanguageCode: "en",
    supportLanguageCode: "he",
    path: "grammar",
    goal: "לדבר בביטחון ולהבין את הדקדוק",
    experience: "מכירים מילים בסיסיות",
    startingLevel: "A1",
    absoluteBeginner: true,
    ageGroup: "adult",
    literacy: "independent",
    minutesPerLesson: 10,
    daysPerWeek: 3,
    interests: ["טיולים"],
    statedNeeds: ["ללמוד את כללי הדקדוק באופן מסודר"],
    recommendations: ["לשלב שיחה קצרה בכל נושא"],
  },
  approvedPreferences: null,
  preferencesApprovedAt: null,
  ready: true,
  messages: [
    {
      role: "tutor",
      text: "באילו מצבים היית רוצה לדבר באנגלית?",
      channel: "text",
    },
  ],
  suggestions: ["בטיולים", "בעבודה", "מההתחלה"],
  versions: [],
  draftVersion: null,
  activeVersion: null,
  evidence: [],
  nextLesson: null,
  progress: { covered: 0, demonstrated: 0, retention: "not_assessed" },
};
export function courseWithPlan(active = false): Course {
  const course = structuredClone(fixtureCourse);
  course.approvedPreferences = course.preferences;
  course.preferencesApprovedAt = course.createdAt;
  course.versions = [
    {
      version: 1,
      preferences: course.preferences,
      createdAt: course.createdAt,
      plan: {
        title: "אנגלית מהיסודות, בדרך שלך",
        outcome: "לבנות משפטים בביטחון ולהשתמש בדקדוק בשיחה",
        scope:
          "יסודות המשפט, זמנים, שאלות ושימוש במבנים מתקדמים בשיחה יומיומית.",
        changeSummary: "בנינו עבורך רצף מסודר מהיסודות לשיחה עצמאית.",
        units: [
          "מציגים את עצמנו",
          "מספרים על היום שלנו",
          "מדברים על מה שהיה",
          "מתכננים את ההמשך",
          "משווים ומסבירים",
          "מנהלים שיחה עצמאית",
        ].map((title, index) => ({
          key: `unit-${index + 1}`,
          title,
          outcome: "לבנות משפטים שמתאימים למצב ולהסביר את הבחירה במילים שלך.",
          level: index < 2 ? "A1" : index < 4 ? "A2" : "B1",
          prerequisites: index ? [`unit-${index}`] : [],
          syllabusKeys: [],
          grammar: index
            ? ["מבנה משפט", "שאלות ושלילה"]
            : ["כינויי גוף", "am / is / are", "משפטי היכרות"],
          vocabulary: ["שמות", "מקומות", "פעילויות יום יום"],
          lessons: [
            {
              title: "משפטים קטנים, התחלה טובה",
              objective: "לומר מי אני והיכן אני נמצא",
            },
            {
              title: "משתמשים במה שלמדנו",
              objective: "להציג את עצמי בשיחה קצרה בלי עזרה",
            },
          ],
          estimatedMinutes: 20,
          homeworkExample: "השלמת משפט ולאחריה הצגה עצמית קצרה בקול או בכתב.",
          successTask:
            "שיחה קצרה שבה מציגים את עצמנו ושואלים את האדם השני שאלה.",
        })),
      },
    },
  ];
  course.draftVersion = active ? null : 1;
  course.activeVersion = active ? 1 : null;
  if (active)
    course.nextLesson = {
      unitKey: "unit-1",
      unitTitle: "מציגים את עצמנו",
      lessonIndex: 0,
      title: "משפטים קטנים, התחלה טובה",
      objective: "לומר מי אני והיכן אני נמצא",
    };
  return course;
}
export const fixtureHomework: Homework = {
  id: "20000000-0000-4000-8000-000000000001",
  lessonId: "20000000-0000-4000-8000-000000000001",
  courseId: fixtureCourse.id,
  unitKey: "unit-1",
  revision: 0,
  title: "המשפטים הראשונים שלך",
  targetLanguageCode: "en",
  supportLanguageCode: "he",
  createdAt: fixtureCourse.createdAt,
  status: "ready",
  needsRefresh: false,
  taskCount: 2,
  completedCount: 0,
  objective: "להשתמש ב־am / is / are",
  estimatedMinutes: 3,
  tasks: [
    {
      kind: "choice",
      objective: "בוחרים לפי מי שמדברים עליו",
      prompt: "בחרו את המילה המתאימה: She ___ at home.",
      choices: ["am", "is", "are"],
      tokens: [],
      listeningText: null,
      hint: null,
      solution: null,
      hintUsed: false,
      done: false,
      draft: "",
      attempts: [],
    },
    {
      kind: "transform",
      objective: "בונים משפט בעצמנו",
      prompt: "הפכו את המשפט I am at home למשפט שמתחיל ב־We.",
      choices: [],
      tokens: [],
      listeningText: null,
      hint: null,
      solution: null,
      hintUsed: false,
      done: false,
      draft: "",
      attempts: [],
    },
  ],
};
