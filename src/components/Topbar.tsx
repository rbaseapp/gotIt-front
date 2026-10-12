import type { RefObject } from "react";
import { BarChart3, Crown, Flame, Menu, Plus, Zap } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { learningReturn } from "../lib/learningNavigation";
import { topbarNavigation, type TopbarVariant } from "../lib/appNavigation";
import { useTopbarAssessment } from "../lib/useTopbarAssessment";
import { Logo } from "./Logo";
import { TopbarAccountMenu } from "./TopbarAccountMenu";

function PracticeLogo() {
  return (
    <Link to="/dashboard" className="practice-logo" aria-label="GotIt">
      <span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="#F5C542"
          aria-hidden="true"
        >
          <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" />
        </svg>
      </span>
      GotIt
    </Link>
  );
}

function TopbarBrand({
  variant,
  onAddWord,
}: {
  variant: TopbarVariant;
  onAddWord: () => void;
}) {
  const { t } = useTranslation();
  return variant === "mywords" ? (
    <>
      <button
        className="mw-header-add"
        aria-label={t("vocabulary.newWord")}
        onClick={onAddWord}
      >
        <Plus size={26} />
      </button>
      <Link className="mw-logo" to="/dashboard">
        GotIt
        <i aria-hidden="true" />
      </Link>
    </>
  ) : variant === "practice" ? (
    <PracticeLogo />
  ) : (
    <Logo />
  );
}

type TopbarProps = {
  variant: TopbarVariant;
  title: string;
  showBack: boolean;
  mobileOpen: boolean;
  menuRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
  onAddWord: () => void;
  onLogout: () => void;
};

export function Topbar({
  variant,
  title,
  showBack,
  mobileOpen,
  menuRef,
  onOpenMenu,
  onAddWord,
  onLogout,
}: TopbarProps) {
  const { t } = useTranslation();
  const { mode, stats } = useApp();
  const { status } = useSubscription();
  const location = useLocation();
  const dashboardShell = variant !== "standard";
  const practiceShell = variant === "practice";
  const myWordsShell = variant === "mywords";
  const { latestLessonAssessment, latestLevelLabel, assessmentLanguageLabel } =
    useTopbarAssessment();
  return (
    <header className="topbar">
      {dashboardShell && (
        <div className="nd-desktop-brand">
          <TopbarBrand variant={variant} onAddWord={onAddWord} />
        </div>
      )}
      {dashboardShell && (
        <nav
          className="nd-top-navigation"
          aria-label={t("shell.mainNavigation")}
        >
          {topbarNavigation(variant).map(({ to, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
      )}
      <div className="topbar-title">
        <span className="mobile-brand">
          <TopbarBrand variant={variant} onAddWord={onAddWord} />
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
        {(practiceShell || myWordsShell) && (
          <Link className="practice-pro" to="/billing">
            {myWordsShell && <Crown size={18} />}
            {myWordsShell && status?.tier === "paid"
              ? "Pro"
              : myWordsShell && status?.tier === "trial"
                ? t("myWords.trial", {
                    count: status.trial?.daysRemaining ?? 0,
                  })
                : t("shell.upgradePro")}
          </Link>
        )}
        {showBack && (
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
        )}
        {!dashboardShell && latestLessonAssessment?.report && (
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
        <TopbarAccountMenu
          showAccountLink={dashboardShell}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
