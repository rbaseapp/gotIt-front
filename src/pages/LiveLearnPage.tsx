import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Headphones,
  Layers3,
  Mic2,
  MousePointer2,
  PenLine,
  LockKeyhole,
} from "lucide-react";
import { RemoteState } from "../components/RemoteState";
import {
  capabilitiesSchema,
  labels,
  page,
  product,
  query,
  queueSchema,
  sessionSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { useSubscription } from "../context/SubscriptionContext";
const games = [
  {
    id: "flashcards",
    name: "כרטיסיות",
    description: "נזכרים, מגלים ומדרגים בעצמכם",
    icon: Layers3,
    tone: "mint",
  },
  {
    id: "recall",
    name: "שליפה מהזיכרון",
    description: "הקלדה או בחירה, עם בדיקה מהשרת",
    icon: PenLine,
    tone: "violet",
  },
  {
    id: "matching",
    name: "התאמות",
    description: "מחברים מילה למשמעות מתוך אפשרויות",
    icon: MousePointer2,
    tone: "orange",
  },
  {
    id: "listening",
    name: "האזנה ואיות",
    description: "דורש ספק דיבור מוגדר בשרת",
    icon: Headphones,
    tone: "blue",
  },
  {
    id: "pronunciation",
    name: "הגייה",
    description: "הקלטה זמנית להערכה אמיתית, בכפוף לספק",
    icon: Mic2,
    tone: "rose",
  },
];
const gameOrder = [
  "matching",
  "flashcards",
  "pronunciation",
  "listening",
  "recall",
] as const;
export function LiveLearnPage() {
  const { status, loading, hasEntitlement } = useSubscription();
  const queue = useResource(
    useCallback(() => product(queueSchema, "learning/queue?limit=10"), []),
  );
  const capabilities = useResource(
    useCallback(() => product(capabilitiesSchema, "capabilities"), []),
  );
  const [cursor, setCursor] = useState<string>();
  const sessionsUrl = `practice/sessions${query({ limit: "10", cursor })}`;
  const sessions = useResource(
    useCallback(() => product(page(sessionSchema), sessionsUrl), [sessionsUrl]),
  );
  if (!loading && status && !hasEntitlement("practice.play"))
    return (
      <div className="learn-page live-page page-enter">
        <section className="live-panel locked-feature">
          <span className="locked-feature-icon">
            <LockKeyhole size={30} />
          </span>
          <p className="eyebrow">יכולת PRO</p>
          <h1>המשחקים מחכים לך</h1>
          <p>
            המילים וההתקדמות שלך שמורות. שדרגו ל־PRO כדי לחזור לכל המשחקים,
            לתרגולי הדיבור ולהגייה.
          </p>
          <Link className="button primary" to="/billing">
            שדרוג ל־PRO
          </Link>
        </section>
      </div>
    );
  return (
    <div className="learn-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">זמן להפוך ידע לזיכרון</p>
          <h1>איך בא לך ללמוד היום?</h1>
          <p>בחרו חזרה חכמה או את הכישור שתרצו לחזק.</p>
        </div>
      </section>
      <RemoteState
        loading={capabilities.loading}
        error={capabilities.error}
        retry={() => void capabilities.reload()}
      />
      <section className="smart-session-card">
        <div className="smart-visual">
          <Brain size={48} />
        </div>
        <div className="smart-copy">
          <h2>סשן חכם</h2>
          <p>התור האישי מתחשב במועד החזרה, בכישורים, בקושי ובהעדפות שלכם.</p>
          <RemoteState
            loading={queue.loading}
            error={queue.error}
            retry={() => void queue.reload()}
          />
          {queue.data && (
            <p>
              {queue.data.items.length} מילים בתצוגת התור ·{" "}
              {queue.data.algorithmVersion}
            </p>
          )}
        </div>
        <Link className="button smart-start" to="/learn/session/smart">
          התחלת סשן
        </Link>
      </section>
      <div className="game-grid">
        {gameOrder
          .map((id) => games.find((game) => game.id === id)!)
          .map(({ icon: Icon, ...game }) => {
            const providerMode = ["listening", "pronunciation"].includes(
              game.id,
            );
            const available =
              !providerMode || Boolean(capabilities.data?.configured.speech);
            return available ? (
              <Link
                className="game-card"
                to={`/learn/session/${game.id}`}
                key={game.id}
              >
                <span className={`game-icon ${game.tone}`}>
                  <Icon size={28} />
                </span>
                <span className="game-card-copy">
                  <b>{game.name}</b>
                  <small>{game.description}</small>
                </span>
              </Link>
            ) : (
              <div
                className="game-card disabled"
                aria-disabled="true"
                key={game.id}
              >
                <span className={`game-icon ${game.tone}`}>
                  <Icon size={28} />
                </span>
                <span className="game-card-copy">
                  <b>{game.name}</b>
                  <small>לא זמין: ספק דיבור אינו מוגדר בשרת</small>
                </span>
              </div>
            );
          })}
      </div>
      <section className="live-panel">
        <h2>המילים הבאות שלך</h2>
        {queue.data?.items.map((i) => (
          <Link
            className="live-weak-word"
            key={i.id}
            to={`/vocabulary?item=${i.id}`}
          >
            <b dir="auto">{i.sourceText}</b>
            <span dir="auto">{i.primaryTranslation}</span>
            <small>{labels[i.learningStatus]}</small>
          </Link>
        ))}
        {queue.data && !queue.data.items.length && (
          <p>
            אין כרגע מילים בתור. הוסיפו מילים ובדקו את הגבלת המילים החדשות
            בהגדרות.
          </p>
        )}
      </section>
      <section className="live-panel">
        <h2>היסטוריית סשנים</h2>
        <RemoteState
          loading={sessions.loading}
          error={sessions.error}
          retry={() => void sessions.reload()}
        />
        {sessions.data?.items.map((s) => (
          <div className="live-toolbar" key={s.id}>
            <b>{labels[s.sessionType] || s.sessionType}</b>
            <span>
              {s.status === "active"
                ? "פעיל"
                : s.status === "completed"
                  ? "הושלם"
                  : "הופסק"}
            </span>
            <small>
              {new Date(s.startedAt).toLocaleString("he-IL")} · {s.attemptCount}{" "}
              ניסיונות · {s.xpEarned} XP
            </small>
            {s.status === "active" && (
              <Link
                className="button ghost"
                to={`/learn/session/${s.sessionType === "smart_review" ? "smart" : s.sessionType === "listening_spelling" ? "listening" : s.sessionType}?resume=${s.id}`}
              >
                המשך
              </Link>
            )}
          </div>
        ))}
        {sessions.data?.nextCursor && (
          <button
            className="button secondary"
            onClick={() => setCursor(sessions.data!.nextCursor!)}
          >
            סשנים נוספים
          </button>
        )}
      </section>
    </div>
  );
}
