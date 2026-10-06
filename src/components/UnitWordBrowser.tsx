import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { ReadAloud } from "./CourseComposer";
import {
  product,
  studyImageSchema,
  wordExampleSchema,
  type WordPackEntry,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { RemoteState } from "./RemoteState";

export function UnitWordBrowser({
  entries,
  language,
  supportLanguage,
  busy,
  onKnown,
  packId,
}: {
  packId: string;
  entries: WordPackEntry[];
  language: string;
  supportLanguage: string;
  busy: boolean;
  onKnown: (entry: WordPackEntry) => void;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>();
  const [limit, setLimit] = useState(6);
  const selected =
    entries.find((entry) => entry.id === selectedId) ?? entries[0];
  const entryId = selected?.id;
  const exampleText = selected?.exampleText;
  const picture = useResource(
    useCallback(async () => {
      if (!entryId) return { image: null, entryId };
      const path = `word-packs/${packId}/entries/${entryId}/image`;
      const value = await product(studyImageSchema, path, "POST", {});
      return { ...value, entryId };
    }, [packId, entryId]),
  );
  const example = useResource(
    useCallback(
      async () => ({
        ...(exampleText || !entryId
          ? { exampleText: exampleText ?? null, generated: false }
          : await product(
              wordExampleSchema,
              `word-packs/${packId}/entries/${entryId}/example`,
              "POST",
              {},
            )),
        entryId,
      }),
      [packId, entryId, exampleText],
    ),
  );
  const image = picture.data?.entryId === entryId ? picture.data.image : null;
  const sentence =
    exampleText ||
    (example.data?.entryId === entryId ? example.data.exampleText : null);
  return (
    <div className="unit-browser" data-figma-desktop="43:2725">
      <section
        className="unit-browser-list ux-card"
        aria-label={t("structuredUi.words")}
      >
        <p>{t("pathUi.chooseWord")}</p>
        <div className="unit-browser-columns">
          <strong>{t("pathUi.word")}</strong>
          <strong>{t("pathUi.meaning")}</strong>
          <span />
        </div>
        {entries.slice(0, limit).map((entry) => (
          <div
            className={`unit-browser-row${selected?.id === entry.id ? " selected" : ""}`}
            key={entry.id}
          >
            <button
              type="button"
              aria-pressed={selected?.id === entry.id}
              onClick={() => setSelectedId(entry.id)}
            >
              <ChevronLeft size={22} aria-hidden="true" />
              <b dir="auto" lang={language}>
                {entry.sourceText}
              </b>
              <span dir="auto" lang={supportLanguage}>
                {entry.translationText}
              </span>
            </button>
            <ReadAloud
              text={entry.sourceText}
              language={language}
              label={entry.sourceText}
            />
          </div>
        ))}
        {limit < entries.length && (
          <button
            className="button ghost unit-more"
            onClick={() => setLimit((n) => n + 12)}
          >
            {t("pathUi.moreWords")}
            <ChevronLeft size={18} />
          </button>
        )}
      </section>
      {selected && (
        <aside
          className="unit-word-detail ux-card"
          aria-label={t("pathUi.wordDetails")}
        >
          <h2 dir="auto" lang={language}>
            {selected.sourceText}
          </h2>
          <ReadAloud
            text={selected.sourceText}
            language={language}
            label={t("pathUi.listenWord")}
            className="button secondary"
            showLabel
          />
          <p className="unit-word-meaning" dir="auto" lang={supportLanguage}>
            {selected.translationText}
          </p>
          <RemoteState
            loading={picture.loading}
            error={picture.error}
            retry={() => void picture.reload()}
          />
          {!picture.loading && !picture.error && !image && (
            <p role="status">{t("unitStudy.noImage")}</p>
          )}
          {image && (
            <figure className="unit-word-picture">
              <img src={image.url} alt={image.alt || selected.sourceText} />
              {image.sourceUrl && (
                <figcaption>
                  <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                    {image.creator || image.provider}
                  </a>
                </figcaption>
              )}
            </figure>
          )}
          <div className="unit-word-example">
            <p>{t("pathUi.inSentence")}</p>
            <RemoteState
              loading={example.loading}
              error={example.error}
              retry={() => void example.reload()}
            />
            {sentence ? (
              <blockquote dir="auto" lang={language}>
                {sentence}
              </blockquote>
            ) : !example.loading && !example.error ? (
              <p>{t("pathUi.noExample")}</p>
            ) : null}
            {sentence && (
              <ReadAloud
                text={sentence}
                language={language}
                label={t("unitStudy.listenExample")}
                className="button ghost"
                showLabel
              />
            )}
          </div>
          <label className="unit-known-toggle">
            <input
              type="checkbox"
              disabled={busy}
              checked={!!selected.known}
              aria-describedby="unit-known-help"
              onChange={() => onKnown(selected)}
            />
            {t("unitStudy.knownLabel")}
          </label>
          <p id="unit-known-help" className="unit-known-help">
            {t("unitStudy.knownHelp")}
          </p>
        </aside>
      )}
    </div>
  );
}
