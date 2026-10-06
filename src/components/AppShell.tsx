import { useEffect, useRef, useState, type ReactNode } from "react";
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
  House,
  Bookmark,
  MessageCircle,
  History,
  UserRound,
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
import {
  getSavedPrivateLessonLanguage,
  listPrivateLessons,
  PRIVATE_LESSON_LANGUAGE_CHANGED_EVENT,
  type SavedPrivateLesson,
} from "../lib/privateLesson";
import { getBilingualLanguageOptions } from "../lib/languages";

function sameBaseLanguage(first: string, second: string) {
  try {
    return (
      new Intl.Locale(first).language.toLowerCase() ===
      new Intl.Locale(second).language.toLowerCase()
    );
  } catch {
    return (
      first.toLowerCase().split("-")[0] === second.toLowerCase().split("-")[0]
    );
  }
}

const navItems = [
  { to: "/dashboard", labelKey: "ux.today", icon: House },
  { to: "/courses", labelKey: "ux.programs", icon: BookOpen, liveOnly: true },
  { to: "/vocabulary", labelKey: "ux.words", icon: Bookmark },
  { to: "/learn", labelKey: "ux.practice", icon: Gamepad2 },
  {
    to: "/private-lesson?practice=free",
    labelKey: "ux.freeChat",
    icon: MessageCircle,
    liveOnly: true,
  },
  { to: "/reading", labelKey: "ux.reading", icon: BookOpenText },
  { to: "/history", labelKey: "ux.history", icon: History, liveOnly: true },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

const rootNavItems = navItems.slice(0, 4);

export function AppShell({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { profile, stats, items, mode, user, profileError, retryProfile } =
    useApp();
  const location = useLocation();
  const focusedLearning =
    /^\/(courses\/[^/]+|homework\/[^/]+)(\/|$)/.test(location.pathname) ||
    location.pathname === "/private-lesson";
  const focusShell = location.pathname === "/private-lesson";
  const navigate = useNavigate();
  const { hasEntitlement, status } = useSubscription();
  const canWriteVocabulary = hasEntitlement("vocabulary.write");
  const defaultLessonLanguage =
    profile.languages[0]?.languageCode || profile.defaultSourceLanguage || "en";
  const [addOpen, setAddOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia?.("(max-width: 860px)").matches ?? false,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
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
    if (!userOpen) return;
    accountRef.current
      ?.querySelector<HTMLAnchorElement>(".user-popover a")
      ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node))
        setUserOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserOpen(false);
        accountRef.current
          ?.querySelector<HTMLButtonElement>(".user-button")
          ?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [userOpen]);
  const [latestLessonAssessment, setLatestLessonAssessment] =
    useState<SavedPrivateLesson>();
  const [assessmentLanguage, setAssessmentLanguage] = useState(() =>
    getSavedPrivateLessonLanguage(defaultLessonLanguage),
  );
  useEffect(() => {
    const openSidebar = () => setMobileOpen(true);
    window.addEventListener("gotit:open-sidebar", openSidebar);
    return () => window.removeEventListener("gotit:open-sidebar", openSidebar);
  }, []);
  useEffect(() => {
    if (mode !== "live") {
      setLatestLessonAssessment(undefined);
      return;
    }
    let active = true;
    const loadAssessment = () => {
      const selectedLanguage = getSavedPrivateLessonLanguage(
        defaultLessonLanguage,
      );
      setAssessmentLanguage(selectedLanguage);
      void listPrivateLessons(50)
        .then((lessons) => {
          if (!active) return;
          setLatestLessonAssessment(
            lessons.find(
              (lesson) =>
                lesson.status === "completed" &&
                lesson.report?.assessment &&
                sameBaseLanguage(lesson.targetLanguageCode, selectedLanguage),
            ),
          );
        })
        .catch(() => {
          // The assessment stays hidden when this account cannot access private lessons.
        });
    };
    loadAssessment();
    window.addEventListener("gotit:lesson-assessment-updated", loadAssessment);
    window.addEventListener(
      PRIVATE_LESSON_LANGUAGE_CHANGED_EVENT,
      loadAssessment,
    );
    return () => {
      active = false;
      window.removeEventListener(
        "gotit:lesson-assessment-updated",
        loadAssessment,
      );
      window.removeEventListener(
        PRIVATE_LESSON_LANGUAGE_CHANGED_EVENT,
        loadAssessment,
      );
    };
  }, [defaultLessonLanguage, mode]);
  const pageTitle = focusedLearning
    ? "nav.privateLesson"
    : navItems.find((item) =>
        location.pathname.startsWith(item.to.split("?")[0]),
      )?.labelKey;
  const latestAssessment = latestLessonAssessment?.report?.assessment;
  const latestLevelLabel = latestAssessment?.overallLevel
    ? latestAssessment.overallLevel
    : latestAssessment?.levelRange
      ? latestAssessment.levelRange.from === latestAssessment.levelRange.to
        ? latestAssessment.levelRange.from
        : `${latestAssessment.levelRange.from}–${latestAssessment.levelRange.to}`
      : t("privateLesson.assessment.collecting");
  const assessmentLanguageLabel =
    getBilingualLanguageOptions().find(([code]) =>
      sameBaseLanguage(code, assessmentLanguage),
    )?.[1] ?? assessmentLanguage;

  return (
    <div className={`app-layout${focusShell ? " focus-shell" : ""}`}>
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
            setUserOpen((value) => !value);
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
      <main className="main-column">
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
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>{pageTitle ? t(pageTitle) : "GotIt"}</span>
          </div>
          <div className="topbar-actions">
            {focusShell && (
              <Link className="button ghost focus-back" to="/dashboard">
                {t("ux.backHome")}
              </Link>
            )}
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
            <div className="user-menu-wrap" ref={accountRef}>
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
                    {user?.role === "admin"
                      ? "Admin"
                      : mode === "demo"
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
                  {status && (
                    <p className="account-plan">
                      {t(
                        status.tier === "paid"
                          ? "subscription.proUser"
                          : status.tier === "trial"
                            ? "subscription.trialDays"
                            : "subscription.trialEnded",
                        { count: status.trial?.daysRemaining ?? 0 },
                      )}
                    </p>
                  )}
                  <Link to="/settings" onClick={() => setUserOpen(false)}>
                    <Settings size={18} />
                    {t("nav.settings")}
                  </Link>
                  <Link to="/history" onClick={() => setUserOpen(false)}>
                    <History size={18} />
                    {t("ux.history")}
                  </Link>
                  <Link to="/billing" onClick={() => setUserOpen(false)}>
                    <CreditCard size={18} />
                    {t("nav.billing")}
                  </Link>
                  <Link to="/transfer" onClick={() => setUserOpen(false)}>
                    <BookOpen size={18} />
                    {t("nav.transfer")}
                  </Link>
                  <Link to="/word-packs" onClick={() => setUserOpen(false)}>
                    <LibraryBig size={18} />
                    {t("nav.wordPacks")}
                  </Link>
                  <Link to="/help" onClick={() => setUserOpen(false)}>
                    <HelpCircle size={18} />
                    {t("shell.helpCenter")}
                  </Link>
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
          {mode === "live" &&
            user?.role !== "admin" &&
            /^\/(?:billing|settings|transfer)(?:\/|$)/u.test(
              location.pathname,
            ) && <SubscriptionBanner />}
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
      <nav className="mobile-tabs" aria-label={t("ux.rootNavigation")}>
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
  );
}
