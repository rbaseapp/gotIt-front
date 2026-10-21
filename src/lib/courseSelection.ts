import type { Course } from "./courses";

export function courseLessonFromLocation(
  course: Course | null,
  params: URLSearchParams,
) {
  const explicit = ["unit", "lesson", "version"].some((key) => params.has(key));
  if (!explicit)
    return { lesson: course?.nextLesson ?? null, selection: undefined };
  const version = Number(params.get("version"));
  const lessonIndex = Number(params.get("lesson"));
  const unitKey = params.get("unit");
  const active = course?.versions.find(
    (item) => item.version === course.activeVersion,
  );
  const unit = active?.plan.units.find((item) => item.key === unitKey);
  const lesson = unit?.lessons[lessonIndex];
  if (
    !params.has("lesson") ||
    !params.get("version") ||
    !Number.isInteger(lessonIndex) ||
    lessonIndex < 0 ||
    !lesson ||
    active?.version !== version ||
    !unitKey
  )
    return { lesson: null, selection: undefined };
  return {
    lesson: {
      unitKey,
      unitTitle: unit!.title,
      lessonIndex,
      title: lesson.title,
      objective: lesson.objective,
    },
    selection: { version, unitKey, lessonIndex },
  };
}
