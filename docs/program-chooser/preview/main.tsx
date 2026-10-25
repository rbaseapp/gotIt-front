// Development-only visual fixture. Not imported by the application entry point.
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "../../../src/context/AppContext";
import { SubscriptionProvider } from "../../../src/context/SubscriptionContext";
import { Topbar } from "../../../src/components/Topbar";
import { LearningStatusBar } from "../../../src/components/LearningStatusBar";
import { ProgramChooser } from "../../../src/components/ProgramChooser";
import i18n from "../../../src/i18n";
import "../../../src/styles.css";
import "../../../src/production.css";
import "../../../src/ux.css";
await i18n.changeLanguage(
  new URLSearchParams(location.search).get("locale") || "he",
);
// eslint-disable-next-line react-refresh/only-export-components
function Fixture() {
  const ref = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState("en");
  const [support, setSupport] = useState("he");
  return (
    <div className="app-layout shared-header-shell">
      <main className="main-column">
        <Topbar
          redesigned
          title=""
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
          <ProgramChooser
            target={target}
            support={support}
            onTarget={setTarget}
            onSupport={setSupport}
            busy={false}
            loading={false}
            error=""
            available={target === "en" && support === "he"}
            onRetry={() => {}}
            onPrepared={() => {}}
            onBack={() => {}}
          />
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <SubscriptionProvider enabled={false} isAdmin>
      <MemoryRouter initialEntries={["/courses?choose=1"]}>
        <Fixture />
      </MemoryRouter>
    </SubscriptionProvider>
  </AppProvider>,
);
