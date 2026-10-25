import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
export function SettingsSave({
  dirty,
  busy,
  error,
  saved,
  onCancel,
}: {
  dirty: boolean;
  busy: boolean;
  error: string;
  saved: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {saved && <p role="status">{t("settings.changesSaved")}</p>}
      {dirty && (
        <div className="sd-savebar">
          <span>{t("settingsLive.unsaved")}</span>
          <button type="button" disabled={busy} onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button disabled={busy}>
            {t(busy ? "settings.saving" : "settings.saveChanges")}
          </button>
        </div>
      )}
    </>
  );
}
export function SettingsChoice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="sd-choice-field">
      <h2>{label}</h2>
      <div className="sd-segment" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
