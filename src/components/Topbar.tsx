import type { RefObject } from "react";
import { BarChart3, Flame, Menu, Zap } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { learningReturn } from "../lib/learningNavigation";
import { topbarNavigation } from "../lib/appNavigation";
import { useTopbarAssessment } from "../lib/useTopbarAssessment";
import { Logo } from "./Logo";
import { TopbarAccountMenu } from "./TopbarAccountMenu";
import "./Topbar.css";

type TopbarProps = {
  redesigned: boolean;
  title: string;
  showBack: boolean;
  mobileOpen: boolean;
  menuRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
  onLogout: () => void;
  onAddWord: () => void;
};

export function Topbar({
  redesigned,
  title,
  showBack,
  mobileOpen,
  menuRef,
  onOpenMenu,
  onLogout,
  onAddWord,
}: TopbarProps) {
  const { t } = useTranslation();
  const { mode, stats } = useApp();
  const location = useLocation();

  const { latestLessonAssessment, latestLevelLabel, assessmentLanguageLabel } =
    useTopbarAssessment();
  if (redesigned) {
    return (
      <header className="app-topbar">
        <div className="app-header-brand">
          <Logo />
        </div>
        <nav
          className="app-top-navigation"
          aria-label={t("shell.mainNavigation")}
        >
          {topbarNavigation.map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ||
                (to === "/courses" && location.pathname === "/english-learning")
                  ? "active"
                  : ""
              }
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <button
          ref={menuRef}
          className="app-header-menu icon-button"
          aria-label={t("shell.openMenu")}
          aria-expanded={mobileOpen}
          onClick={onOpenMenu}
        >
          <Menu size={22} />
        </button>
        <div className="app-header-actions">
          <TopbarAccountMenu
            showAccountLink
            onLogout={onLogout}
            onAddWord={onAddWord}
          />
        </div>
      </header>
    );
  }
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="mobile-brand">
          <Logo />
        </span>
        <button
          ref={menuRef}
          className="mobile-menu icon-button"
          aria-label={t("shell.openMenu")}
          aria-expanded={mobileOpen}
          onClick={onOpenMenu}
        >
          <Menu size={22} />
        </button>
        <span>{title}</span>
      </div>
      <div className="topbar-actions">
        {showBack && <LearningBackLink />}
        {latestLessonAssessment?.report && (
          <Link
            to="/private-lesson?view=level"
            className="topbar-level-assessment"
            title={`${t("shell.levelAssessment")} · ${assessmentLanguageLabel}`}
          >
            <BarChart3 size={16} />
            <span>{assessmentLanguageLabel}</span>
            <b>{latestLevelLabel}</b>
          </Link>
        )}
        {mode === "demo" && (
          <>
            <div className="compact-stat streak">
              <Flame size={18} fill="currentColor" />
              <b>{stats.streak}</b>
              <span>{t("shell.days")}</span>
            </div>
            <div className="compact-stat xp">
              <Zap size={17} fill="currentColor" />
              <b>{stats.xp.toLocaleString()}</b>
              <span>{t("shell.demoXp")}</span>
            </div>
          </>
        )}
        <TopbarAccountMenu showAccountLink={false} onLogout={onLogout} />
      </div>
    </header>
  );
}

export function LearningBackLink() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <Link
      className="button ghost focus-back"
      to={
        location.pathname === "/achievements"
          ? "/account"
          : learningReturn(
              new URLSearchParams(location.search).get("return"),
              "/courses",
            )
      }
    >
      {t(
        new URLSearchParams(location.search).has("pack")
          ? "common.back"
          : "ux.backHome",
      )}
    </Link>
  );
}
