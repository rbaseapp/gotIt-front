import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, MessageCircle, Globe, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { RemoteState } from "../components/RemoteState";
import { LanguageCombobox } from "../components/LanguageCombobox";
import { useFeedback } from "../components/Feedback";
import { courseApi, type Course } from "../lib/courses";
import { useResource } from "../lib/useResource";
import { product, wordPacksSchema, errorMessage } from "../lib/product";
import { englishPathLevels, completedEnglishUnit } from "../lib/englishPath";
import { getLanguageOptions } from "../lib/languages";
import { chooseProgram, selectedProgram } from "../lib/learningNavigation";

export function ProgramsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, updateProfile } = useApp();
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [params, setParams] = useSearchParams();
  const newOpen = params.get("choose") === "1";
  const setNewOpen = (open: boolean) => setParams(open ? { choose: "1" } : {});
  const [selectedTarget, setTarget] = useState<string>();
  const [selectedSupport, setSupport] = useState<string>();
  const target = selectedTarget ?? profile.defaultSourceLanguage ?? "en";
  const support =
    selectedSupport ??
    profile.defaultTranslationLanguage ??
    i18n.resolvedLanguage?.split("-")[0] ??
    "he";
  const [completedOpen, setCompletedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const courses = useResource(useCallback(() => courseApi.list(), []));
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const prepared = useResource(
    useCallback(
      () =>
        newOpen
          ? product(
              wordPacksSchema,
              `word-packs?${new URLSearchParams({ sourceLanguageCode: target, translationLanguageCode: support })}`,
            )
          : Promise.resolve({ packs: [] }),
      [newOpen, target, support],
    ),
  );
  const matchingPath = englishPathLevels(prepared.data?.packs ?? []).some(
    (level) =>
      level.packs.some(
        (pack) =>
          pack.track.sourceLanguageCode ===
            target.split("-")[0].toLowerCase() &&
          pack.track.translationLanguageCode ===
            support.split("-")[0].toLowerCase(),
      ),
  );
  // Older servers filter discovery by saved defaults and ignore the selected pair.
  // Check the published English/Hebrew path after explicitly switching that pair.
  const switchPublishedPair =
    target.split("-")[0].toLowerCase() === "en" &&
    support.split("-")[0].toLowerCase() === "he" &&
    ((profile.defaultSourceLanguage !== null &&
      profile.defaultSourceLanguage.split("-")[0].toLowerCase() !== "en") ||
      (profile.defaultTranslationLanguage !== null &&
        profile.defaultTranslationLanguage.split("-")[0].toLowerCase() !==
          "he"));
  const pairAvailable = matchingPath || switchPublishedPair;
  const openPrepared = async () => {
    setBusy(true);
    try {
      if (
        profile.defaultSourceLanguage !== target ||
        profile.defaultTranslationLanguage !== support
      )
        await updateProfile({
          defaultSourceLanguage: target,
          defaultTranslationLanguage: support,
        });
      const catalog = await product(wordPacksSchema, "word-packs");
      if (!englishPathLevels(catalog.packs).some((level) => level.packs.length))
        throw new Error(t("englishPath.unavailableTitle"));
      open("/english-learning", "english-path", target);
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };
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
  if (newOpen)
    return (
      <div
        className="ux-page new-program-page page-enter"
        data-figma-desktop="43:2182"
      >
        <header className="page-heading-row">
          <div>
            <h1>{t("ux.newProgram")}</h1>
            <p>{t("pathUi.newProgramHelp")}</p>
          </div>
          <button className="button ghost" onClick={() => setNewOpen(false)}>
            {t("common.back")}
          </button>
        </header>
        <section className="ux-card new-program-languages">
          <label className="field">
            <span>{t("courses.targetLanguage")}</span>
            <LanguageCombobox
              ariaLabel={t("courses.targetLanguage")}
              value={target}
              onChange={setTarget}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>{t("courses.supportLanguage")}</span>
            <LanguageCombobox
              ariaLabel={t("courses.supportLanguage")}
              value={support}
              onChange={setSupport}
              disabled={busy}
            />
          </label>
        </section>
        <section className="ux-card">
          <h2>{t("englishPath.title")}</h2>
          <p>{t("ux.structuredHelp")}</p>
          <RemoteState
            loading={prepared.loading}
            error={prepared.error}
            retry={() => void prepared.reload()}
          />
          <button
            className="button primary"
            disabled={
              busy ||
              prepared.loading ||
              Boolean(prepared.error) ||
              !pairAvailable
            }
            onClick={() => void openPrepared()}
          >
            {t("pathUi.openFromZero")}
          </button>
          {!prepared.loading && !prepared.error && !pairAvailable && (
            <p>{t("pathUi.pairUnavailable")}</p>
          )}
        </section>
        <section className="ux-card">
          <h2>{t("ux.personalProgram")}</h2>
          <p>{t("ux.personalHelp")}</p>
          <Link
            className="button secondary"
            to={`/courses?new=1&language=${encodeURIComponent(target)}&support=${encodeURIComponent(support)}`}
          >
            {t("ux.personalProgram")}
          </Link>
        </section>
        <div className="ux-inline-actions">
          <Link
            className="button ghost"
            to={`/private-lesson?practice=free&language=${encodeURIComponent(target)}`}
          >
            {t("ux.freeChat")}
          </Link>
          <Link className="button ghost" to="/vocabulary">
            {t("ux.wordsOnly")}
          </Link>
        </div>
      </div>
    );
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
      {[...groups].map(([code, items]) => (
        <section
          className="program-language"
          key={code}
          aria-labelledby={`program-language-${code}`}
        >
          <h2 id={`program-language-${code}`}>
            <Globe size={22} aria-hidden="true" />
            {languageName(code)}
          </h2>
          <div className="program-grid">
            {code === "en" &&
              path.length > 0 &&
              (completedOpen ? !next : Boolean(next)) && (
                <article className="program-card structured">
                  <header className="program-card-tools">
                    {selectedProgram(user) === "english-path" && (
                      <span className="program-selected pill">
                        {t("ux.selectedProgram")}
                      </span>
                    )}
                  </header>
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
                  <header className="program-card-tools">
                    {selectedProgram(user) === course.id && (
                      <span className="program-selected pill">
                        {t("ux.selectedProgram")}
                      </span>
                    )}
                    <button
                      className="icon-button program-delete"
                      disabled={busy}
                      aria-label={t("courses.deleteCourse", {
                        title: plan?.plan.title ?? t("ux.personalProgram"),
                      })}
                      onClick={() => void remove(course)}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </header>
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
    </div>
  );
}
