import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listPrivateLessons,
  type SavedPrivateLesson,
} from "../lib/privateLesson";

function brief(text: string) {
  const normalized = text.trim().replace(/\s+/gu, " ");
  if (normalized.length <= 240) return normalized;
  const boundary = normalized.lastIndexOf(" ", 240);
  return `${normalized.slice(0, boundary > 160 ? boundary : 240).trimEnd()}…`;
}

export function LastLessonCard() {
  const { t, i18n } = useTranslation();
  const [lesson, setLesson] = useState<SavedPrivateLesson | null>(null);

  useEffect(() => {
    let active = true;
    void listPrivateLessons(50)
      .then((lessons) => {
        if (active)
          setLesson(
            lessons.find(
              (item) => item.status === "completed" && item.report,
            ) ?? null,
          );
      })
      .catch(() => {
        // The rest of the dashboard remains available if lesson history cannot load.
      });
    return () => {
      active = false;
    };
  }, []);

  const report = lesson?.report;
  if (!lesson || !report) return null;

  const reportLanguage =
    lesson.supportLanguageCode ?? lesson.targetLanguageCode;
  const reviewIds = report.recommendedReviewItemIds;
  return (
    <section
      className="live-panel dashboard-last-lesson"
      aria-label={t("dashboard.lastLessonTitle")}
    >
      <div className="dashboard-last-lesson-heading">
        <span className="dashboard-path-icon" aria-hidden="true">
          <BookOpen size={22} />
        </span>
        <div>
          <p className="eyebrow">{t("dashboard.lastLessonTitle")}</p>
          <h2 dir="auto">{lesson.topic}</h2>
          {lesson.endedAt && (
            <time dateTime={lesson.endedAt}>
              {new Date(lesson.endedAt).toLocaleDateString(
                i18n.resolvedLanguage,
              )}
            </time>
          )}
        </div>
      </div>
      <p dir="auto" lang={reportLanguage}>
        {brief(report.summary)}
      </p>
      {report.corrections[0] && (
        <div className="dashboard-last-lesson-point">
          <strong>{t("dashboard.lastLessonLearned")}</strong>
          <p dir="auto" lang={reportLanguage}>
            {brief(report.corrections[0].explanation)}
          </p>
          <small dir="auto" lang={lesson.targetLanguageCode}>
            <del>{report.corrections[0].original}</del> →{" "}
            {report.corrections[0].corrected}
          </small>
        </div>
      )}
      <p className="dashboard-last-lesson-next">
        <strong>{t("dashboard.lastLessonNext")}</strong>{" "}
        <span dir="auto" lang={reportLanguage}>
          {brief(report.nextLessonPlan)}
        </span>
      </p>
      <div className="dashboard-last-lesson-actions">
        {reviewIds.length > 0 && (
          <Link
            className="button primary"
            to={`/learn/session/smart?items=${encodeURIComponent(reviewIds.join(","))}`}
          >
            <Play size={17} /> {t("dashboard.practiceLastLesson")}
          </Link>
        )}
        <Link className="button secondary" to="/private-lesson?practice=free">
          {t("dashboard.viewLessonJournal")}
        </Link>
      </div>
    </section>
  );
}
