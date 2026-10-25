import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { getBilingualLanguageOptions } from "./languages";
import {
  getSavedPrivateLessonLanguage,
  listPrivateLessons,
  PRIVATE_LESSON_LANGUAGE_CHANGED_EVENT,
  type SavedPrivateLesson,
} from "./privateLesson";

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

export function useTopbarAssessment() {
  const { t } = useTranslation();
  const { profile, mode } = useApp();
  const defaultLessonLanguage =
    profile.languages[0]?.languageCode || profile.defaultSourceLanguage || "en";
  const [latestLessonAssessment, setLatestLessonAssessment] =
    useState<SavedPrivateLesson>();
  const [assessmentLanguage, setAssessmentLanguage] = useState(() =>
    getSavedPrivateLessonLanguage(defaultLessonLanguage),
  );
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

  return { latestLessonAssessment, latestLevelLabel, assessmentLanguageLabel };
}
