import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeUiLocale, setUiLocale, type UiLocale } from "../i18n";

export function UiLanguageSelect({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = normalizeUiLocale(i18n.resolvedLanguage) ?? "en";

  return (
    <label className={`ui-language-select ${compact ? "compact" : ""}`}>
      <Languages size={17} aria-hidden="true" />
      {!compact && <span>{t("language.label")}</span>}
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => void setUiLocale(event.target.value as UiLocale)}
      >
        <option value="en">{t("language.english")}</option>
        <option value="he">{t("language.hebrew")}</option>
      </select>
    </label>
  );
}
