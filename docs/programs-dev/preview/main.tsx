// Development-only visual fixture. Not referenced by the production bundle.
import { useRef } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "../../../src/context/AppContext";
import { SubscriptionProvider } from "../../../src/context/SubscriptionContext";
import {
  LearningStatusProvider,
  PersistentLearningStatusBar,
} from "../../../src/components/LearningStatusProvider";
import { Topbar } from "../../../src/components/Topbar";
import { DevProgramsView } from "../../../src/pages/DevProgramsView";
import { courseWithPlan } from "../../../test/course-fixtures";
import { api } from "../../../src/lib/api";
import i18n from "../../../src/i18n";
import "../../../src/styles.css";

await i18n.changeLanguage(
  new URLSearchParams(location.search).get("locale") || "he",
);
const spanish = courseWithPlan(true);
spanish.id = "10000000-0000-4000-8000-000000000001";
spanish.preferences = {
  ...spanish.preferences,
  targetLanguageCode: "es",
  daysPerWeek: 3,
  path: "goal",
};
spanish.versions[0].preferences = spanish.preferences;
spanish.versions[0].plan.title = "שיחת חולין בספרדית";
spanish.versions[0].plan.outcome =
  "ביטויים יומיומיים לשיחה טבעית ובטוחה בספרדית.";
spanish.versions[0].plan.units[0].title = "מסיימים שיעורים";
spanish.versions[0].plan.units[1].title = "בונים ביטחון בשיחה";
spanish.versions[0].plan.units[2].title = "חוזרים על אוצר מילים";
spanish.progress.covered = 3;
spanish.nextLesson!.title = "דיבור · 10 דק׳";
spanish.nextLesson!.unitKey = "unit-2";
spanish.nextLesson!.lessonIndex = 1;
const business = structuredClone(spanish);
business.id = "10000000-0000-4000-8000-000000000002";
business.preferences = {
  ...business.preferences,
  targetLanguageCode: "en",
  minutesPerLesson: 15,
};
business.versions[0].preferences = business.preferences;
business.versions[0].plan.title = "אנגלית לעבודה";
business.versions[0].plan.outcome =
  "לנהל פגישה, לכתוב מייל מקצועי ולהציג רעיון.";
business.nextLesson!.title = "הצגת רעיון בעבודה";
const travel = structuredClone(spanish);
travel.id = "10000000-0000-4000-8000-000000000003";
travel.versions[0].plan.title = "ספרדית לטיול";
travel.versions[0].plan.outcome = "להסתדר בנסיעות, במלון ובמסעדה.";
travel.nextLesson!.title = "בטיסה ובשדה התעופה";
const books = structuredClone(spanish);
books.id = "10000000-0000-4000-8000-000000000004";
books.versions[0].plan.title = "יסודות ספרדית";
books.versions[0].plan.outcome = "להכיר, להבין ולדבר משפטים בסיסיים.";
books.nextLesson = null;
books.progress.covered = 12;
const dataUrls = new Map<string, string>();
api.product = async (path, _method, body) => {
  if (path.startsWith("courses/artwork/")) {
    const input = body as { kind: string; courseId?: string };
    const file =
      input.kind === "mascot"
        ? "mascot-es"
        : input.courseId === spanish.id
          ? "conversation"
          : input.courseId === business.id
            ? "work"
            : input.courseId === travel.id
              ? "travel"
              : "books";
    let url = dataUrls.get(file);
    if (!url) {
      const response = await fetch(`http://127.0.0.1:3021/${file}`);
      const json = await response.json();
      url = json.dataUrl;
      dataUrls.set(file, url!);
    }
    return { image: { dataUrl: url, fingerprint: file } };
  }
  if (path.startsWith("dashboard"))
    return {
      counts: {
        total: 0,
        new: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0,
        due: 0,
        difficult: 0,
        highPriority: 0,
        awaitingRecall: 0,
      },
      skills: [],
      modes: [],
      recentActivity: [],
      recentActivityPagination: {
        page: 1,
        pageCount: 1,
        totalCount: 0,
        pageSize: 6,
      },
      dailyGoal: {
        type: "minutes",
        current: 6,
        value: 10,
        completed: false,
        date: "2026-10-12",
      },
      gamification: {
        totalXp: 0,
        level: 1,
        nextLevelXp: 100,
        todayXp: 0,
        dailyXpCap: 200,
        dailyXpRemaining: 200,
        dailyXpCapReached: false,
        postDailyCapPercent: 25,
        currentStreakDays: 4,
        longestStreakDays: 4,
        lastActivityDate: "2026-10-12",
      },
      weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
    };
  return { lessons: [] };
};
// Standalone entry intentionally reloads rather than exporting a refresh boundary.
// eslint-disable-next-line react-refresh/only-export-components
function Fixture() {
  const menuRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="app-layout shared-header-shell nd-shell">
      <main className="main-column">
        <Topbar
          redesigned
          title=""
          showBack={false}
          mobileOpen={false}
          menuRef={menuRef}
          onOpenMenu={() => {}}
          onLogout={() => {}}
          onAddWord={() => {}}
        />
        <PersistentLearningStatusBar />
        <DevProgramsView
          courses={[spanish, business, travel, books]}
          homework={[]}
          packs={[]}
          coursesLoading={false}
          packsLoading={false}
          coursesError=""
          packsError=""
          retryCourses={() => {}}
          retryPacks={() => {}}
          busy={false}
          onRemove={async () => {}}
          onNew={() => {
            location.href = "/courses?choose=1";
          }}
        />
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <SubscriptionProvider enabled={false} isAdmin>
      <MemoryRouter initialEntries={["/courses"]}>
        <LearningStatusProvider enabled>
          <Fixture />
        </LearningStatusProvider>
      </MemoryRouter>
    </SubscriptionProvider>
  </AppProvider>,
);
