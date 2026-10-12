import { useCallback } from "react";
import { useApp } from "../context/AppContext";
import { dashboardSchema, product, query } from "../lib/product";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { useResource } from "../lib/useResource";
import { LearningStatusSource } from "./LearningStatusSource";

/** Supplies header data on shell routes without their own dashboard controller. */
export function DefaultLearningStatusBar() {
  const { profile } = useApp();
  const language = useLearningLanguage();
  const code = language.code;
  const dashboard = useResource(
    useCallback(
      async () => ({
        ...(await product(
          dashboardSchema,
          `dashboard${query({ sourceLanguageCode: code || undefined })}`,
        )),
        language: code,
      }),
      [code],
    ),
  );
  const data = dashboard.data?.language === code ? dashboard.data : undefined;
  return (
    <LearningStatusSource
      goal={data?.dailyGoal}
      streakDays={data?.gamification.currentStreakDays}
      language={{
        value: code,
        options: [code, ...language.languages.map((entry) => entry.code)],
        translationCode: profile.defaultTranslationLanguage || "he",
        disabled: language.loading || !!language.error,
        onChange: language.setCode,
      }}
    />
  );
}
