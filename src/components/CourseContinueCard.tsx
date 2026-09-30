import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { courseApi, type Course, type HomeworkSummary } from "../lib/courses";
import "../courses.css";

export function CourseContinueCard() {
  const { t } = useTranslation();
  const [data, setData] = useState<{
    course: Course | null;
    homework: HomeworkSummary | null;
  } | null>(null);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const result = await courseApi.list();
        if (live)
          setData({
            course:
              result.courses.find((course) => course.activeVersion !== null) ??
              result.courses[0] ??
              null,
            homework:
              result.homework.find((item) => item.status !== "completed") ??
              null,
          });
      } catch {
        /* The main page remains available when courses cannot be loaded. */
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, []);
  if (!data) return null;
  const assignment = data.homework;
  return (
    <section
      className="course-homework-links"
      aria-label={t("courses.yourCourse")}
    >
      <Link
        to={
          assignment
            ? `/homework/${assignment.id}`
            : data.course
              ? `/courses/${data.course.id}`
              : "/courses"
        }
      >
        <span className="course-homework-icon">
          <BookOpen size={20} />
        </span>
        <span>
          <small>
            {t(assignment ? "courses.homework" : "courses.yourCourse")}
          </small>
          <strong dir="auto">
            {assignment?.title ??
              data.course?.nextLesson?.title ??
              t("courses.welcomeTitle")}
          </strong>
        </span>
        <span className="course-homework-action">
          {t(
            assignment
              ? "courses.resumeHomework"
              : data.course
                ? "courses.continueCourse"
                : "courses.buildWithTeacher",
          )}
          <ArrowRight size={17} className="directional-arrow" />
        </span>
      </Link>
    </section>
  );
}
