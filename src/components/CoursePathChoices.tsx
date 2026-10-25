import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { lessonLink, type Course } from "../lib/courses";
import { LearningPathControls, PathStepChoice } from "./LearningPathControls";

export type CoursePathChoiceInput = {
  version: number;
  unitKey: string;
  lessonIndex?: number;
  skipped: boolean;
};
/** Actions attach to the existing syllabus unit/lesson, without another selector or list. */
export function CoursePathChoices({
  course,
  unitKey,
  lessonIndex,
  busy,
  onChoice,
}: {
  course: Course;
  unitKey: string;
  lessonIndex?: number;
  busy: boolean;
  onChoice: (input: CoursePathChoiceInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const version = course.versions.find(
    (item) => item.version === course.activeVersion,
  );
  const unit = version?.plan.units.find((item) => item.key === unitKey);
  if (!unit || !version) return null;
  const items = unit.lessons.map((lesson, index) => ({
    key: String(index),
    title: lesson.title,
    complete: course.evidence.some(
      (e) =>
        e.version === version.version &&
        e.unitKey === unit.key &&
        e.lessonIndex === index &&
        e.independent,
    ),
    skipped: Boolean(
      course.skippedLessons?.some(
        (e) => e.unitKey === unit.key && e.lessonIndex === index,
      ),
    ),
  }));
  const choose = (skipped: boolean, key?: string) =>
    onChoice({
      version: version.version,
      unitKey,
      ...(key === undefined ? {} : { lessonIndex: Number(key) }),
      skipped,
    });
  if (lessonIndex === undefined)
    return (
      <LearningPathControls
        title={unit.title}
        items={items}
        busy={busy}
        onChoice={choose}
      />
    );
  const item = items[lessonIndex];
  if (!item) return null;
  return (
    <div className="course-path-actions">
      <Link
        className="button ghost"
        to={lessonLink(course, {
          version: version.version,
          unitKey,
          lessonIndex,
        })}
      >
        {t(item.complete ? "unitMap.repeat" : "pathChoices.startHere")}
      </Link>
      <PathStepChoice item={item} busy={busy} onChoice={choose} />
    </div>
  );
}
