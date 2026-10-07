import { lazy, Suspense, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "./context/AppContext";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useFeedback } from "./components/Feedback";
import { AuthPage } from "./pages/AuthPage";
import { LegalPage, type LegalPageKind } from "./pages/LegalPage";
import {
  SubscriptionProvider,
  useSubscription,
} from "./context/SubscriptionContext";
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const GameSessionPage = lazy(() =>
  import("./pages/GameSessionPage").then((m) => ({
    default: m.GameSessionPage,
  })),
);
const LearnPage = lazy(() =>
  import("./pages/LearnPage").then((m) => ({ default: m.LearnPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const VocabularyPage = lazy(() =>
  import("./pages/VocabularyPage").then((m) => ({ default: m.VocabularyPage })),
);
const ReadingPage = lazy(() =>
  import("./pages/ReadingPage").then((m) => ({ default: m.ReadingPage })),
);
const HelpPage = lazy(() =>
  import("./pages/HelpPage").then((m) => ({ default: m.HelpPage })),
);
const LiveDashboardPage = lazy(() =>
  import("./pages/LiveDashboardPage").then((m) => ({
    default: m.LiveDashboardPage,
  })),
);
const LiveLearnPage = lazy(() =>
  import("./pages/LiveLearnPage").then((m) => ({ default: m.LiveLearnPage })),
);
const AccountPage = lazy(() =>
  import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })),
);
const SmartPracticeReadyPage = lazy(() =>
  import("./pages/SmartPracticeReadyPage").then((m) => ({
    default: m.SmartPracticeReadyPage,
  })),
);
const LiveVocabularyPage = lazy(() =>
  import("./pages/LiveVocabularyPage").then((m) => ({
    default: m.LiveVocabularyPage,
  })),
);
const LiveGameSessionPage = lazy(() =>
  import("./pages/LiveGameSessionPage").then((m) => ({
    default: m.LiveGameSessionPage,
  })),
);
const LiveReadingPage = lazy(() =>
  import("./pages/LiveReadingPage").then((m) => ({
    default: m.LiveReadingPage,
  })),
);
const TransferPage = lazy(() =>
  import("./pages/TransferPage").then((m) => ({ default: m.TransferPage })),
);
const WordPacksPage = lazy(() =>
  import("./pages/WordPacksPage").then((m) => ({ default: m.WordPacksPage })),
);
const EnglishLearningPathPage = lazy(() =>
  import("./pages/EnglishLearningPathPage").then((m) => ({
    default: m.EnglishLearningPathPage,
  })),
);
const MinutesPage = lazy(() =>
  import("./pages/MinutesPage").then((m) => ({ default: m.MinutesPage })),
);
const BillingPage = lazy(() =>
  import("./pages/BillingPage").then((m) => ({ default: m.BillingPage })),
);
const BillingCheckoutPage = lazy(() =>
  import("./pages/BillingCheckoutPage").then((m) => ({
    default: m.BillingCheckoutPage,
  })),
);
const PrivateLessonPage = lazy(() =>
  import("./pages/PrivateLessonPage").then((m) => ({
    default: m.PrivateLessonPage,
  })),
);
const CourseUnitWordsPage = lazy(() =>
  import("./pages/CourseUnitWordsPage").then((m) => ({
    default: m.CourseUnitWordsPage,
  })),
);
const CoursePage = lazy(() =>
  import("./pages/CoursePage").then((m) => ({ default: m.CoursePage })),
);
const HomeworkPage = lazy(() =>
  import("./pages/HomeworkPage").then((m) => ({ default: m.HomeworkPage })),
);
const ProgramsPage = lazy(() =>
  import("./pages/ProgramsPage").then((m) => ({ default: m.ProgramsPage })),
);
const AchievementsPage = lazy(() =>
  import("./pages/AchievementsPage").then((m) => ({
    default: m.AchievementsPage,
  })),
);
const LandingPage = lazy(() =>
  import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);

export default function App() {
  const { t } = useTranslation();
  const { mode, user, logout, notice } = useApp();
  const { toast } = useFeedback();
  const location = useLocation();
  useEffect(() => {
    if (notice) toast(notice, { tone: "error", duration: 7000 });
  }, [notice, toast]);
  const legalPaths: Record<string, LegalPageKind> = {
    "/terms": "terms",
    "/terms-of-service": "terms",
    "/privacy": "privacy",
    "/privacy-policy": "privacy",
    "/refunds": "refund",
    "/refund-policy": "refund",
  };
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const legalPage = legalPaths[normalizedPath];
  if (legalPage) return <LegalPage kind={legalPage} />;
  if (normalizedPath === "/billing/checkout")
    return (
      <Suspense
        fallback={
          <div className="empty-session" role="status">
            <LoaderCircle className="spin" size={30} />
            <p>{t("app.loadingPayment")}</p>
          </div>
        }
      >
        <BillingCheckoutPage />
      </Suspense>
    );
  if (mode === "loading")
    return (
      <div className="empty-session" role="status">
        <LoaderCircle className="spin" size={30} />
        <p>{t("app.checkingSession")}</p>
      </div>
    );
  if (mode === "signed-out")
    return normalizedPath === "/" ? (
      <Suspense
        fallback={
          <div className="empty-session" role="status">
            <LoaderCircle className="spin" size={30} />
            <p>{t("app.loadingScreen")}</p>
          </div>
        }
      >
        <LandingPage />
      </Suspense>
    ) : (
      <AuthPage />
    );
  return (
    <SubscriptionProvider
      enabled={mode === "live"}
      isAdmin={user?.role === "admin"}
    >
      <Suspense
        fallback={
          <div className="empty-session" role="status">
            <LoaderCircle className="spin" size={30} />
            <p>{t("app.loadingScreen")}</p>
          </div>
        }
      >
        <Routes>
          <Route
            path="/learn/session/:type"
            element={
              mode === "live" ? (
                <LiveGameAccess>
                  <LiveGameSessionPage
                    key={location.pathname + location.search}
                  />
                </LiveGameAccess>
              ) : (
                <GameSessionPage />
              )
            }
          />
          <Route
            path="*"
            element={
              <AppShell onLogout={() => void logout()}>
                <Routes>
                  <Route
                    path="/courses/:id/units/:unitKey/words"
                    element={<CourseUnitWordsPage />}
                  />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/billing/minutes" element={<MinutesPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      mode === "live" ? (
                        <LiveDashboardPage />
                      ) : (
                        <DashboardPage />
                      )
                    }
                  />
                  <Route
                    path="/learn"
                    element={
                      mode === "live" ? <LiveLearnPage /> : <LearnPage />
                    }
                  />
                  <Route
                    path="/vocabulary"
                    element={
                      mode === "live" ? (
                        <LiveVocabularyPage />
                      ) : (
                        <VocabularyPage />
                      )
                    }
                  />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/learn/smart"
                    element={
                      mode === "live" ? (
                        <SmartPracticeReadyPage />
                      ) : (
                        <LearnPage />
                      )
                    }
                  />
                  <Route
                    path="/achievements"
                    element={
                      mode === "live" ? <AchievementsPage /> : <DashboardPage />
                    }
                  />
                  <Route
                    path="/history"
                    element={mode === "live" ? <HistoryPage /> : <LearnPage />}
                  />
                  <Route
                    path="/programs"
                    element={<Navigate to="/courses" replace />}
                  />
                  <Route
                    path="/reading"
                    element={
                      mode === "live" ? <LiveReadingPage /> : <ReadingPage />
                    }
                  />
                  <Route path="/transfer" element={<TransferPage />} />
                  <Route
                    path="/private-lesson"
                    element={
                      mode === "live" ? (
                        <PrivateLessonEntry
                          preferLesson={
                            location.search.includes("course=") ||
                            location.search.includes("pack=") ||
                            location.search.includes("practice=free") ||
                            location.search.includes("view=")
                          }
                        />
                      ) : (
                        <Navigate to="/learn" replace />
                      )
                    }
                  />
                  <Route
                    path="/courses"
                    element={
                      mode === "live" ? (
                        <LiveGameAccess>
                          {location.search.includes("new=1") ? (
                            <CoursePage />
                          ) : (
                            <ProgramsPage />
                          )}
                        </LiveGameAccess>
                      ) : (
                        <Navigate to="/learn" replace />
                      )
                    }
                  />
                  <Route
                    path="/courses/:courseId"
                    element={
                      mode === "live" ? (
                        <LiveGameAccess>
                          <CoursePage />
                        </LiveGameAccess>
                      ) : (
                        <Navigate to="/learn" replace />
                      )
                    }
                  />
                  <Route
                    path="/homework/:homeworkId"
                    element={
                      mode === "live" ? (
                        <LiveGameAccess>
                          <HomeworkPage />
                        </LiveGameAccess>
                      ) : (
                        <Navigate to="/learn" replace />
                      )
                    }
                  />
                  <Route
                    path="/word-packs"
                    element={
                      mode === "live" ? (
                        <WordPacksPage />
                      ) : (
                        <Navigate to="/learn" replace />
                      )
                    }
                  />
                  <Route
                    path="/english-learning"
                    element={
                      mode === "live" ? (
                        <EnglishLearningPathPage />
                      ) : (
                        <Navigate to="/learn" replace />
                      )
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      mode === "live" ? (
                        <BillingPage />
                      ) : (
                        <Navigate to="/dashboard" replace />
                      )
                    }
                  />
                  <Route path="/help" element={<HelpPage />} />
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </Suspense>
    </SubscriptionProvider>
  );
}

export function PrivateLessonEntry({
  preferLesson,
}: {
  preferLesson: boolean;
}) {
  const { t } = useTranslation();
  const { status, loading, hasEntitlement } = useSubscription();
  if (loading)
    return (
      <div className="empty-session" role="status">
        <LoaderCircle className="spin" size={30} />
        <p>{t("app.checkingAccess")}</p>
      </div>
    );
  return preferLesson || (status && !hasEntitlement("practice.play")) ? (
    <PrivateLessonPage />
  ) : (
    <CoursePage />
  );
}

function LiveGameAccess({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { status, loading, hasEntitlement } = useSubscription();
  if (loading)
    return (
      <div className="empty-session" role="status">
        <LoaderCircle className="spin" size={30} />
        <p>{t("app.checkingAccess")}</p>
      </div>
    );
  return !status || hasEntitlement("practice.play") ? (
    children
  ) : (
    <Navigate to="/learn" replace />
  );
}
