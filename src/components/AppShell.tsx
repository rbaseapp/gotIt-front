import { useEffect, useRef, useState, type ReactNode } from "react";
import { HelpCircle, Plus, X, Zap, UserRound } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { isDue } from "../lib/utils";
import { navItems } from "../lib/appNavigation";
import { dashboardDesignEnabled } from "../lib/dashboardDesign";
import { practiceDesignEnabled } from "../lib/practiceDesign";
import { myWordsDesignEnabled } from "../lib/myWords";
import { AddWordModal } from "./AddWordModal";
import { Logo } from "./Logo";
import { LiveCaptureModal } from "./LiveCaptureModal";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { Topbar, LearningBackLink } from "./Topbar";
import { DefaultLearningStatusBar } from "./DefaultLearningStatusBar";
import {
  LearningStatusProvider,
  PersistentLearningStatusBar,
} from "./LearningStatusProvider";

const rootNavItems = navItems.slice(0, 4);

export function AppShell({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { items, mode, user, profileError, retryProfile } = useApp();
  const location = useLocation();
  const sharedHeader = mode === "live" && dashboardDesignEnabled();
  const practiceShell =
    mode === "live" &&
    location.pathname === "/learn" &&
    practiceDesignEnabled();
  const myWordsShell =
    mode === "live" &&
    location.pathname === "/vocabulary" &&
    myWordsDesignEnabled();
  const dashboardShell =
    myWordsShell ||
    practiceShell ||
    (mode === "live" &&
      location.pathname === "/dashboard" &&
      dashboardDesignEnabled());
  const focusedLearning =
    /^\/(courses\/[^/]+|homework\/[^/]+)(\/|$)/.test(location.pathname) ||
    location.pathname === "/private-lesson";
  const focusShell =
    sharedHeader ||
    dashboardShell ||
    location.pathname === "/private-lesson" ||
    location.pathname === "/achievements";
  const navigate = useNavigate();
  const { hasEntitlement, status } = useSubscription();
  const canWriteVocabulary = hasEntitlement("vocabulary.write");
  const [addOpen, setAddOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia?.("(max-width: 860px)").matches ?? false,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 860px)");
    if (!media) return;
    const changed = () => setNarrow(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if ((!narrow && !focusShell) || !mobileOpen) return;
    const previous = document.body.style.overflow;
    const trigger = menuRef.current;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".mobile-close")
      ?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keyboard);
      trigger?.focus();
    };
  }, [narrow, focusShell, mobileOpen]);
  useEffect(() => {
    const openSidebar = () => setMobileOpen(true);
    window.addEventListener("gotit:open-sidebar", openSidebar);
    return () => window.removeEventListener("gotit:open-sidebar", openSidebar);
  }, []);
  const pageTitle = focusedLearning
    ? "nav.privateLesson"
    : navItems.find((item) =>
        location.pathname.startsWith(item.to.split("?")[0]),
      )?.labelKey;
  const openAddWord = () =>
    canWriteVocabulary ? setAddOpen(true) : navigate("/billing");

  return (
    <LearningStatusProvider
      key={`${mode}:${user?.applicationId}:${user?.id}`}
      enabled={sharedHeader}
    >
      <div
        className={`app-layout${sharedHeader ? " shared-header-shell" : ""}${focusShell ? " focus-shell" : ""}${dashboardShell ? " nd-shell" : ""}${practiceShell ? " practice-shell" : ""}${myWordsShell ? " mywords-shell" : ""}`}
      >
        <aside
          ref={sidebarRef}
          className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
          inert={((narrow || focusShell) && !mobileOpen) || undefined}
          aria-hidden={((narrow || focusShell) && !mobileOpen) || undefined}
          role={(narrow || focusShell) && mobileOpen ? "dialog" : undefined}
          aria-modal={((narrow || focusShell) && mobileOpen) || undefined}
          aria-label={t("shell.mainNavigation")}
        >
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
            onClick={openAddWord}
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
                    isActive ||
                    (to === "/courses" &&
                      location.pathname === "/english-learning")
                      ? "nav-link active"
                      : "nav-link"
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
          <div className="sidebar-tip" hidden>
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
          <button
            className="button ghost sidebar-account"
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate("/account");
            }}
          >
            <UserRound size={20} />
            {t("ux.account")}
          </button>
          <nav
            className="sidebar-legal-links"
            aria-label={t("shell.legalNavigation")}
          >
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
        <main
          className="main-column"
          inert={((sharedHeader || dashboardShell) && mobileOpen) || undefined}
        >
          <Topbar
            redesigned={sharedHeader}
            title={pageTitle ? t(pageTitle) : "GotIt"}
            showBack={focusShell && !dashboardShell}
            mobileOpen={mobileOpen}
            menuRef={menuRef}
            onOpenMenu={() => setMobileOpen(true)}
            onLogout={onLogout}
            onAddWord={openAddWord}
          />
          {sharedHeader && (
            <div className="app-learning-status">
              <PersistentLearningStatusBar />
            </div>
          )}
          {sharedHeader && !dashboardShell && <DefaultLearningStatusBar />}
          <div className="page-content">
            {sharedHeader &&
              ["/private-lesson", "/achievements"].includes(
                location.pathname,
              ) && <LearningBackLink />}

            {mode === "live" &&
              user?.role !== "admin" &&
              /^\/(?:transfer)(?:\/|$)/u.test(location.pathname) && (
                <SubscriptionBanner />
              )}
            {(!focusedLearning || mode === "demo") &&
              (mode === "demo" ||
                (user?.role !== "admin" && status?.tier === "free")) && (
                <div
                  className={
                    mode === "demo" ? "mode-banner demo" : "mode-banner live"
                  }
                >
                  {mode === "demo"
                    ? t("shell.demoBanner")
                    : t("shell.readOnlyBanner")}
                </div>
              )}
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
        <nav
          className="mobile-tabs"
          aria-label={t("ux.rootNavigation")}
          inert={((sharedHeader || dashboardShell) && mobileOpen) || undefined}
        >
          {rootNavItems
            .filter((item) => !item.liveOnly || mode === "live")
            .map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `mobile-tab${isActive || (to === "/courses" && location.pathname === "/english-learning") ? " active" : ""}`
                }
              >
                <Icon size={24} aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
        </nav>
        {mode === "live" ? (
          <LiveCaptureModal
            open={addOpen && canWriteVocabulary}
            onClose={() => setAddOpen(false)}
          />
        ) : (
          <AddWordModal open={addOpen} onClose={() => setAddOpen(false)} />
        )}
      </div>
    </LearningStatusProvider>
  );
}
