import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { ReadAloud } from "./CourseComposer";
import { product, studyImageSchema, type WordPackEntry } from "../lib/product";
import { useResource } from "../lib/useResource";

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
  const picture = useResource(
    useCallback(
      () =>
        entryId
          ? product(
              studyImageSchema,
              `word-packs/${packId}/entries/${entryId}/image`,
            )
          : Promise.resolve({ image: null }),
      [packId, entryId],
    ),
  );
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
          {picture.data?.image && (
            <figure className="unit-word-picture">
              <img
                src={picture.data.image.url}
                alt={picture.data.image.alt || selected.sourceText}
              />
              {picture.data.image.sourceUrl && (
                <figcaption>
                  <a
                    href={picture.data.image.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {picture.data.image.creator || picture.data.image.provider}
                  </a>
                </figcaption>
              )}
            </figure>
          )}
          <div className="unit-word-example">
            <p>{t("pathUi.inSentence")}</p>
            {selected.exampleText ? (
              <blockquote dir="auto" lang={language}>
                {selected.exampleText}
              </blockquote>
            ) : (
              <p>{t("pathUi.noExample")}</p>
            )}
          </div>
          <label className="unit-known-toggle">
            <input
              type="checkbox"
              disabled={busy}
              checked={!!selected.known}
              onChange={() => onKnown(selected)}
            />
            {t("pathUi.alreadyKnown")}
          </label>
        </aside>
      )}
    </div>
  );
}
