// Development-only visual fixture. Not imported by the application entry point.
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "../../../src/context/AppContext";
import { SubscriptionProvider } from "../../../src/context/SubscriptionContext";
import { Topbar } from "../../../src/components/Topbar";
import { LearningStatusBar } from "../../../src/components/LearningStatusBar";
import { ProgramUnitMap } from "../../../src/components/ProgramUnitMap";
import { mapPack, mapPath } from "../../../test/program-map-fixtures";
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
  const params = new URLSearchParams(location.search);
  const [message, setMessage] = useState("");
  const pack = {
    ...mapPack,
    description:
      i18n.language === "he"
        ? "ביחידה זו נלמד כיצד לבנות משפטים פשוטים באנגלית, להשתמש במילים יומיומיות ולהציג את עצמכם ואת הסביבה שלכם."
        : mapPack.description,
  };
  const path = {
    ...mapPath,
    words: ["I", "you", "house", "family", "have", "big"].map((sourceText) => ({
      sourceText,
      translationText: "",
      exampleText: null,
      introduced: true,
    })),
  };
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
          <div className="english-path-page dev-program-map">
            <ProgramUnitMap
              current={pack}
              packs={[
                pack,
                {
                  ...pack,
                  id: "d3000000-0000-4000-8000-000000000002",
                  moduleNumber: 2,
                  title: "Questions & Basic Conversation",
                },
              ]}
              path={path}
              pathLoading={params.has("loading")}
              pathError={params.has("error") ? "Map unavailable" : ""}
              onRetryPath={() => {}}
              onWords={() => setMessage("Words opened")}
              onAll={() => setMessage("All units opened")}
              onActivities={() => setMessage("Activities opened")}
              onSelect={(value) => setMessage(value.title)}
              stationUrl={(station) =>
                `/private-lesson?pack=${pack.id}&station=${station}`
              }
              completedActivities={0}
            />
          </div>
          <p role="status">{message}</p>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <SubscriptionProvider enabled={false} isAdmin>
      <MemoryRouter initialEntries={["/english-learning"]}>
        <Fixture />
      </MemoryRouter>
    </SubscriptionProvider>
  </AppProvider>,
);
