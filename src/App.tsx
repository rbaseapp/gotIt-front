import { lazy, Suspense, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useApp } from "./context/AppContext";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useFeedback } from "./components/Feedback";
import { AuthPage } from "./pages/AuthPage";
import { LegalPage, type LegalPageKind } from "./pages/LegalPage";
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
const BillingPage = lazy(() =>
  import("./pages/BillingPage").then((m) => ({ default: m.BillingPage })),
);
const BillingCheckoutPage = lazy(() =>
  import("./pages/BillingCheckoutPage").then((m) => ({ default: m.BillingCheckoutPage })),
);

export default function App() {
  const { mode, logout, notice } = useApp();
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
            <p>טוענים את התשלום…</p>
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
        <p>בודקים את הכניסה שלך…</p>
      </div>
    );
  if (mode === "signed-out") return <AuthPage />;
  return (
    <Suspense
      fallback={
        <div className="empty-session" role="status">
          <LoaderCircle className="spin" size={30} />
          <p>טוענים את המסך…</p>
        </div>
      }
    >
      <Routes>
        <Route
          path="/learn/session/:type"
          element={
            mode === "live" ? (
              <LiveGameSessionPage key={location.pathname + location.search} />
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
                  path="/dashboard"
                  element={
                    mode === "live" ? <LiveDashboardPage /> : <DashboardPage />
                  }
                />
                <Route
                  path="/learn"
                  element={mode === "live" ? <LiveLearnPage /> : <LearnPage />}
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
                  path="/reading"
                  element={
                    mode === "live" ? <LiveReadingPage /> : <ReadingPage />
                  }
                />
                <Route path="/transfer" element={<TransferPage />} />
                <Route path="/billing" element={mode === "live" ? <BillingPage /> : <Navigate to="/dashboard" replace />} />
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
  );
}
