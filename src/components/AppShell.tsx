import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  BookOpenText,
  LibraryBig,
  ChevronDown,
  CreditCard,
  Flame,
  Gamepad2,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isDue, levelFromXp } from "../lib/utils";
import { AddWordModal } from "./AddWordModal";
import { Logo } from "./Logo";
import { LiveCaptureModal } from "./LiveCaptureModal";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: BarChart3 },
  { to: "/learn", labelKey: "nav.learn", icon: Gamepad2 },
  { to: "/vocabulary", labelKey: "nav.vocabulary", icon: BookOpen },
  { to: "/word-packs", labelKey: "nav.wordPacks", icon: LibraryBig, liveOnly: true },
  { to: "/reading", labelKey: "nav.reading", icon: BookOpenText },
  { to: "/transfer", labelKey: "nav.transfer", icon: BookOpen },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
  { to: "/billing", labelKey: "nav.billing", icon: CreditCard, liveOnly: true },
];

export function AppShell({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { profile, stats, items, mode, profileError, retryProfile } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasEntitlement, status } = useSubscription();
  const canWriteVocabulary = hasEntitlement("vocabulary.write");
  const [addOpen, setAddOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const pageTitle =
    navItems.find((item) => location.pathname.startsWith(item.to))?.labelKey;

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <Logo onClick={() => setMobileOpen(false)} />
          <button
            className="mobile-close icon-button"
            aria-label={t("shell.closeMenu")}
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <button
          className="button primary add-word-button"
          onClick={() =>
            canWriteVocabulary ? setAddOpen(true) : navigate("/billing")
          }
        >
          <Plus size={19} />
          {mode === "live" && !canWriteVocabulary
            ? t("shell.upgradePro")
            : t("shell.newWord")}
        </button>
        <nav className="sidebar-nav" aria-label={t("shell.mainNavigation")}>
          {navItems
            .filter((item) => !item.liveOnly || mode === "live")
            .map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <Icon size={20} />
                <span>{t(labelKey)}</span>
                {to === "/learn" && mode === "demo" && (
                  <span className="nav-count">
                    {items.filter(isDue).length}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon">
            <Zap size={18} />
          </span>
          <div>
            <strong>{t("shell.tipTitle")}</strong>
            <p>{t("shell.tipBody")}</p>
          </div>
        </div>
        <NavLink
          to="/help"
          className="help-link"
          onClick={() => setMobileOpen(false)}
        >
          <HelpCircle size={19} />
          {t("shell.helpCenter")}
        </NavLink>
        <nav className="sidebar-legal-links" aria-label={t("shell.legalNavigation")}>
          <Link to="/terms-of-service">{t("shell.terms")}</Link>
          <Link to="/privacy-policy">{t("shell.privacy")}</Link>
          <Link to="/refund-policy">{t("shell.refunds")}</Link>
        </nav>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label={t("shell.closeMenu")}
        />
      )}
      <main className="main-column">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu icon-button"
              aria-label={t("shell.openMenu")}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>{pageTitle ? t(pageTitle) : "GotIt"}</span>
          </div>
          <div className="topbar-actions">
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
            <div className="user-menu-wrap">
              <button
                className="user-button"
                aria-expanded={userOpen}
                aria-label={t("shell.accountMenu")}
                onClick={() => setUserOpen((value) => !value)}
              >
                <span className="avatar">{profile.name.charAt(0)}</span>
                <span className="user-copy">
                  <b>{profile.name}</b>
                  <small>
                    {mode === "demo"
                      ? t("shell.demoLevel", { level: levelFromXp(stats.xp) })
                      : status?.tier === "paid"
                        ? t("shell.proUser")
                        : status?.tier === "trial"
                          ? t("shell.trial")
                          : t("shell.freeAccount")}
                  </small>
                </span>
                <ChevronDown size={16} />
              </button>
              {userOpen && (
                <div className="user-popover">
                  <button onClick={onLogout}>
                    <LogOut size={17} />
                    {t("shell.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content">
          {mode === "live" && <SubscriptionBanner />}
          <div
            className={
              mode === "demo" ? "mode-banner demo" : "mode-banner live"
            }
          >
            {mode === "demo"
              ? t("shell.demoBanner")
              : status?.tier === "free"
                ? t("shell.readOnlyBanner")
                : t("shell.liveBanner")}
          </div>
          {profileError && (
            <div className="form-error" role="alert">
              {profileError}
              <button
                className="button ghost"
                onClick={() => void retryProfile()}
              >
                {t("shell.reload")}
              </button>
            </div>
          )}
          {children}
        </div>
      </main>
      {mode === "live" ? (
        <LiveCaptureModal
          open={addOpen && canWriteVocabulary}
          onClose={() => setAddOpen(false)}
        />
      ) : (
        <AddWordModal open={addOpen} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
