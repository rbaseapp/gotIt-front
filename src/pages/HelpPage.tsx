import {
  BookOpen,
  Gamepad2,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supportEmailHref, supportWhatsappHref } from "../lib/supportContact";

export function HelpPage() {
  const { t } = useTranslation();
  const emailHref = supportEmailHref(t("help.emailSubject"));
  const whatsappHref = supportWhatsappHref(t("help.whatsappMessage"));
  return (
    <div className="help-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("help.eyebrow")}</p>
          <h1>{t("help.title")}</h1>
          <p>{t("help.description")}</p>
        </div>
      </section>
      <div className="help-grid">
        <section className="panel">
          <BookOpen size={26} />
          <h2>{t("help.meaningTitle")}</h2>
          <p>{t("help.meaningBody")}</p>
          <Link className="text-link" to="/vocabulary">
            {t("help.toVocabulary")}
          </Link>
        </section>
        <section className="panel">
          <Gamepad2 size={26} />
          <h2>{t("help.practiceTitle")}</h2>
          <p>{t("help.practiceBody")}</p>
          <Link className="text-link" to="/learn">
            {t("help.chooseGame")}
          </Link>
        </section>
        <section className="panel">
          <LockKeyhole size={26} />
          <h2>{t("help.accountTitle")}</h2>
          <p>{t("help.accountBody")}</p>
        </section>
        <section className="panel">
          <ShieldCheck size={26} />
          <h2>{t("help.privacyTitle")}</h2>
          <p>{t("help.privacyBody")}</p>
          <p>{t("help.tokenBody")}</p>
        </section>
      </div>
      <section className="panel help-contact">
        <h2>{t("help.contactTitle")}</h2>
        <p>{t("help.contactBody")}</p>
        <div className="help-contact-actions">
          <a className="button secondary" href={emailHref}>
            <Mail size={18} aria-hidden="true" />
            {t("help.contactEmail")}
          </a>
          <a
            className="button primary"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" />
            {t("help.contactWhatsapp")}
          </a>
        </div>
        <p className="help-contact-note">{t("help.contactPrivacy")}</p>
      </section>
      <section className="panel help-status">
        <h2>{t("help.availabilityTitle")}</h2>
        <dl>
          <div>
            <dt>{t("help.authTerm")}</dt>
            <dd>{t("help.authDescription")}</dd>
          </div>
          <div>
            <dt>{t("help.libraryTerm")}</dt>
            <dd>{t("help.libraryDescription")}</dd>
          </div>
          <div>
            <dt>{t("help.mediaTerm")}</dt>
            <dd>{t("help.mediaDescription")}</dd>
          </div>
          <div>
            <dt>{t("help.transferTerm")}</dt>
            <dd>{t("help.transferDescription")}</dd>
          </div>
          <div>
            <dt>{t("help.passwordTerm")}</dt>
            <dd>{t("help.passwordDescription")}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
