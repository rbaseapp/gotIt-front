import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Clock, Compass, Target } from "lucide-react";
import { lessonTopic, type SavedPrivateLesson } from "../lib/privateLesson";
import { LessonHomeworkCard } from "../pages/HomeworkPage";
import moochi from "../assets/ux/dashboard-moohi.png";
import "./LessonSummary.css";

const MAX_WINS = 3;

/**
 * The page after a lesson. It reads top to bottom as: you did it (hero), what went well,
 * the one thing to work on, what to do next, and the full report folded away for later.
 */
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
  const wins = [
    ...new Set([
      ...report.strengths,
      ...evidence.filter((e) => e.independent).map((e) => e.observation),
    ]),
  ].slice(0, MAX_WINS);
  const correction = report.corrections[0];
  const assisted = evidence.find((entry) => !entry.independent)?.observation;
  const minutes = Math.ceil(
    (lesson.actualDurationSeconds ?? lesson.plannedDurationSeconds) / 60,
  );
  const hasReview = report.recommendedReviewItemIds.length > 0;
  const reviewLink = `/learn/smart?${new URLSearchParams({
    items: report.recommendedReviewItemIds.join(","),
    language: lesson.targetLanguageCode,
    return: returnTo,
  })}`;

  return (
    <section className="lesson-summary-workspace ls-workspace">
      <div className="ls-page">
        <header className="ls-hero">
          <div className="ls-hero-text">
            <p className="ls-eyebrow">{t("lessonSummary.eyebrow")}</p>
            <h1>{t("lessonSummary.title")}</h1>
            <p className="ls-topic" dir="auto">
              {lessonTopic(lesson, t)}
            </p>
            <ul className="ls-chips">
              <li>
                <Clock size={16} aria-hidden="true" />
                {t("lessonSummary.minutes", { count: minutes })}
              </li>
              <li>{lesson.level}</li>
              <li className="ls-chip-done">
                <Check size={16} aria-hidden="true" />
                {t("privateLesson.history.status.completed")}
              </li>
            </ul>
          </div>
          <img className="ls-mascot" src={moochi} alt="" draggable={false} />
        </header>

        <div className="ls-pair">
          <section className="ls-card ls-wins" aria-labelledby="ls-wins-title">
            <h2 id="ls-wins-title">
              <span className="ls-icon" aria-hidden="true">
                <Check size={20} />
              </span>
              {t("lessonSummary.wentWell")}
            </h2>
            {wins.length ? (
              <ul className="ls-list">
                {wins.map((win) => (
                  <li key={win} dir="auto">
                    {win}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ls-quiet">{t("privateLesson.report.noEvidence")}</p>
            )}
          </section>

          <section
            className="ls-card ls-focus"
            aria-labelledby="ls-focus-title"
          >
            <h2 id="ls-focus-title">
              <span className="ls-icon" aria-hidden="true">
                <Target size={20} />
              </span>
              {t("lessonSummary.oneFocus")}
            </h2>
            {correction ? (
              <>
                <div
                  className="ls-fix"
                  dir="auto"
                  lang={lesson.targetLanguageCode}
                >
                  <p className="ls-fix-before">
                    <small>{t("lessonSummary.youSaid")}</small>
                    <del>{correction.original}</del>
                  </p>
                  <p className="ls-fix-after">
                    <small>{t("lessonSummary.tryInstead")}</small>
                    <strong>{correction.corrected}</strong>
                  </p>
                </div>
                <p dir="auto">{correction.explanation}</p>
              </>
            ) : assisted ? (
              <p dir="auto">{assisted}</p>
            ) : (
              <p className="ls-quiet">{t("lessonSummary.noFocus")}</p>
            )}
          </section>
        </div>

        <section className="ls-card ls-next" aria-labelledby="ls-next-title">
          <h2 id="ls-next-title">
            <span className="ls-icon" aria-hidden="true">
              <Compass size={20} />
            </span>
            {t("lessonSummary.next")}
          </h2>
          {report.nextLessonPlan && <p dir="auto">{report.nextLessonPlan}</p>}
          {lesson.curriculum ? (
            <Link className="ls-button primary" to={returnTo}>
              {t("pathUi.continueUnit")}
              <ArrowRight
                className="directional-arrow"
                size={18}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <LessonHomeworkCard lessonId={lesson.id} />
          )}
          {hasReview && (
            <Link className="ls-button primary" to={reviewLink}>
              {t("dashboard.smartPractice")}
              <ArrowRight
                className="directional-arrow"
                size={18}
                aria-hidden="true"
              />
            </Link>
          )}
        </section>

        <details className="ls-details">
          <summary>{t("courses.reportDetails")}</summary>
          <div className="ls-details-body">{children}</div>
        </details>

        <Link
          className={`ls-button ${hasReview || lesson.curriculum ? "ghost" : "primary"}`}
          to={returnTo}
        >
          {t("courses.backToCourse")}
        </Link>
      </div>
    </section>
  );
}
