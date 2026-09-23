import { useRef, useState } from "react";
import { z } from "zod";
import { Download, Upload } from "lucide-react";
import { useApp } from "../context/AppContext";
import { errorMessage, product, query } from "../lib/product";
import {
  exportPage,
  importReceipt,
  parseImportFile,
  type ImportInput,
} from "../lib/transfer";
import { useFeedback } from "../components/Feedback";
export function TransferPage() {
  const { mode } = useApp();
  const { toast } = useFeedback();
  const [input, setInput] = useState<ImportInput>();
  const [result, setResult] = useState<z.infer<typeof importReceipt>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const loadFile = async (file?: File) => {
    setError("");
    setInput(undefined);
    setResult(undefined);
    if (!file) return;
    try {
      if (file.size > 256 * 1024) throw new Error("קובץ הייבוא מוגבל ל־256KB.");
      setInput(parseImportFile(await file.text()));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  const upload = async (failedOnly = false) => {
    if (!input || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const entries = failedOnly
      ? input.entries.filter((e) =>
          result?.results.some(
            (r) => r.eventId === e.eventId && r.status === "failed",
          ),
        )
      : input.entries;
    try {
      const response = await product(importReceipt, "import", "POST", {
        format: input.format,
        entries,
      });
      setResult(response);
      toast("הייבוא נבדק בשרת. התוצאות מפורטות בהמשך.", {
        tone: "success",
      });
      window.dispatchEvent(new Event("gotit:library-changed"));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const download = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const items: z.infer<typeof exportPage>["items"] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      for (let number = 0; number < 100; number++) {
        const response = await product(
          exportPage,
          `export${query({ limit: "100", cursor })}`,
        );
        items.push(...response.items);
        if (!response.nextCursor) {
          const blob = new Blob(
            [
              JSON.stringify(
                {
                  format: response.format,
                  exportedAt: new Date().toISOString(),
                  items,
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `gotit-library-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast(
            `יוצאו ${items.length} מילים. הייצוא אינו כולל היסטוריית תרגול והקשרים.`,
            { tone: "success", duration: 6500 },
          );
          return;
        }
        if (seen.has(response.nextCursor))
          throw new Error("השרת החזיר עימוד חוזר. הייצוא נעצר.");
        seen.add(response.nextCursor);
        cursor = response.nextCursor;
      }
      throw new Error(
        "הספרייה גדולה ממגבלת הייצוא באתר (10,000). לא הורד קובץ חלקי.",
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">המילים שלך נשארות שלך</p>
          <h1>ייבוא וייצוא</h1>
          <p>
            העברת הספרייה בלי לשנות היסטוריית ציונים או לסמוך על שליטה מיובאת.
          </p>
        </div>
      </section>
      {mode !== "live" ? (
        <p>ייבוא וייצוא זמינים לחשבון אמיתי בלבד.</p>
      ) : (
        <>
          <div className="live-two-columns">
            <section className="live-panel form-stack">
              <h2>ייצוא הספרייה</h2>
              <p>
                JSON בפורמט learning_library_v1: מילים, משמעויות, מצבים ותגיות.
                ה־API הנוכחי אינו מייצא הקשרים והיסטוריית תרגול, ולכן זה אינו
                גיבוי מלא ואינו קובץ לייבוא ישיר.
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void download()}
              >
                <Download size={18} />
                הורדת הספרייה
              </button>
            </section>
            <section className="live-panel form-stack">
              <h2>ייבוא מילים</h2>
              <p>
                capture_requests_v1 בלבד, עד 100 אירועים ו־256KB. לכל מילה נדרש
                eventId קבוע; ניסיון נוסף שומר אותו ולא יוצר כפילויות.
              </p>
              <label className="field">
                <span>בחירת קובץ JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  onChange={(e) => void loadFile(e.target.files?.[0])}
                />
              </label>
              {input && (
                <>
                  <p>{input.entries.length} מילים מוכנות לבדיקה.</p>
                  <ul>
                    {input.entries.slice(0, 10).map((e) => (
                      <li key={e.eventId}>
                        {e.capture.item.sourceText} —{" "}
                        {e.capture.translation.text}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void upload()}
                  >
                    <Upload size={18} />
                    {busy
                      ? "מייבא…"
                      : result
                        ? "ניסיון נוסף עם אותם מזהים"
                        : "אישור ושליחת הייבוא"}
                  </button>
                </>
              )}
            </section>
          </div>
          <details className="live-panel">
            <summary>מבנה קובץ הייבוא</summary>
            <pre dir="ltr">
              {JSON.stringify(
                {
                  format: "capture_requests_v1",
                  entries: [
                    {
                      eventId: "11111111-1111-4111-8111-111111111111",
                      capture: {
                        item: {
                          sourceText: "remember",
                          sourceLanguageCode: "en",
                          translationLanguageCode: "he",
                          itemType: "word",
                        },
                        translation: { text: "לזכור" },
                        context: {
                          selectedText: "remember",
                          sourceType: "import",
                        },
                        senseDecision: { mode: "auto" },
                      },
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
            <p>
              החליפו את מזהה הדוגמה ב־UUID חדש לכל אירוע חדש. לאחר כשל שמרו את
              אותו מזהה לאותו תוכן.
            </p>
          </details>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {result && (
        <section className="live-panel">
          <h2>תוצאות הייבוא</h2>
          {result.results.map((r) => (
            <p key={r.eventId}>
              {
                input?.entries.find((e) => e.eventId === r.eventId)?.capture
                  .item.sourceText
              }{" "}
              · {r.status === "succeeded" ? "נשמר" : `נכשל: ${r.error.code}`}
            </p>
          ))}
          {result.results.some((r) => r.status === "failed") && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void upload(true)}
            >
              ניסיון נוסף לנכשלים בלבד
            </button>
          )}
        </section>
      )}
    </div>
  );
}
