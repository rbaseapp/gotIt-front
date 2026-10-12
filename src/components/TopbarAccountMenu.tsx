import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  CreditCard,
  HelpCircle,
  History,
  LibraryBig,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { levelFromXp } from "../lib/utils";

export function TopbarAccountMenu({
  showAccountLink,
  onLogout,
}: {
  showAccountLink: boolean;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { profile, stats, mode, user } = useApp();
  const { status } = useSubscription();
  const [userOpen, setUserOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
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
  return (
    <div className="user-menu-wrap" ref={accountRef}>
      <button
        className="user-button"
        aria-expanded={userOpen}
        aria-label={t("shell.accountMenu")}
        onClick={() => setUserOpen((value) => !value)}
      >
        <span className="avatar">{profile.name.charAt(0)}</span>
        {showAccountLink && (
          <span className="nd-account-label">{t("ux.account")}</span>
        )}
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
          {showAccountLink && (
            <Link to="/account" onClick={() => setUserOpen(false)}>
              <UserRound size={18} />
              {t("ux.account")}
            </Link>
          )}
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
  );
}
