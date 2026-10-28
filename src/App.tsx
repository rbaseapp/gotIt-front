import { myWordsDesignEnabled } from "./lib/myWords";
import { lazy, Suspense, useEffect } from "react";
const DevMyWordsPage = lazy(() =>
  import("./pages/DevMyWordsPage").then((module) => ({
    default: module.DevMyWordsPage,
  })),
);
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "./context/AppContext";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { dashboardDesignEnabled } from "./lib/dashboardDesign";
import { practiceDesignEnabled } from "./lib/practiceDesign";
import { useFeedback } from "./components/Feedback";
import { AuthPage } from "./pages/AuthPage";
import { OnboardingClaimGate } from "./components/onboarding/OnboardingClaimGate";
import { FirstRunGate } from "./components/onboarding/FirstRunGate";
import {
  CurriculumAccess,
  PreviewBanner,
  TutorAccess,
} from "./components/onboarding/Gates";
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
const DevDashboardPage = lazy(() =>
  import("./pages/DevDashboardPage").then((m) => ({
    default: m.DevDashboardPage,
  })),
);
const LiveLearnPage = lazy(() =>
  import("./pages/LiveLearnPage").then((m) => ({ default: m.LiveLearnPage })),
);
const DevPracticePage = lazy(() =>
  import("./pages/DevPracticePage").then((m) => ({
    default: m.DevPracticePage,
  })),
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
const DevFocusGamePage = lazy(() =>
  import("./pages/DevFocusGamePage").then((m) => ({
    default: m.DevFocusGamePage,
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
const EnglishLearningEntryPage = lazy(() =>
  import("./pages/EnglishLearningEntryPage").then((m) => ({
    default: m.EnglishLearningEntryPage,
  })),
);
const MinutesPage = lazy(() =>
  import("./pages/MinutesPage").then((m) => ({ default: m.MinutesPage })),
);
const StructuredEnglishPage = lazy(() =>
  import("./pages/StructuredEnglishPage").then((m) => ({
    default: m.StructuredEnglishPage,
  })),
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
const FlowPreviewPage = lazy(() =>
  import("./pages/FlowPreviewPage").then((m) => ({
    default: m.FlowPreviewPage,
  })),
);
const StartPage = lazy(() =>
  import("./pages/StartPage").then((m) => ({ default: m.StartPage })),
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
  if (mode === "signed-out") {
    const fallback = (
      <div className="empty-session" role="status">
        <LoaderCircle className="spin" size={30} />
        <p>{t("app.loadingScreen")}</p>
      </div>
    );
    // The Chrome extension opens /?auth=register and /?auth=reset straight into the account form.
    const authIntent = new URLSearchParams(location.search).get("auth");
    if (
      normalizedPath === "/" &&
      authIntent !== "register" &&
      authIntent !== "reset"
    )
      return (
        <Suspense fallback={fallback}>
          <LandingPage />
        </Suspense>
      );
    if (import.meta.env.DEV && normalizedPath.startsWith("/flow-preview"))
      return (
        <Suspense fallback={fallback}>
          <Routes>
            <Route path="/flow-preview" element={<FlowPreviewPage />} />
            <Route path="/flow-preview/:screen" element={<FlowPreviewPage />} />
          </Routes>
        </Suspense>
      );
    if (normalizedPath === "/start" || normalizedPath.startsWith("/start/"))
      return (
        <Suspense fallback={fallback}>
          <StartPage />
        </Suspense>
      );
    return (
      <AuthPage
        startingMode={normalizedPath === "/signup" ? "register" : undefined}
      />
    );
  }
  return (
    <SubscriptionProvider
      enabled={mode === "live"}
      isAdmin={user?.role === "admin"}
    >
      <OnboardingClaimGate>
        <FirstRunGate>
          <Suspense
            fallback={
              <div className="empty-session" role="status">
                <LoaderCircle className="spin" size={30} />
                <p>{t("app.loadingScreen")}</p>
              </div>
            }
          >
            <Routes>
              <Route path="/start" element={<StartPage />} />
              {import.meta.env.DEV && (
                <>
                  <Route path="/flow-preview" element={<FlowPreviewPage />} />
                  <Route
                    path="/flow-preview/:screen"
                    element={<FlowPreviewPage />}
                  />
                </>
              )}
              <Route
                path="/learn/session/:type"
                element={
                  mode === "live" ? (
                    <LiveGameAccess>
                      {practiceDesignEnabled() ? (
                        <DevFocusGamePage />
                      ) : (
                        <LiveGameSessionPage
                          key={location.pathname + location.search}
                        />
                      )}
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
                      <Route
                        path="/billing/minutes"
                        element={<MinutesPage />}
                      />
                      <Route
                        path="/dashboard"
                        element={
                          mode === "live" ? (
                            dashboardDesignEnabled() ? (
                              <DevDashboardPage />
                            ) : (
                              <LiveDashboardPage />
                            )
                          ) : (
                            <DashboardPage />
                          )
                        }
                      />
                      <Route
                        path="/learn"
                        element={
                          mode === "live" ? (
                            practiceDesignEnabled() ? (
                              <DevPracticePage />
                            ) : (
                              <LiveLearnPage />
                            )
                          ) : (
                            <LearnPage />
                          )
                        }
                      />
                      <Route
                        path="/vocabulary"
                        element={
                          mode === "live" ? (
                            myWordsDesignEnabled() ? (
                              <DevMyWordsPage />
                            ) : (
                              <LiveVocabularyPage />
                            )
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
                          mode === "live" ? (
                            <AchievementsPage />
                          ) : (
                            <DashboardPage />
                          )
                        }
                      />
                      <Route
                        path="/history"
                        element={
                          mode === "live" ? <HistoryPage /> : <LearnPage />
                        }
                      />
                      <Route
                        path="/programs"
                        element={<Navigate to="/courses" replace />}
                      />
                      <Route
                        path="/reading"
                        element={
                          mode === "live" ? (
                            <LiveReadingPage />
                          ) : (
                            <ReadingPage />
                          )
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
                                new URLSearchParams(location.search).has(
                                  "curriculum",
                                ) ||
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
                              <CurriculumAccess>
                                {location.search.includes("new=1") ? (
                                  <CoursePage />
                                ) : (
                                  <ProgramsPage />
                                )}
                              </CurriculumAccess>
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
                              <CurriculumAccess>
                                <CoursePage />
                              </CurriculumAccess>
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
                              <CurriculumAccess>
                                <HomeworkPage />
                              </CurriculumAccess>
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
                            <>
                              <PreviewBanner />
                              <EnglishLearningEntryPage />
                            </>
                          ) : (
                            <Navigate to="/learn" replace />
                          )
                        }
                      />
                      <Route
                        path="/english-zero-c1"
                        element={
                          mode === "live" ? (
                            <>
                              <PreviewBanner />
                              <StructuredEnglishPage />
                            </>
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
        </FirstRunGate>
      </OnboardingClaimGate>
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
    <TutorAccess>
      <PrivateLessonPage />
    </TutorAccess>
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
