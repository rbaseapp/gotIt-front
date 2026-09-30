import { useTranslation } from "react-i18next";
import { getLanguageOptions } from "../lib/languages";

export function LearningLanguageSelect({
  code,
  languages,
  onChange,
}: {
  code: string;
  languages: Array<{ code: string; count: number }>;
  onChange: (code: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const names = new Map(getLanguageOptions(i18n.resolvedLanguage || "en"));
  if (languages.length < 2) return null;
  return (
    <label className="field learning-language-select">
      <span>{t("vocabulary.sourceLanguage")}</span>
      <select value={code} onChange={(event) => onChange(event.target.value)}>
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {names.get(language.code) || language.code} ({language.count})
          </option>
        ))}
      </select>
    </label>
  );
}
