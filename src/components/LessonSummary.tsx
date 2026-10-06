import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SavedPrivateLesson } from "../lib/privateLesson";
import { LessonHomeworkCard } from "../pages/HomeworkPage";
import { Logo } from "./Logo";

export function LessonSummary({
  lesson,
  returnTo,
  children,
}: {
  lesson: SavedPrivateLesson;
  returnTo: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const report = lesson.report;
  if (!report) return null;
  const evidence = [
    ...new Map(
      Object.values(report.assessment.skills)
        .flatMap((skill) => skill.evidence ?? [])
        .map((entry) => [
          `${entry.learnerQuote}:${entry.observation}:${entry.independent}`,
          entry,
        ]),
    ).values(),
  ];
  const independent = evidence.filter((entry) => entry.independent);
  const assisted = evidence.filter((entry) => !entry.independent);
  return (
    <section className="lesson-summary-workspace">
      <header>
        <Logo />
        <Link className="button ghost" to={returnTo}>
          {t("common.back")}
        </Link>
      </header>
      <div
        className="canonical-page lesson-summary"
        data-figma-desktop="43:6641"
        data-figma-mobile="44:8688"
      >
        <header>
          <h1>{t("lessonSummary.title")}</h1>
          <p>
            {t("privateLesson.durationMinutes", {
              count: Math.ceil(
                (lesson.actualDurationSeconds ??
                  lesson.plannedDurationSeconds) / 60,
              ),
            })}{" "}
            · {t("privateLesson.history.status.completed")}
          </p>
        </header>
        <section className="ux-card mint">
          <h2>{t("lessonSummary.independent")}</h2>
          {independent.length ? (
            independent.slice(0, 2).map((entry, index) => (
              <p dir="auto" key={index}>
                {entry.observation}
              </p>
            ))
          ) : (
            <p>{t("privateLesson.report.noEvidence")}</p>
          )}
        </section>
        <section className="ux-card">
          <h2>{t("lessonSummary.assisted")}</h2>
          {assisted.length ? (
            assisted.slice(0, 2).map((entry, index) => (
              <p dir="auto" key={index}>
                {entry.observation}
              </p>
            ))
          ) : (
            <p dir="auto">
              {report.corrections[0]?.explanation ?? report.nextLessonPlan}
            </p>
          )}
          <details>
            <summary>{t("courses.reportDetails")}</summary>
            {children}
          </details>
        </section>
        <LessonHomeworkCard lessonId={lesson.id} />
        {report.recommendedReviewItemIds.length > 0 && (
          <Link
            className="button primary"
            to={`/learn/smart?${new URLSearchParams({ items: report.recommendedReviewItemIds.join(","), language: lesson.targetLanguageCode, return: returnTo })}`}
          >
            {t("dashboard.smartPractice")}
          </Link>
        )}
        <Link className="button secondary" to={returnTo}>
          {t("courses.backToCourse")}
        </Link>
      </div>
    </section>
  );
}
