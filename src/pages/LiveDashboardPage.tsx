import { useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Flame,
  LibraryBig,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { RemoteState } from "../components/RemoteState";
import {
  dashboardSchema,
  itemSchema,
  labels,
  needsStrengthening,
  page,
  product,
  wordPacksSchema,
} from "../lib/product";
import { useResource } from "../lib/useResource";
export function LiveDashboardPage() {
  const { profile } = useApp();
  const resource = useResource(
    useCallback(() => product(dashboardSchema, "dashboard"), []),
  );
  const weakest = useResource(
    useCallback(
      () =>
        product(
          page(itemSchema),
          "learning-items?userStatus=active&sort=weakest&limit=3",
        ),
      [],
    ),
  );
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const d = resource.data;
  const weakItems = weakest.data?.items.filter(needsStrengthening);
  const installedPacks = packs.data?.packs.filter((pack) => pack.installed);
  return (
    <div className="dashboard-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">כל יום, קצת יותר שלך</p>
          <h1>
            שלום {profile.name} <span aria-hidden="true">☀</span>
          </h1>
          <p>מילים שפגשת. ידע שנשאר.</p>
        </div>
        <Link className="button primary" to="/learn/session/smart">
          <Play size={18} />
          התחלת חזרה
        </Link>
      </section>
      <RemoteState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.reload()}
      />
      {d && (
        <>
          <div className="live-stats-grid">
            <div>
              <span>
                <Zap size={18} />
                XP מהשרת
              </span>
              <b>{d.gamification.totalXp.toLocaleString()}</b>
              <small>
                רמה {d.gamification.level} · הרמה הבאה ב־
                {d.gamification.nextLevelXp} XP
              </small>
              <small>
                {d.gamification.dailyXpCapReached
                  ? `עברת את הסף היומי (${d.gamification.dailyXpCap} XP). הצבירה ממשיכה ב־${d.gamification.postDailyCapPercent}% עד היום הבא לפי אזור הזמן בפרופיל (${d.weeklyActivity.timezone}).`
                  : `${d.gamification.todayXp} מתוך ${d.gamification.dailyXpCap} XP בתגמול מלא היום`}
              </small>
            </div>
            <div>
              <span>
                <Flame size={18} />
                רצף תרגול
              </span>
              <b>{d.gamification.currentStreakDays}</b>
              <small>שיא: {d.gamification.longestStreakDays} ימים</small>
            </div>
            <div>
              <span>
                <Trophy size={18} />
                מילים שנלמדו
              </span>
              <b>{d.counts.mastered}</b>
              <small>כולל החלטות ידניות ומערכת</small>
            </div>
            <div>
              <span>
                <Brain size={18} />
                לחזרה עכשיו
              </span>
              <b>{d.counts.due}</b>
              <small>מילים פעילות שהגיע מועדן</small>
            </div>
            <div>
              <span>
                <Sparkles size={18} />
                בדרך ל״נלמד״
              </span>
              <b>{d.counts.awaitingRecall}</b>
              <small>מילים שממתינות להשלמת שליפה מוקלדת</small>
            </div>
          </div>
          <section className="smart-session-card">
            <div className="smart-visual">
              <Brain size={48} />
            </div>
            <div className="smart-copy">
              <span className="pill light">
                <Sparkles size={15} />
                השרת בוחר מה לתרגל
              </span>
              <h2>הצעד הקטן של היום</h2>
              <p>
                {d.counts.total === 0
                  ? "הוסיפו את המילה הראשונה שלכם כדי להתחיל."
                  : `${d.counts.total} מילים בספרייה. חזרה קצרה תעזור למילים להישאר.`}
              </p>
            </div>
            <Link
              className="button smart-start"
              to={d.counts.total ? "/learn/session/smart" : "/vocabulary"}
            >
              {d.counts.total ? "לתרגול החכם" : "לאוצר המילים"}
            </Link>
          </section>
          <section className="live-panel dashboard-packs-panel">
            <div className="pack-dashboard-heading">
              <div>
                <span className="pill light">
                  <LibraryBig size={15} /> למידה לפי מאגר
                </span>
                <h2>המאגרים שבלמידה</h2>
              </div>
              <Link className="text-link" to="/word-packs">
                לכל המאגרים
              </Link>
            </div>
            <RemoteState
              loading={packs.loading}
              error={packs.error}
              retry={() => void packs.reload()}
            />
            {installedPacks && installedPacks.length > 0 && (
              <div className="dashboard-pack-grid">
                {installedPacks.map((pack) => {
                  const percent = pack.progress.linked
                    ? Math.round(
                        (pack.progress.mastered / pack.progress.linked) * 100,
                      )
                    : 0;
                  return (
                    <article className="dashboard-pack-card" key={pack.id}>
                      <div>
                        <small>{pack.track.title}</small>
                        <h3>{pack.title}</h3>
                      </div>
                      <strong>{percent}%</strong>
                      <progress
                        max={100}
                        value={percent}
                        aria-label={`התקדמות במאגר ${pack.title}`}
                      />
                      <p>
                        {pack.progress.mastered} מתוך {pack.progress.linked}{" "}
                        מילים הושלמו
                      </p>
                      <Link
                        className="button secondary"
                        to={`/learn/session/smart?pack=${pack.id}`}
                      >
                        <Play size={16} /> המשך לימוד
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
            {installedPacks && !installedPacks.length && (
              <div className="live-empty">
                <p>עדיין לא הוספת מאגר ללמידה.</p>
                <Link className="button secondary" to="/word-packs">
                  בחירת מאגר ראשון
                </Link>
              </div>
            )}
          </section>
          <div className="live-two-columns">
            <section className="live-panel">
              <h2>היעד היומי</h2>
              <p>
                {d.dailyGoal.current} מתוך {d.dailyGoal.value}{" "}
                {d.dailyGoal.type === "minutes"
                  ? "דקות"
                  : d.dailyGoal.type === "attempts"
                    ? "ניסיונות"
                    : "מילים ייחודיות"}
              </p>
              <progress
                max={d.dailyGoal.value || 1}
                value={Math.min(d.dailyGoal.current, d.dailyGoal.value)}
                aria-label="היעד היומי מהשרת"
              />
              <p>
                {d.dailyGoal.completed
                  ? "היעד הושלם!"
                  : "בקצב שלך, צעד אחר צעד."}
              </p>
              <small>תאריך לפי אזור הזמן שלך: {d.dailyGoal.date}</small>
            </section>
            <section className="live-panel">
              <h2>תמונת הספרייה</h2>
              <div className="live-count-list">
                {["new", "learning", "reviewing", "mastered"].map((s) => (
                  <span key={s}>
                    {labels[s]} <b>{d.counts[s as "new"]}</b>
                  </span>
                ))}
                <span>
                  קשות <b>{d.counts.difficult}</b>
                </span>
                <span>
                  עדיפות גבוהה <b>{d.counts.highPriority}</b>
                </span>
                <span>
                  ממתינות לשליפה <b>{d.counts.awaitingRecall}</b>
                </span>
              </div>
              <small>
                הספירה כוללת מילים מושהות ובארכיון, ללא מילים שנמחקו.
              </small>
            </section>
          </div>
          <section className="live-panel">
            <h2>חמשת כישורי השפה</h2>
            <div className="live-skill-grid">
              {[
                "recognition",
                "recall",
                "listening",
                "spelling",
                "pronunciation",
              ].map((s) => {
                const value = d.skills.find((v) => v.skill === s);
                return (
                  <div key={s}>
                    <b>{labels[s]}</b>
                    {value ? (
                      <>
                        <progress value={value.masteryScore} max={100} />
                        <span>
                          {Math.round(value.masteryScore)}% ·{" "}
                          {value.evidenceAttempts} ניסיונות
                        </span>
                      </>
                    ) : (
                      <span>טרם נצברו נתונים</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          <div className="live-two-columns">
            <section className="live-panel">
              <h2>השבוע שלך</h2>
              <p>
                {Math.floor(
                  d.weeklyActivity.days.reduce(
                    (sum, day) => sum + day.practiceSeconds,
                    0,
                  ) / 60,
                )}{" "}
                דקות תרגול ·{" "}
                {d.weeklyActivity.days.reduce(
                  (sum, day) => sum + day.itemsMastered,
                  0,
                )}{" "}
                מילים שנלמדו
              </p>
              <div className="live-activity">
                {d.weeklyActivity.days.length ? (
                  d.weeklyActivity.days.map((day) => (
                    <div key={day.date}>
                      <time>{day.date}</time>
                      <progress
                        max={Math.max(
                          ...d.weeklyActivity.days.map((v) => v.attempts),
                          1,
                        )}
                        value={day.attempts}
                      />
                      <small>
                        {day.attempts} ניסיונות · {day.xpEarned} XP
                      </small>
                    </div>
                  ))
                ) : (
                  <p>כאן תופיע הפעילות הראשונה שלך.</p>
                )}
              </div>
              <small>{d.weeklyActivity.timezone}</small>
            </section>
            <section className="live-panel">
              <h2>כדאי לחזק</h2>
              <RemoteState
                loading={weakest.loading}
                error={weakest.error}
                retry={() => void weakest.reload()}
              />
              {weakItems?.map((i) => (
                <Link
                  className="live-weak-word"
                  key={i.id}
                  to={`/vocabulary?item=${i.id}`}
                >
                  <b dir="auto">{i.sourceText}</b>
                  <span dir="auto">{i.primaryTranslation}</span>
                  <small>{Math.round(i.overallMasteryScore)}%</small>
                </Link>
              ))}
              {weakItems && !weakItems.length && (
                <p>אין כרגע מילים שדורשות חיזוק.</p>
              )}
            </section>
          </div>
          <section className="live-panel">
            <h2>התרגולים האחרונים</h2>
            <div className="live-count-list">
              {d.modes.map((m) => (
                <span key={m.exerciseType}>
                  {labels[m.exerciseType] || m.exerciseType}: {m.attempts}{" "}
                  ניסיונות · ציון ממוצע{" "}
                  {m.averageScore === null ? "—" : Math.round(m.averageScore)}
                </span>
              ))}
            </div>
            {d.recentActivity.map((a) => (
              <div className="live-toolbar" key={a.id}>
                <Link to={`/vocabulary?item=${a.learningItemId}`}>
                  פרטי המילה
                </Link>
                <span>{labels[a.exerciseType] || a.exerciseType}</span>
                <span>{labels[a.result] || a.result}</span>
                <small>{new Date(a.createdAt).toLocaleString("he-IL")}</small>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
