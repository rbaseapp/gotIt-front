// Local visual review only. Not an application route or a production build entry.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../src/i18n";
import { ProgramUnitMap } from "../src/components/ProgramUnitMap";
import type { ProgramActivityStep } from "../src/lib/programMap";
import { mapPack } from "../test/program-map-fixtures";
import "../src/styles.css";
import "../src/production.css";
import "../src/ux.css";
import "./preview.css";

void i18n.changeLanguage("he");
const titles = [
  "מילים 1–6",
  "שלום, מציגים את עצמנו — רכישה ושיחה נתמכת",
  "תרגול אחרי השיעור",
  "מילים 7–12",
  "שלום, מציגים את עצמנו — שימוש, הבנה והפקה עצמאית",
  "תרגול אחרי המפגש",
  "מילים 13–18",
  "הקשבה: היכרות קצרה",
  "שאלות ותשובות",
  "תרגול מילים",
  "הגייה: צלילים ראשונים",
  "חזרה על היחידה",
  "בוחן קצר",
  "סיום היחידה",
];
export default function Preview() {
  const [skipped, setSkipped] = useState<string[]>(["2", "3"]);
  const [opened, setOpened] = useState("");
  const steps: ProgramActivityStep[] = titles.map((title, i) => ({
    id: String(i + 1),
    number: i + 1,
    kind: "activity",
    title,
    description:
      i === 4
        ? "נשתמש במילות היחידה בשיחה עם המורה."
        : i === 1
          ? "מפגש עם המורה"
          : "",
    complete: i === 0 || i === 3,
    skipped: skipped.includes(String(i + 1)),
    available: i !== 2 && i !== 5,
    lockReason: "התרגולים ייפתחו לאחר השלמת המפגש",
    minutes: i === 4 ? 10 : 5,
    icon: [1, 4, 8].includes(i) ? "meeting" : undefined,
    onOpen: () => setOpened(title),
  }));
  const active = steps.find(
    (s) => !s.complete && !s.skipped && s.available && s.number >= 5,
  );
  return (
    <>
      <header className="preview-header">
        <a href="/design-preview/">GotIt</a>
        <span>תוכניות הלמידה שלי</span>
        <small>תצוגת עיצוב · נתוני הדגמה מקומיים</small>
      </header>
      <div className="preview-status">
        <span>לומדים בקצב שלכם</span>
        <span>עברית ← English</span>
      </div>
      <main className="preview-main">
        <ProgramUnitMap
          current={{
            ...mapPack,
            id: "P01",
            moduleNumber: 1,
            title: "שלום, מציגים את עצמנו",
            description:
              "צעדים ראשונים באנגלית — מכירים מילים, מדברים ומתרגלים.",
          }}
          packs={[]}
          pathLoading={false}
          pathError=""
          onRetryPath={() => {}}
          onWords={() => setOpened("מילות היחידה")}
          onAll={() => {}}
          onActivities={() => {}}
          onSelect={() => {}}
          stationUrl={() => ""}
          completedActivities={0}
          choices={{
            busy: false,
            onChoice: async (skip, key) =>
              setSkipped((old) =>
                key
                  ? skip
                    ? [...new Set([...old, key])]
                    : old.filter((x) => x !== key)
                  : skip
                    ? steps.filter((s) => !s.complete).map((s) => s.id)
                    : [],
              ),
          }}
          presentation={{
            model: {
              steps,
              active,
              completed: 2,
              percent: 14,
              prefix: steps.slice(0, 1),
              introduced: 12,
            },
            packs: [{ ...mapPack, id: "P01", title: "שלום, מציגים את עצמנו" }],
            words: ["hello", "hi", "goodbye", "I", "you", "am"].map(
              (sourceText) => ({ sourceText }),
            ),
            canSelect: () => true,
          }}
        />
        {opened && (
          <p className="preview-opened" role="status">
            נפתח בהדגמה: {opened}
            <button onClick={() => setOpened("")}>סגירה</button>
          </p>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <Preview />
  </MemoryRouter>,
);
