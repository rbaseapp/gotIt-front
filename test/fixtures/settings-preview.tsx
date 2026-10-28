// Local QA harness. Uses the actual application providers/components; no live writes.
import { createRoot } from "react-dom/client";
import { useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppProvider, useApp } from "../../src/context/AppContext";
import { SubscriptionProvider } from "../../src/context/SubscriptionContext";
import { FeedbackProvider } from "../../src/components/Feedback";
import { Topbar } from "../../src/components/Topbar";
import { LearningStatusBar } from "../../src/components/LearningStatusBar";
import { DevSettingsPage } from "../../src/pages/DevSettingsPage";
import i18n from "../../src/i18n";
import "../../src/styles.css";
import "../../src/production.css";
import "../../src/ux.css";
import "../../src/figma-review.css";
import "../../src/path-review.css";
import "../../src/learning-map.css";
import "../../src/auth-production.css";
localStorage.setItem("gotit.mode", JSON.stringify("demo"));
await i18n.changeLanguage(
  new URLSearchParams(location.search).get("locale") || "he",
);
export function Preview() {
  const ref = useRef<HTMLButtonElement>(null);
  const { mode } = useApp();
  return mode === "demo" ? (
    <div className="app-layout shared-header-shell focus-shell">
      <main className="main-column">
        <Topbar
          redesigned
          title="GotIt"
          showBack={false}
          mobileOpen={false}
          menuRef={ref}
          onOpenMenu={() => {}}
          onLogout={() => {}}
          onAddWord={() => {}}
        />
        <LearningStatusBar
          goal={{ type: "items", current: 6, value: 20 }}
          streakDays={2}
          language={{
            value: "en",
            options: ["en"],
            translationCode: "he",
            onChange: () => {},
          }}
        />
        <div className="page-content">
          <DevSettingsPage />
        </div>
      </main>
    </div>
  ) : null;
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <FeedbackProvider>
      <AppProvider>
        <SubscriptionProvider enabled={false}>
          <Preview />
        </SubscriptionProvider>
      </AppProvider>
    </FeedbackProvider>
  </BrowserRouter>,
);
