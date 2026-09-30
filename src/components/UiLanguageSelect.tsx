import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeUiLocale, setUiLocale, type UiLocale } from "../i18n";
import { LanguageCombobox } from "./LanguageCombobox";
import { getBilingualLanguageOptions } from "../lib/languages";

export function UiLanguageSelect({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = normalizeUiLocale(i18n.resolvedLanguage) ?? "en";

  return (
    <label className={`ui-language-select ${compact ? "compact" : ""}`}>
      <Languages size={17} aria-hidden="true" />
      {!compact && <span>{t("language.label")}</span>}
      <LanguageCombobox
        ariaLabel={t("language.label")}
        value={locale}
        onChange={(code) => void setUiLocale(code as UiLocale)}
        options={getBilingualLanguageOptions().filter(([code]) =>
          ["en", "he", "ar", "ru", "de", "fr", "es"].includes(code),
        ).concat([["zh", "Chinese — 中文"]])}
      />
    </label>
  );
}
