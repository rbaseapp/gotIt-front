import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, MessageCircle, Globe, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { RemoteState } from "../components/RemoteState";
import { Modal } from "../components/Modal";
import { useFeedback } from "../components/Feedback";
import { courseApi, type Course } from "../lib/courses";
import { useResource } from "../lib/useResource";
import { product, wordPacksSchema, errorMessage } from "../lib/product";
import { englishPathLevels, completedEnglishUnit } from "../lib/englishPath";
import { getLanguageOptions } from "../lib/languages";
import { chooseProgram, selectedProgram } from "../lib/learningNavigation";

export function ProgramsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useApp();
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [newOpen, setNewOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const courses = useResource(useCallback(() => courseApi.list(), []));
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const path = englishPathLevels(packs.data?.packs ?? []).flatMap(
    (level) => level.packs,
  );
  const next = path.find((pack) => !completedEnglishUnit(pack));
  const groups = new Map<string, Course[]>();
  for (const course of courses.data?.courses ?? []) {
    const completed = course.activeVersion !== null && !course.nextLesson;
    if (completedOpen !== completed) continue;
    const code = course.preferences.targetLanguageCode;
    groups.set(code, [...(groups.get(code) ?? []), course]);
  }
  if (
    path.length &&
    (completedOpen ? !next : Boolean(next)) &&
    !groups.has("en")
  )
    groups.set("en", []);
  const languageName = (code: string) =>
    getLanguageOptions(i18n.resolvedLanguage || "en").find(
      ([id]) => id === code,
    )?.[1] ?? code;
  const open = (destination: string, key: string, language: string) => {
    chooseProgram(key, user, language);
    navigate(destination);
  };
  const remove = async (course: Course) => {
    if (
      !(await confirm({
        title: t("courses.deleteCourseTitle"),
        message: t("courses.deleteCourseDescription"),
        confirmLabel: t("courses.deleteCourseConfirm"),
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      await courseApi.delete(course.id);
      await courses.reload();
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ux-page programs-page page-enter">
      <header className="page-heading-row">
        <div>
          <h1>{t("ux.programsTitle")}</h1>
          <p>{t("ux.programsSubtitle")}</p>
        </div>
        <button className="button secondary" onClick={() => setNewOpen(true)}>
          <Plus size={18} />
          {t("ux.newProgram")}
        </button>
      </header>
      <RemoteState
        loading={courses.loading}
        error={courses.error}
        retry={() => void courses.reload()}
      />
      <RemoteState
        loading={packs.loading}
        error={packs.error}
        retry={() => void packs.reload()}
      />
      {[...groups].map(([code, items], index) => (
        <section
          className="program-language"
          key={code}
          aria-labelledby={`program-language-${code}`}
        >
          <h2 id={`program-language-${code}`}>
            <Globe size={22} aria-hidden="true" />
            {languageName(code)}
          </h2>
          <div
            className={`program-grid${index > 0 && items.length === 1 ? " program-grid-compact" : ""}`}
          >
            {code === "en" &&
              path.length > 0 &&
              (completedOpen ? !next : Boolean(next)) && (
                <article className="program-card structured">
                  {selectedProgram(user) === "english-path" && (
                    <span className="program-selected pill">
                      {t("ux.selectedProgram")}
                    </span>
                  )}
                  <span className="ux-icon mint">
                    <BookOpen size={28} />
                  </span>
                  <div>
                    <h3>
                      {t("ux.fromZeroLanguage", {
                        language: languageName(code),
                      })}
                    </h3>
                    <p>{t("ux.structuredHelp")}</p>
                    {next && (
                      <small>
                        {t("englishPath.unitProgress", {
                          mastered:
                            next.progress.completed ?? next.progress.mastered,
                          total: next.wordCount,
                        })}
                      </small>
                    )}
                    {next && (
                      <p className="program-next-step" dir="auto">
                        {next.title}
                      </p>
                    )}
                  </div>
                  <button
                    className="button primary"
                    onClick={() =>
                      open("/english-learning", "english-path", "en")
                    }
                  >
                    {t("ux.openMap")}
                  </button>
                </article>
              )}
            {items.map((course) => {
              const plan = course.versions.find(
                (version) =>
                  version.version ===
                  (course.activeVersion ?? course.draftVersion),
              );
              const total =
                plan?.plan.units.reduce(
                  (count, unit) => count + unit.lessons.length,
                  0,
                ) ?? 0;
              return (
                <article className="program-card personal" key={course.id}>
                  {selectedProgram(user) === course.id && (
                    <span className="program-selected pill">
                      {t("ux.selectedProgram")}
                    </span>
                  )}
                  <span className="ux-icon lavender">
                    <MessageCircle size={28} />
                  </span>
                  <div>
                    <h3 dir="auto">
                      {plan?.plan.title ?? t("ux.personalProgram")}
                    </h3>
                    <p dir="auto">
                      {course.nextLesson?.title ??
                        t(
                          course.activeVersion
                            ? "courses.courseComplete"
                            : course.draftVersion
                              ? "courses.awaitingApproval"
                              : "courses.intakeInProgress",
                        )}
                    </p>
                    {course.activeVersion !== null && (
                      <small>
                        {t("courses.completedCount", {
                          count: course.progress.covered,
                          total,
                        })}
                      </small>
                    )}
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      open(
                        `/courses/${course.id}`,
                        course.id,
                        course.preferences.targetLanguageCode,
                      )
                    }
                  >
                    {t("ux.openProgram")}
                  </button>
                  <button
                    className="icon-button program-delete"
                    disabled={busy}
                    aria-label={t("courses.deleteCourse", {
                      title: plan?.plan.title ?? t("ux.personalProgram"),
                    })}
                    onClick={() => void remove(course)}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {!courses.loading &&
        !packs.loading &&
        !courses.error &&
        !packs.error &&
        !groups.size && (
          <section className="live-panel ux-empty">
            <h2>{t("ux.noPrograms")}</h2>
            <p>{t("ux.noProgramsHelp")}</p>
            <button className="button primary" onClick={() => setNewOpen(true)}>
              {t("ux.newProgram")}
            </button>
            <Link className="button ghost" to="/vocabulary">
              {t("ux.wordsOnly")}
            </Link>
          </section>
        )}
      <button
        className="button ghost"
        aria-pressed={completedOpen}
        onClick={() => setCompletedOpen((value) => !value)}
      >
        {t(completedOpen ? "ux.activePrograms" : "ux.completedPrograms")}
      </button>
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t("ux.chooseStart")}
      >
        <div className="modal-body ux-choice-list">
          {path.length > 0 && (
            <button
              className="ux-choice"
              onClick={() => open("/english-learning", "english-path", "en")}
            >
              <BookOpen size={24} />
              <span>
                <b>{t("englishPath.title")}</b>
                <small>{t("ux.structuredHelp")}</small>
              </span>
            </button>
          )}
          <Link
            className="ux-choice"
            to="/courses?new=1"
            onClick={() => setNewOpen(false)}
          >
            <MessageCircle size={24} />
            <span>
              <b>{t("ux.personalProgram")}</b>
              <small>{t("ux.personalHelp")}</small>
            </span>
          </Link>
          <Link className="ux-choice" to="/private-lesson?practice=free">
            <MessageCircle size={24} />
            <span>
              <b>{t("ux.freeChat")}</b>
              <small>{t("ux.noEnrollment")}</small>
            </span>
          </Link>
          <Link className="ux-choice" to="/vocabulary">
            <BookOpen size={24} />
            <span>
              <b>{t("ux.wordsOnly")}</b>
              <small>{t("ux.noEnrollment")}</small>
            </span>
          </Link>
        </div>
      </Modal>
    </div>
  );
}
