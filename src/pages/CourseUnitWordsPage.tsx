import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { RemoteState } from "../components/RemoteState";
import { LiveCaptureModal } from "../components/LiveCaptureModal";
import { product, uuid } from "../lib/product";
import { useResource } from "../lib/useResource";
import { learningReturn } from "../lib/learningNavigation";
const courseWordsSchema = z.object({
  title: z.string(),
  unitKey: z.string(),
  targetLanguageCode: z.string(),
  supportLanguageCode: z.string(),
  words: z.array(
    z.object({
      sourceText: z.string(),
      choices: z.array(z.object({ id: uuid, translationText: z.string() })),
    }),
  ),
});
export function CourseUnitWordsPage() {
  const { id, unitKey } = useParams();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const words = useResource(
    useCallback(
      () => product(courseWordsSchema, `courses/${id}/units/${unitKey}/words`),
      [id, unitKey],
    ),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [capture, setCapture] = useState<string>();
  const data = words.data;
  const activeIds = new Set(
    data?.words.flatMap((word) => word.choices.map((choice) => choice.id)) ??
      [],
  );
  const ids = selected.filter((item) => activeIds.has(item));
  const destination = learningReturn(params.get("return"), `/courses/${id}`);
  const scope = new URLSearchParams({
    items: ids.join(","),
    language: data?.targetLanguageCode ?? "",
    return: destination,
  });
  return (
    <div
      className="canonical-page course-unit-words"
      data-figma-desktop="43:2725"
    >
      <header>
        <h1>{t("ux.unitWords")}</h1>
        <p dir="auto">{data?.title}</p>
      </header>
      <RemoteState
        loading={words.loading}
        error={words.error}
        retry={() => void words.reload()}
      />
      {data?.words.map((word) => (
        <section className="ux-card" key={word.sourceText}>
          <h2 dir="auto" lang={data.targetLanguageCode}>
            {word.sourceText}
          </h2>
          {word.choices.map((choice) => (
            <label key={choice.id} className="course-word-choice">
              <input
                type="checkbox"
                checked={ids.includes(choice.id)}
                onChange={(event) =>
                  setSelected((previous) =>
                    event.target.checked
                      ? [...new Set([...previous, choice.id])]
                      : previous.filter((value) => value !== choice.id),
                  )
                }
              />
              <span dir="auto" lang={data.supportLanguageCode}>
                {choice.translationText}
              </span>
            </label>
          ))}
          <button
            type="button"
            className="button ghost"
            onClick={() => setCapture(word.sourceText)}
          >
            {t(word.choices.length ? "capture.createSense" : "capture.title")}
          </button>
        </section>
      ))}
      {ids.length > 0 && (
        <>
          <Link className="button primary" to={`/learn/smart?${scope}`}>
            {t("dashboard.smartPractice")}
          </Link>
          <Link className="button secondary" to={`/learn?${scope}`}>
            {t("ux.chooseGame")}
          </Link>
        </>
      )}
      <Link className="button secondary" to={destination}>
        {t("courses.backToCourse")}
      </Link>
      <LiveCaptureModal
        open={!!capture}
        onClose={() => setCapture(undefined)}
        onSaved={() => void words.reload()}
        initial={
          capture && data
            ? {
                sourceText: capture,
                sourceLanguageCode: data.targetLanguageCode,
                translationLanguageCode: data.supportLanguageCode,
              }
            : undefined
        }
      />
    </div>
  );
}
