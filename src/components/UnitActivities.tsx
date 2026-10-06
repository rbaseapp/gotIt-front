import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Mic2, ChevronLeft } from "lucide-react";
import type { Session } from "../lib/product";
import type { SavedPrivateLesson } from "../lib/privateLesson";

export function UnitActivities({
  lessons,
  sessions,
  practiceUrl,
  unitId,
  language,
  returnUrl = "/history",
}: {
  lessons: SavedPrivateLesson[];
  sessions: Session[];
  practiceUrl: string;
  unitId?: string;
  language?: string;
  returnUrl?: string;
}) {
  const { t, i18n } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>();
  const activities = [
    ...lessons.map((lesson) => ({
      id: lesson.id,
      date: lesson.startedAt,
      lesson,
      session: undefined,
    })),
    ...sessions.map((session) => ({
      id: session.id,
      date: session.startedAt,
      session,
      lesson: undefined,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const selected = activities.find((a) => a.id === selectedId) ?? activities[0];
  const title = (a: (typeof activities)[number]) =>
    a.lesson?.topic ??
    t(`labels.${a.session!.sessionType}`, {
      defaultValue: a.session!.sessionType,
    });
  const date = (value: string) =>
    new Date(value).toLocaleDateString(i18n.resolvedLanguage, {
      year: "numeric",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  return (
    <div
      className="unit-browser unit-activity-browser"
      data-figma-desktop="43:2900"
    >
      <section
        className="unit-activity-list ux-card"
        aria-label={t("structuredUi.activities")}
      >
        {!activities.length && <p>{t("structuredUi.noActivities")}</p>}
        {activities.map((activity, index) => (
          <div key={activity.id}>
            {(index === 0 ||
              date(activities[index - 1].date) !== date(activity.date)) && (
              <h3>{date(activity.date)}</h3>
            )}
            <button
              className={`unit-activity-row${selected?.id === activity.id ? " selected" : ""}`}
              onClick={() => setSelectedId(activity.id)}
              aria-pressed={selected?.id === activity.id}
            >
              <ChevronLeft size={20} />
              <span>
                <strong dir="auto">{title(activity)}</strong>
                <small>
                  {activity.lesson
                    ? t("pathUi.teacherMinutes", {
                        count: Math.ceil(
                          (activity.lesson.actualDurationSeconds ??
                            activity.lesson.plannedDurationSeconds) / 60,
                        ),
                      })
                    : t("structuredUi.practiceResult", {
                        correct: activity.session!.correctCount,
                        total: activity.session!.attemptCount,
                      })}
                </small>
                <small>
                  {activity.lesson
                    ? t(
                        `privateLesson.history.status.${activity.lesson.status}`,
                      )
                    : t(
                        activity.session!.status === "completed"
                          ? "learn.statusCompleted"
                          : activity.session!.status === "active"
                            ? "learn.statusActive"
                            : "learn.statusStopped",
                      )}
                </small>
              </span>
              <span
                className={`ux-icon ${activity.lesson ? "lavender" : "mint"}`}
              >
                {activity.lesson ? <Mic2 size={26} /> : <BookOpen size={26} />}
              </span>
            </button>
          </div>
        ))}
      </section>
      <aside
        className="unit-activity-detail ux-card"
        aria-label={t("ux.activityDetails")}
      >
        {selected ? (
          <>
            <p>{t("pathUi.selectedActivity")}</p>
            <h2 dir="auto">{title(selected)}</h2>
            <p>{date(selected.date)}</p>
            <hr />
            <h3>{t("pathUi.whatPracticed")}</h3>
            <p dir="auto">
              {selected.lesson?.report?.summary ??
                (selected.lesson
                  ? t("privateLesson.historyPending")
                  : t("learn.attemptsXp", {
                      count: selected.session!.attemptCount,
                      xp: selected.session!.xpEarned,
                    }))}
            </p>
            {selected.lesson?.report?.corrections[0] && (
              <blockquote className="unit-sentence" dir="auto">
                {selected.lesson.report.corrections[0].corrected}
              </blockquote>
            )}
            {selected.lesson?.report?.nextLessonPlan && (
              <>
                <hr />
                <h3>{t("pathUi.nextTime")}</h3>
                <p dir="auto">{selected.lesson.report.nextLessonPlan}</p>
              </>
            )}
            <Link
              className="button primary"
              to={
                selected.session?.status === "active"
                  ? `/learn/session/${selected.session.sessionType === "smart_review" ? "smart" : selected.session.sessionType === "listening_spelling" ? "listening" : selected.session.sessionType}?resume=${selected.id}${unitId ? `&pack=${unitId}` : ""}${language ? `&language=${encodeURIComponent(language)}` : ""}&return=${encodeURIComponent(unitId ? `/english-learning?unit=${unitId}&tab=activities` : returnUrl)}`
                  : practiceUrl
              }
            >
              {t(
                selected.session?.status === "active"
                  ? "learn.continue"
                  : "pathUi.practiceAgain",
              )}
            </Link>
            {selected.lesson && (
              <Link
                className="button ghost"
                to={`/private-lesson?view=history&lesson=${selected.id}${selected.lesson.course?.courseId ? `&course=${selected.lesson.course.courseId}` : ""}${unitId ? `&pack=${unitId}` : ""}`}
              >
                {t("structuredUi.lessonSummary")}
              </Link>
            )}
          </>
        ) : (
          <>
            <h2>{t("structuredUi.noActivities")}</h2>
            <p>{t("pathUi.activitiesEmptyHelp")}</p>
            <Link className="button primary" to={practiceUrl}>
              {t("englishPath.practice")}
            </Link>
          </>
        )}
      </aside>
    </div>
  );
}
