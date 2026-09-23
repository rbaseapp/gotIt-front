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
import { useTranslation } from "react-i18next";

const games: Array<{
  id: GameType;
  icon: typeof Layers3;
  tone: string;
}> = [
  {
    id: "flashcards",
    icon: Layers3,
    tone: "mint",
  },
  {
    id: "recall",
    icon: MessageCircleQuestion,
    tone: "violet",
  },
  {
    id: "listening",
    icon: Headphones,
    tone: "blue",
  },
  {
    id: "matching",
    icon: MousePointer2,
    tone: "orange",
  },
  {
    id: "pronunciation",
    icon: Mic2,
    tone: "rose",
  },
];

const gameOrder: GameType[] = [
  "matching",
  "flashcards",
  "pronunciation",
  "listening",
  "recall",
];

export function LearnPage() {
  const { t } = useTranslation();
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
        title={t("demoLearn.capabilityTitle")}
        milestone={t("demoLearn.capabilityMilestone")}
      />
    );

  return (
    <div className="learn-page page-enter">
      <section className="learn-heading">
        <div>
          <p className="eyebrow">{t("demoLearn.eyebrow")}</p>
          <h1>{t("demoLearn.title")}</h1>
          <p>{t("demoLearn.description")}</p>
        </div>
        <div className="session-stats">
          <span>
            <Trophy size={18} />
            {t("demoLearn.demoAccuracy")}{" "}
            <b>
              {accuracy === null ? t("demoLearn.notPracticed") : accuracy + "%"}
            </b>
          </span>
          <span>
            <Zap size={18} />
            {t("demoLearn.demoXp", { xp: stats.xp.toLocaleString() })}
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
            {t("demoLearn.mixedDemo")}
          </span>
          <h2>{t("demoLearn.smartSession")}</h2>
          <p>{t("demoLearn.smartDescription", { count: due })}</p>
          <div className="smart-tags">
            <span>
              <Clock3 size={16} />
              {t("demoLearn.aboutMinutes", { count: 8 })}
            </span>
            <span>
              <PenLine size={16} />
              {t("demoLearn.upTo")}{" "}
              {Math.min(
                8,
                items.filter(
                  (item) => !item.deletedAt && item.userStatus === "ACTIVE",
                ).length,
              )}{" "}
              {t("demoLearn.words")}
            </span>
            <span>
              <Volume2 size={16} />
              {t("demoLearn.gamesCount", { count: 3 })}
            </span>
          </div>
        </div>
        <button className="button smart-start" onClick={() => go("smart")}>
          <Play size={19} fill="currentColor" />
          {t("demoLearn.startSession")}
          <ArrowLeft size={18} />
        </button>
      </section>

      <div className="section-title">
        <div>
          <h2>{t("demoLearn.chooseGame")}</h2>
          <p>{t("demoLearn.chooseGameDescription")}</p>
        </div>
      </div>
      <section className="game-grid">
        {gameOrder
          .map((id) => games.find((game) => game.id === id)!)
          .map(({ id, icon: Icon, tone }) => (
            <button className="game-card" key={id} onClick={() => go(id)}>
              <span className={`game-icon ${tone}`}>
                <Icon size={27} />
              </span>
              <span className="game-card-copy">
                <b>{t(`demoLearn.games.${id}.title`)}</b>
                <small>{t(`demoLearn.games.${id}.subtitle`)}</small>
              </span>
              <span className="game-card-meta">
                <span>
                  <Clock3 size={14} />
                  {t(`demoLearn.games.${id}.time`)}
                </span>
                <span>{t(`demoLearn.games.${id}.skills`)}</span>
              </span>
              <span className="game-arrow">
                <ChevronLeft size={19} />
              </span>
            </button>
          ))}
      </section>

      <section className="learning-tip">
        <span>
          <Sparkles size={21} />
        </span>
        <div>
          <b>{t("demoLearn.didYouKnow")}</b>
          <p>{t("demoLearn.tip")}</p>
        </div>
      </section>
    </div>
  );
}
