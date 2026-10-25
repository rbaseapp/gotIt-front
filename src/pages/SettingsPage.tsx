import { lazy, Suspense } from "react";
import { settingsDesignEnabled } from "../lib/settingsDesign";
import { LegacySettingsPage } from "./LegacySettingsPage";
import { useTranslation } from "react-i18next";
const DevSettingsPage = lazy(() =>
  import("./DevSettingsPage").then((m) => ({ default: m.DevSettingsPage })),
);
export function SettingsPage() {
  const { t } = useTranslation();
  return settingsDesignEnabled() ? (
    <Suspense fallback={<p role="status">{t("common.loading")}</p>}>
      <DevSettingsPage />
    </Suspense>
  ) : (
    <LegacySettingsPage />
  );
}
