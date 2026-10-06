import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RemoteState } from "../components/RemoteState";
import { Modal } from "../components/Modal";
import { LearningLanguageSelect } from "../components/LearningLanguageSelect";
import { useResource } from "../lib/useResource";
import { useLearningLanguage } from "../lib/useLearningLanguage";
import { product, page, sessionSchema, type Session } from "../lib/product";
import { listPrivateLessons } from "../lib/privateLesson";
import { courseApi } from "../lib/courses";

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const language = useLearningLanguage();
  const code = params.get("language") || language.code;
  const [cursor, setCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );
  const [type, setType] = useState(() =>
    ["lessons", "homework"].includes(params.get("view") ?? "")
      ? params.get("view")!
      : "practice",
  );
  const [selected, setSelected] = useState<Session>();
  const courseId = params.get("course");
  const packId = params.get("pack");
  const sessions = useResource(
    useCallback(
      async () => ({
        ...(await product(
          page(sessionSchema),
          `practice/sessions?limit=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${code ? `&sourceLanguageCode=${encodeURIComponent(code)}` : ""}${packId ? `&packId=${encodeURIComponent(packId)}` : ""}`,
        )),
        languageCode: code,
      }),
      [cursor, code, packId],
    ),
  );
  const lessons = useResource(
    useCallback(
      () =>
        listPrivateLessons(
          50,
          courseId ?? undefined,
          packId ?? undefined,
          code || undefined,
        ),
      [courseId, packId, code],
    ),
  );
  const courses = useResource(useCallback(() => courseApi.list(), []));
  const availableLanguages = [
    ...new Map(
      [
        ...(courses.data?.courses ?? []).map((course) => ({
          code: course.preferences.targetLanguageCode,
          count: 0,
        })),
        ...language.languages,
        ...(code
          ? [
              {
                code,
                count:
                  language.languages.find((entry) => entry.code === code)
                    ?.count ?? 0,
              },
            ]
          : []),
      ].map((entry) => [entry.code, entry]),
    ).values(),
  ];
  const mode = (value: string) =>
    value === "smart_review"
      ? "smart"
      : value === "listening_spelling"
        ? "listening"
        : value;
  return (
    <div className="ux-page ux-history page-enter">
      <header className="page-heading-row">
        <div>
          <h1>{t("ux.history")}</h1>
          <p>{t("ux.historyHelp")}</p>
        </div>
      </header>
      <LearningLanguageSelect
        code={code}
        languages={availableLanguages}
        onChange={(code) => {
          language.setCode(code);
          const next = new URLSearchParams(params);
          next.set("language", code);
          setParams(next);
          setCursor(undefined);
          setCursorHistory([]);
        }}
      />
      <div
        className="ux-segmented"
        role="group"
        aria-label={t("ux.historyFilter")}
      >
        {["practice", "lessons", "homework"].map((value) => (
          <button
            className={type === value ? "active" : ""}
            aria-pressed={type === value}
            key={value}
            onClick={() => setType(value)}
          >
            {t(`ux.${value}`)}
          </button>
        ))}
      </div>
      {type === "practice" && (
        <>
          <RemoteState
            loading={sessions.loading || language.loading}
            error={sessions.error || language.error}
            retry={() => {
              void sessions.reload();
              void language.reload();
            }}
          />
          {sessions.data?.languageCode === code &&
            sessions.data.items.map((session) => (
              <article className="ux-card ux-history-row" key={session.id}>
                <div>
                  <h2>
                    {t(`labels.${session.sessionType}`, {
                      defaultValue: session.sessionType,
                    })}
                  </h2>
                  <p dir="auto">{session.scope?.title}</p>
                  <time dateTime={session.startedAt}>
                    {new Date(session.startedAt).toLocaleString(
                      i18n.resolvedLanguage,
                    )}
                  </time>
                  <span className="pill">
                    {t(
                      session.status === "completed"
                        ? "learn.statusCompleted"
                        : session.status === "active"
                          ? "learn.statusActive"
                          : "learn.statusStopped",
                    )}
                  </span>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setSelected(session)}
                >
                  {t("ux.details")}
                </button>
                {session.status === "active" && (
                  <Link
                    className="button primary"
                    to={`/learn/session/${mode(session.sessionType)}?resume=${session.id}&language=${encodeURIComponent(code)}&return=%2Flearn`}
                  >
                    {t("learn.continue")}
                  </Link>
                )}
              </article>
            ))}
          {sessions.data?.languageCode === code &&
            !sessions.data.items.length && (
              <p className="ux-card">{t("ux.historyEmpty")}</p>
            )}
          <div className="ux-inline-actions">
            {cursorHistory.length > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  setCursor(cursorHistory.at(-1));
                  setCursorHistory((values) => values.slice(0, -1));
                }}
              >
                {t("learn.previousSessions")}
              </button>
            )}
            {sessions.data?.nextCursor && (
              <button
                className="button secondary"
                onClick={() => {
                  setCursorHistory((values) => [...values, cursor]);
                  setCursor(sessions.data!.nextCursor!);
                }}
              >
                {t("learn.moreSessions")}
              </button>
            )}
          </div>
        </>
      )}
      {type === "lessons" && (
        <>
          <RemoteState
            loading={lessons.loading}
            error={lessons.error}
            retry={() => void lessons.reload()}
          />
          <p className="ux-caption">{t("ux.latestLessons")}</p>
          {lessons.data
            ?.filter((item) => !code || item.targetLanguageCode === code)
            .map((lesson) => (
              <article className="ux-card ux-history-row" key={lesson.id}>
                <div>
                  <h2 dir="auto">{lesson.topic}</h2>
                  <p>{t(`privateLesson.history.status.${lesson.status}`)}</p>
                </div>
                <Link
                  className="button secondary"
                  to={`/private-lesson?view=history&lesson=${lesson.id}${courseId ? `&course=${encodeURIComponent(courseId)}` : ""}`}
                >
                  {t("ux.details")}
                </Link>
              </article>
            ))}
          {lessons.data &&
            !lessons.data.some(
              (item) => !code || item.targetLanguageCode === code,
            ) && <p className="ux-card">{t("ux.historyEmpty")}</p>}
        </>
      )}
      {type === "homework" && (
        <>
          <RemoteState
            loading={courses.loading}
            error={courses.error}
            retry={() => void courses.reload()}
          />
          {courses.data?.homework
            .filter(
              (item) =>
                (!code || item.targetLanguageCode === code) &&
                (!courseId || item.courseId === courseId),
            )
            .map((item) => (
              <article className="ux-card ux-history-row" key={item.id}>
                <div>
                  <h2 dir="auto">{item.title}</h2>
                  <p>
                    {item.completedCount}/{item.taskCount}
                  </p>
                </div>
                <Link className="button secondary" to={`/homework/${item.id}`}>
                  {t("ux.details")}
                </Link>
              </article>
            ))}
          {courses.data &&
            !courses.data.homework.some(
              (item) =>
                (!code || item.targetLanguageCode === code) &&
                (!courseId || item.courseId === courseId),
            ) && <p className="ux-card">{t("ux.historyEmpty")}</p>}
        </>
      )}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(undefined)}
        title={t("ux.activityDetails")}
      >
        {selected && (
          <div className="modal-body">
            <p>
              {t("learn.attemptsXp", {
                count: selected.attemptCount,
                xp: selected.xpEarned,
              })}
            </p>
            <p>{t("ux.activityReadOnly")}</p>
            <button
              className="button primary"
              onClick={() => setSelected(undefined)}
            >
              {t("common.close")}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
