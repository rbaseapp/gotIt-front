import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Flame,
  Headphones,
  MessageCircle,
  Pause,
  PenLine,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isDue, levelFromXp, skillLabels, xpInLevel } from "../lib/utils";
import { CapabilityNotice } from "../components/CapabilityNotice";
import type { SkillKey } from "../types";
import { useTranslation } from "react-i18next";

const skillIcons = {
  recognition: Brain,
  recall: MessageCircle,
  listening: Headphones,
  spelling: PenLine,
  pronunciation: Volume2,
};
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { items, profile, stats, mode, attempts, sessions } = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState(7);
  const active = items.filter(
    (item) => !item.deletedAt && item.userStatus === "ACTIVE",
  );
  const due = active.filter(isDue);
  const mastered = active.filter((item) => item.status === "MASTERED");
  const paused = items.filter(
    (item) => !item.deletedAt && item.userStatus === "PAUSED",
  );
  const masteredWeek = items.filter(
    (item) =>
      !item.deletedAt &&
      item.firstMasteredAt &&
      +new Date(item.firstMasteredAt) >= Date.now() - 7 * 86400000,
  ).length;
  const weakest = [...active].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const progress = Math.min(
    100,
    Math.round((stats.learnedToday / profile.dailyGoal.value) * 100),
  );
  const units = {
    items: t("demoDashboard.units.items"),
    attempts: t("demoDashboard.units.attempts"),
    minutes: t("demoDashboard.units.minutes"),
  };
  const dateOf = (value: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: profile.timezone }).format(
      new Date(value),
    );
  const activity = Array.from({ length: range }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (range - 1 - index));
    const key = dateOf(date.toISOString());
    const minutes =
      sessions
        .filter((session) => dateOf(session.startedAt) === key)
        .reduce((sum, session) => sum + session.durationSeconds, 0) / 60;
    return {
      day: new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "numeric",
        timeZone: profile.timezone,
      }).format(date),
      minutes,
    };
  });
  const maxMinutes = Math.max(5, ...activity.map((value) => value.minutes));
  const recent = attempts.filter(
    (attempt) => +new Date(attempt.createdAt) >= Date.now() - 7 * 86400000,
  );
  const xpWeek = recent.reduce((sum, attempt) => sum + (attempt.xp || 0), 0);
  const averageSkills = (Object.keys(skillLabels) as SkillKey[]).reduce(
    (result, key) => ({
      ...result,
      [key]: Math.round(
        active.reduce((sum, item) => sum + item.skills[key], 0) /
          Math.max(active.length, 1),
      ),
    }),
    {} as Record<SkillKey, number>,
  );
  const weakSkill = (Object.keys(skillLabels) as SkillKey[]).sort(
    (a, b) => averageSkills[a] - averageSkills[b],
  )[0];
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: profile.timezone,
    }).format(now),
  );
  const greeting =
    hour < 12
      ? t("demoDashboard.morning")
      : hour < 18
        ? t("demoDashboard.afternoon")
        : t("demoDashboard.evening");
  const practiceWord = (id: string) =>
    navigate("/learn/session/recall?items=" + encodeURIComponent(id));
  if (mode !== "demo")
    return (
      <CapabilityNotice
        title={t("demoDashboard.capabilityTitle")}
        milestone={t("demoDashboard.capabilityMilestone")}
      />
    );
  return (
    <div className="dashboard page-enter">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat(i18n.language, {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: profile.timezone,
            }).format(now)}
          </p>
          <h1>
            {greeting}, {profile.name} <span className="wave">👋</span>
          </h1>
          <p>
            {progress >= 100
              ? t("demoDashboard.goalCompletedMessage")
              : t("demoDashboard.encouragement")}
          </p>
        </div>
        <div className="daily-goal-card">
          <div
            className="goal-ring"
            style={
              { "--progress": progress * 3.6 + "deg" } as React.CSSProperties
            }
          >
            <span>
              {stats.learnedToday}
              <small>/{profile.dailyGoal.value}</small>
            </span>
          </div>
          <div>
            <b>{t("demoDashboard.yourDailyGoal")}</b>
            <small>
              {progress >= 100
                ? t("dashboard.goalCompleted")
                : t("demoDashboard.goalRemaining", {
                    count: Math.max(
                      0,
                      profile.dailyGoal.value - stats.learnedToday,
                    ),
                    unit: units[profile.dailyGoal.type],
                  })}
            </small>
          </div>
          <Check
            size={18}
            className={progress >= 100 ? "goal-check complete" : "goal-check"}
          />
        </div>
      </section>
      <section className="hero-review-card">
        <div className="hero-orb">
          <Brain size={42} />
          <span className="orb-spark one">✦</span>
          <span className="orb-spark two">✦</span>
        </div>
        <div className="hero-copy">
          <span className="pill light">
            <Sparkles size={14} />
            {t("demoDashboard.demoReady")}
          </span>
          <h2>
            {due.length
              ? t("demoDashboard.wordsWaiting", { count: due.length })
              : t("demoDashboard.anyTime")}
          </h2>
          <p>{t("demoDashboard.sessionDescription")}</p>
          <div className="hero-meta">
            <span>
              <Clock3 size={16} />
              {t("demoDashboard.aboutMinutes", { count: 6 })}
            </span>
            <span>
              <BookOpen size={16} />
              {t("demoDashboard.upToWords", {
                count: Math.min(8, active.length),
              })}
            </span>
            <span>
              <Zap size={16} />
              {t("demoDashboard.demoXpLimited")}
            </span>
          </div>
        </div>
        <button
          className="button hero-button"
          disabled={!active.length}
          onClick={() => navigate("/learn/session/smart")}
        >
          {t("demoDashboard.startNow")}
          <ArrowLeft size={19} />
        </button>
      </section>
      <section className="metric-grid">
        {[
          {
            label: t("demoDashboard.metrics.due"),
            value: due.length,
            Icon: CalendarDays,
            color: "orange",
            sub: t("demoDashboard.metrics.sampleDates"),
          },
          {
            label: t("demoDashboard.metrics.active"),
            value: active.length,
            Icon: BookOpen,
            color: "green",
            sub: t("demoDashboard.metrics.newWords", {
              count: active.filter((item) => item.status === "NEW").length,
            }),
          },
          {
            label: t("demoDashboard.metrics.mastered"),
            value: mastered.length,
            Icon: Trophy,
            color: "purple",
            sub: t("demoDashboard.metrics.sampleManual"),
          },
          {
            label: t("demoDashboard.metrics.paused"),
            value: paused.length,
            Icon: Pause,
            color: "yellow",
            sub: t("demoDashboard.metrics.outsideQueue"),
          },
          {
            label: t("demoDashboard.metrics.streak"),
            value: stats.streak,
            Icon: Flame,
            color: "orange",
            sub: t("demoDashboard.metrics.demoDays"),
          },
          {
            label: t("demoDashboard.metrics.demoXp"),
            value: stats.xp,
            Icon: Zap,
            color: "yellow",
            sub: t("demoDashboard.metrics.level", {
              level: levelFromXp(stats.xp),
            }),
          },
          {
            label: t("demoDashboard.metrics.weekTime"),
            value: stats.minutesThisWeek,
            Icon: Clock3,
            color: "green",
            sub: t("demoDashboard.metrics.sessionMinutes"),
          },
          {
            label: t("demoDashboard.metrics.masteredWeek"),
            value: masteredWeek,
            Icon: Check,
            color: "purple",
            sub: t("demoDashboard.metrics.manualMarks"),
          },
        ].map(({ label, value, Icon, color, sub }) => (
          <article className="metric-card" key={label}>
            <div className={"metric-icon " + color}>
              <Icon size={21} />
            </div>
            <div>
              <small>{label}</small>
              <strong>{value.toLocaleString()}</strong>
              <span className="trend">{sub}</span>
            </div>
          </article>
        ))}
      </section>
      <div className="dashboard-columns">
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h3>{t("demoDashboard.activity")}</h3>
              <p>{t("demoDashboard.activityDescription")}</p>
            </div>
            <select
              className="select-compact"
              aria-label={t("demoDashboard.activityRange")}
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
            >
              <option value={7}>{t("demoDashboard.week")}</option>
              <option value={28}>{t("demoDashboard.month")}</option>
            </select>
          </div>
          <div className="chart-area">
            <div className="chart-grid">
              <span>{Math.ceil(maxMinutes)}</span>
              <span>{Math.ceil(maxMinutes / 2)}</span>
              <span>0</span>
            </div>
            <div className="bars">
              {activity.map((entry, index) => (
                <div className="bar-column" key={entry.day}>
                  <div
                    aria-label={t("demoDashboard.minutesOnDay", {
                      day: entry.day,
                      minutes: entry.minutes.toFixed(1),
                    })}
                    className={
                      "bar " + (index === activity.length - 1 ? "today" : "")
                    }
                    style={{ height: (entry.minutes / maxMinutes) * 100 + "%" }}
                  >
                    <span className="bar-tooltip">
                      {t("demoDashboard.minutesShort", {
                        count: entry.minutes.toFixed(1),
                      })}
                    </span>
                  </div>
                  <small>{entry.day}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-footer-stat">
            <Clock3 size={17} />
            <span>
              {t("demoDashboard.lastSevenDays", {
                count: stats.minutesThisWeek,
              })}
            </span>
          </div>
        </section>
        <section className="panel skills-panel">
          <div className="panel-header">
            <div>
              <h3>{t("demoDashboard.languageSkills")}</h3>
              <p>{t("demoDashboard.skillsDescription")}</p>
            </div>
            <Link to="/vocabulary" className="text-link">
              {t("demoDashboard.toWords")} <ChevronLeft size={15} />
            </Link>
          </div>
          <div className="skill-list">
            {(Object.keys(skillLabels) as SkillKey[]).map((key) => {
              const Icon = skillIcons[key];
              return (
                <div className="skill-row" key={key}>
                  <span className={"skill-mini-icon " + key}>
                    <Icon size={16} />
                  </span>
                  <span className="skill-name">{skillLabels[key]}</span>
                  <div className="progress-track">
                    <span style={{ width: averageSkills[key] + "%" }} />
                  </div>
                  <b>{averageSkills[key]}%</b>
                </div>
              );
            })}
          </div>
          <div className="skill-insight">
            <Sparkles size={17} />
            <span>
              <b>
                {t("demoDashboard.strengthenSkill", {
                  skill: skillLabels[weakSkill],
                })}
              </b>
              <small>{t("demoDashboard.scoresNote")}</small>
            </span>
            <Link to="/learn" aria-label={t("demoDashboard.goPractice")}>
              <ChevronLeft size={18} />
            </Link>
          </div>
        </section>
      </div>
      <div className="dashboard-columns lower">
        <section className="panel weak-panel">
          <div className="panel-header">
            <div>
              <h3>{t("dashboard.strengthen")}</h3>
              <p>{t("demoDashboard.weakWordsDescription")}</p>
            </div>
            <Link to="/vocabulary" className="text-link">
              {t("demoDashboard.toList")} <ChevronLeft size={15} />
            </Link>
          </div>
          <div className="weak-list">
            {weakest.map((item, index) => (
              <div className="weak-row" key={item.id}>
                <span className="rank">0{index + 1}</span>
                <div className="word-info">
                  <b dir="auto">{item.source}</b>
                  <small dir="auto">{item.translation}</small>
                </div>
                <span className="mastery-mini">
                  <i style={{ width: item.mastery + "%" }} />
                </span>
                <b className="mastery-number">{item.mastery}%</b>
                <button
                  className="icon-button"
                  aria-label={t("demoDashboard.practiceWord", {
                    word: item.source,
                  })}
                  onClick={() => practiceWord(item.id)}
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="level-card">
          <div className="level-top">
            <div className="level-badge">
              <Star size={23} fill="currentColor" />
              <span>{levelFromXp(stats.xp)}</span>
            </div>
            <div>
              <small>{t("demoDashboard.yourDemoLevel")}</small>
              <h3>{t("demoDashboard.smallStep")}</h3>
            </div>
          </div>
          <div className="level-xp">
            <span>{xpInLevel(stats.xp)} / 500 XP</span>
            <b>
              {t("demoDashboard.nextLevel", { xp: 500 - xpInLevel(stats.xp) })}
            </b>
          </div>
          <div className="level-progress">
            <span style={{ width: (xpInLevel(stats.xp) / 500) * 100 + "%" }} />
          </div>
          <p>
            <Zap size={16} />
            {t("demoDashboard.weekXp", { xp: xpWeek })}
          </p>
        </section>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>{t("demoDashboard.accuracyByGame")}</h3>
              <p>{t("demoDashboard.accuracyDescription")}</p>
            </div>
          </div>
          {["recall", "listening", "matching"].map((game) => {
            const values = recent.filter(
              (attempt) =>
                attempt.game === game && attempt.result !== "skipped",
            );
            const percent = values.length
              ? Math.round(
                  (values.filter((value) => value.correct).length /
                    values.length) *
                    100,
                )
              : null;
            return (
              <div className="accuracy-row" key={game}>
                <span>
                  {
                    {
                      recall: t("labels.recall"),
                      listening: t("labels.listening_spelling"),
                      matching: t("labels.matching"),
                    }[game]
                  }
                </span>
                <div className="progress-track">
                  <span style={{ width: (percent || 0) + "%" }} />
                </div>
                <b>
                  {percent === null
                    ? t("demoLearn.notPracticed")
                    : percent + "%"}
                </b>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>{t("demoDashboard.recentActivity")}</h3>
              <p>{t("demoDashboard.eventsDescription")}</p>
            </div>
          </div>
          {attempts
            .slice(-4)
            .reverse()
            .map((attempt) => (
              <div className="attempt-history-row" key={attempt.id}>
                <span dir="auto">
                  {items.find((item) => item.id === attempt.itemId)?.source ||
                    t("demoDashboard.deletedWord")}
                </span>
                <b>
                  {attempt.result === "skipped"
                    ? t("labels.skipped")
                    : attempt.score + "%"}
                </b>
                <small>
                  {new Date(attempt.createdAt).toLocaleTimeString(
                    i18n.language,
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: profile.timezone,
                    },
                  )}
                </small>
              </div>
            ))}
          {!attempts.length && (
            <p className="muted-note">{t("demoDashboard.firstSession")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
