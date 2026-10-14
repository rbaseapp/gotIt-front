import { useEffect, useRef } from "react";
import {
  Bell,
  Bot,
  Chrome,
  CreditCard,
  Globe2,
  LockKeyhole,
  MessageSquare,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { InterfacePreferences } from "../components/InterfacePreferences";
import { SettingsProfile } from "../components/settings/SettingsProfile";
import { LegacySettingsPage } from "./LegacySettingsPage";
import { settingsSection, type SettingsSection } from "../lib/settingsDesign";
import logo from "../assets/settings/logo-on-dark.svg";
import mohi from "../assets/program-chooser/mohi.png";
import "./DevSettingsPage.css";

const sections: { id: SettingsSection; icon: LucideIcon }[] = [
  { id: "profile", icon: UserRound },
  { id: "languages", icon: Globe2 },
  { id: "private-lessons", icon: Bot },
  { id: "learning", icon: Target },
  { id: "interface", icon: MessageSquare },
  { id: "extension", icon: Chrome },
  { id: "notifications", icon: Bell },
  { id: "security", icon: LockKeyhole },
  { id: "subscription", icon: CreditCard },
];

export function DevSettingsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const section = settingsSection(location.hash);
  const Icon = sections.find((item) => item.id === section)!.icon;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (location.hash) heading.current?.focus({ preventScroll: true });
  }, [location.hash]);
  return (
    <div className="sd-page">
      <aside className="sd-sidebar" aria-label={t("settings.title")}>
        <Link to="/dashboard" className="sd-brand">
          <img src={logo} alt="GotIt" />
        </Link>
        <nav aria-label={t("settingsDesign.navigation")}>
          {sections.map(({ id, icon: ItemIcon }) => (
            <Link
              key={id}
              to={`/settings#${id}`}
              aria-current={section === id ? "page" : undefined}
            >
              <ItemIcon aria-hidden="true" size={23} />
              <span>{t(`settingsDesign.sections.${id}`)}</span>
            </Link>
          ))}
        </nav>
        <div className="sd-help">
          <img src={mohi} alt="" loading="lazy" />
          <h2>{t("settingsDesign.helpTitle")}</h2>
          <p>{t("settingsDesign.helpBody")}</p>
          <Link to="/help">{t("settingsDesign.helpAction")}</Link>
        </div>
      </aside>
      <div className="sd-main">
        <header className="sd-heading">
          <span>
            <Icon aria-hidden="true" size={34} />
          </span>
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {t(`settingsDesign.sections.${section}`)}
            </h1>
            <p>{t(`settingsDesign.descriptions.${section}`)}</p>
          </div>
        </header>
        <div className="sd-panel" key={section}>
          {section === "profile" && <SettingsProfile />}
          {[
            "languages",
            "private-lessons",
            "learning",
            "notifications",
          ].includes(section) && (
            <LegacySettingsPage
              section={
                section as
                  "languages" | "private-lessons" | "learning" | "notifications"
              }
            />
          )}
          {section === "interface" && (
            <InterfacePreferences
              onReminders={() => {
                window.location.hash = "notifications";
              }}
            />
          )}
          {section === "extension" && (
            <section className="sd-card sd-info">
              <h2>{t("settingsDesign.extensionTitle")}</h2>
              <p>{t("settingsDesign.extensionBody")}</p>
              <Link className="sd-outline" to="/help">
                {t("settingsDesign.extensionAction")}
              </Link>
              <Link className="sd-outline" to="/transfer">
                {t("nav.transfer")}
              </Link>
            </section>
          )}
          {section === "security" && (
            <section className="sd-card sd-info">
              <h2>{t("settingsDesign.securityTitle")}</h2>
              <p>{t("settingsDesign.securityBody")}</p>
              <Link className="sd-outline" to="/privacy-policy">
                {t("auth.privacy")}
              </Link>
              <Link className="sd-outline" to="/help">
                {t("help.contactTitle")}
              </Link>
            </section>
          )}
          {section === "subscription" && (
            <section className="sd-card sd-info">
              <h2>{t("settingsDesign.subscriptionTitle")}</h2>
              <p>{t("settingsDesign.subscriptionBody")}</p>
              <Link className="sd-outline" to="/billing">
                {t("settingsDesign.subscriptionAction")}
              </Link>
              <Link className="sd-outline" to="/billing/minutes">
                {t("accountUi.minutesPlan")}
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
