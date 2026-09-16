import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  Clock3,
  Headphones,
  Layers3,
  MessageCircleQuestion,
  Mic2,
  MousePointer2,
  PenLine,
  Play,
  Sparkles,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isDue } from "../lib/utils";
import type { GameType } from "../types";
import { CapabilityNotice } from "../components/CapabilityNotice";

const games: Array<{
  id: GameType;
  title: string;
  subtitle: string;
  icon: typeof Layers3;
  tone: string;
  time: string;
  skills: string;
}> = [
  {
    id: "flashcards",
    title: "כרטיסיות",
    subtitle: "מגלים, נזכרים ומדרגים בעצמך",
    icon: Layers3,
    tone: "mint",
    time: "5–8 דק׳",
    skills: "זיהוי · שליפה",
  },
  {
    id: "recall",
    title: "שליפה מהזיכרון",
    subtitle: "רואים משמעות ומוצאים את המילה",
    icon: MessageCircleQuestion,
    tone: "violet",
    time: "6–10 דק׳",
    skills: "שליפה · איות",
  },
  {
    id: "listening",
    title: "האזנה ואיות",
    subtitle: "מקשיבים וכותבים בדיוק מה ששומעים",
    icon: Headphones,
    tone: "blue",
    time: "5–8 דק׳",
    skills: "האזנה · איות",
  },
  {
    id: "matching",
    title: "התאמות",
    subtitle: "מחברים במהירות בין מילה למשמעות",
    icon: MousePointer2,
    tone: "orange",
    time: "3–5 דק׳",
    skills: "זיהוי · מהירות",
  },
  {
    id: "pronunciation",
    title: "תרגול הגייה",
    subtitle: "האזנה והקלטה זמנית — הערכה מחכה ל־B6",
    icon: Mic2,
    tone: "rose",
    time: "5–7 דק׳",
    skills: "ללא ציון אוטומטי",
  },
];

export function LearnPage() {
  const { items, stats, mode, attempts } = useApp();
  const navigate = useNavigate();
  const due = items.filter(isDue).length;
  const go = (type: GameType) => navigate(`/learn/session/${type}`);
  const scored = attempts.filter(
    (attempt) =>
      attempt.result !== "self_rated" && attempt.result !== "skipped",
  );
  const accuracy = scored.length
    ? Math.round(
        (scored.filter((attempt) => attempt.correct).length / scored.length) *
          100,
      )
    : null;
  if (mode !== "demo")
    return (
      <CapabilityNotice
        title="ללמוד מילים"
        milestone="B3–B6: ממשקי התרגול והלמידה"
      />
    );

  return (
    <div className="learn-page page-enter">
      <section className="learn-heading">
        <div>
          <p className="eyebrow">זמן להפוך ידע לזיכרון · דמו</p>
          <h1>איך בא לך ללמוד היום?</h1>
          <p>אפשר להתנסות בסשן משולב, או לבחור את המשחק המתאים לך.</p>
        </div>
        <div className="session-stats">
          <span>
            <Trophy size={18} />
            דיוק בדמו <b>{accuracy === null ? "טרם תורגל" : accuracy + "%"}</b>
          </span>
          <span>
            <Zap size={18} />
            {stats.xp.toLocaleString()} XP לדמו
          </span>
        </div>
      </section>

      <section className="smart-session-card">
        <div className="smart-visual">
          <span className="visual-ring outer" />
          <span className="visual-ring inner" />
          <Brain size={48} />
          <span className="float-spark a">✦</span>
          <span className="float-spark b">✦</span>
        </div>
        <div className="smart-copy">
          <span className="pill light">
            <Sparkles size={14} />
            סשן הדגמה משולב
          </span>
          <h2>סשן חכם</h2>
          <p>
            {due} מילים הגיעו למועד החזרה בדוגמה. התור משלב כרטיסיות, שליפה
            והאזנה; הבחירה החכמה בשרת מחכה ל־B4.
          </p>
          <div className="smart-tags">
            <span>
              <Clock3 size={16} />
              כ־8 דקות
            </span>
            <span>
              <PenLine size={16} />
              עד{" "}
              {Math.min(
                8,
                items.filter(
                  (item) => !item.deletedAt && item.userStatus === "ACTIVE",
                ).length,
              )}{" "}
              מילים
            </span>
            <span>
              <Volume2 size={16} />3 משחקים
            </span>
          </div>
        </div>
        <button className="button smart-start" onClick={() => go("smart")}>
          <Play size={19} fill="currentColor" />
          התחלת סשן
          <ArrowLeft size={18} />
        </button>
      </section>

      <div className="section-title">
        <div>
          <h2>או לבחור משחק</h2>
          <p>כל משחק מחזק שריר אחר בשפה</p>
        </div>
      </div>
      <section className="game-grid">
        {games.map(
          ({ id, title, subtitle, icon: Icon, tone, time, skills }) => (
            <button className="game-card" key={id} onClick={() => go(id)}>
              <span className={`game-icon ${tone}`}>
                <Icon size={27} />
              </span>
              <span className="game-card-copy">
                <b>{title}</b>
                <small>{subtitle}</small>
              </span>
              <span className="game-card-meta">
                <span>
                  <Clock3 size={14} />
                  {time}
                </span>
                <span>{skills}</span>
              </span>
              <span className="game-arrow">
                <ChevronLeft size={19} />
              </span>
            </button>
          ),
        )}
      </section>

      <section className="learning-tip">
        <span>
          <Sparkles size={21} />
        </span>
        <div>
          <b>ידעת?</b>
          <p>
            תרגול שליפה — הניסיון להיזכר לפני שרואים את התשובה — בונה זיכרון חזק
            יותר מקריאה חוזרת.
          </p>
        </div>
      </section>
    </div>
  );
}
