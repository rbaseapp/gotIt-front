import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Languages, Link2, Plus, Save } from "lucide-react";
import { useApp } from "../context/AppContext";
import { canonicalLanguage } from "../lib/contracts";
import { normalizeAnswer } from "../lib/practice";
import type { LearningItem } from "../types";
import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";

export function AddWordModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item?: LearningItem;
}) {
  const { t } = useTranslation();
  const { addItem, updateItem, items, profile, mode } = useApp();
  const [source, setSource] = useState("");
  const [translation, setTranslation] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [translationLanguage, setTranslationLanguage] = useState("he");
  const [examples, setExamples] = useState("");
  const [translations, setTranslations] = useState("");
  const [mergeId, setMergeId] = useState("new");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setSource(item?.source || "");
    setTranslation(item?.translation || "");
    setContext(item?.context || "");
    setTags(item?.tags.join(", ") || "");
    setSourceLanguage(
      item?.sourceLanguage || profile.languages[0]?.languageCode || "en",
    );
    setTranslationLanguage(
      item?.translationLanguage || profile.defaultTranslationLanguage || "he",
    );
    setExamples(item?.examples?.join("\n") || "");
    setTranslations(item?.translations?.join("\n") || "");
    setMergeId("new");
    setError("");
  }, [open, item, profile]);
  const candidates = !item
    ? items.filter(
        (value) =>
          !value.deletedAt &&
          normalizeAnswer(value.source) === normalizeAnswer(source) &&
          value.sourceLanguage.toLowerCase() === sourceLanguage.toLowerCase() &&
          value.translationLanguage.toLowerCase() ===
            translationLanguage.toLowerCase(),
      )
    : [];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!source.trim() || !translation.trim()) {
      setError(t("demoAdd.required"));
      return;
    }
    try {
      const input = {
        source: source.trim(),
        translation: translation.trim(),
        context: context.trim(),
        sourceLanguage: canonicalLanguage(sourceLanguage),
        translationLanguage: canonicalLanguage(translationLanguage),
        tags: [
          ...new Set(
            tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ],
      };
      if (!input.sourceLanguage || !input.translationLanguage)
        throw new Error();
      if (item)
        updateItem(item.id, {
          ...input,
          examples: examples
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          translations: translations
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        });
      else
        addItem(
          input,
          candidates.some((candidate) => candidate.id === mergeId)
            ? mergeId
            : undefined,
        );
      onClose();
    } catch {
      setError(t("demoAdd.invalidLanguages"));
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? t("demoAdd.editTitle") : t("demoAdd.addTitle")}
    >
      {mode !== "demo" ? (
        <div className="modal-body">
          <p>{t("demoAdd.liveUnavailable")}</p>
        </div>
      ) : (
        <form className="modal-body form-stack" onSubmit={submit}>
          <div className="form-two-columns">
            <label className="field">
              <span>
                {t("demoAdd.sourceLanguage")} <Languages size={13} />
              </span>
              <input
                aria-label={t("demoAdd.sourceLanguageCode")}
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
                dir="ltr"
                required
                maxLength={64}
                placeholder="en"
              />
            </label>
            <label className="field">
              <span>{t("demoAdd.translationLanguage")}</span>
              <input
                aria-label={t("demoAdd.translationLanguageCode")}
                value={translationLanguage}
                onChange={(event) => setTranslationLanguage(event.target.value)}
                dir="ltr"
                required
                maxLength={64}
                placeholder="he"
              />
            </label>
          </div>
          <small className="muted-note">{t("demoAdd.languageHelp")}</small>
          <label className="field">
            <span>{t("demoAdd.wordOrPhrase")}</span>
            <div className="input-with-icon">
              <BookOpen size={18} />
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder={t("demoAdd.wordPlaceholder")}
                dir="auto"
                required
                maxLength={500}
              />
            </div>
          </label>
          <label className="field">
            <span>{t("demoAdd.meaning")}</span>
            <input
              value={translation}
              onChange={(event) => setTranslation(event.target.value)}
              placeholder={t("demoAdd.meaningPlaceholder")}
              dir="auto"
              required
              maxLength={1000}
            />
          </label>
          <label className="field">
            <span>
              {t("demoAdd.sourceSentence")}{" "}
              <small>{t("demoAdd.recommended")}</small>
            </span>
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder={t("demoAdd.sentencePlaceholder")}
              dir="auto"
              rows={3}
              maxLength={3000}
            />
          </label>
          {candidates.length > 0 && (
            <fieldset className="sense-picker">
              <legend>{t("demoAdd.existingSpelling")}</legend>
              <label>
                <input
                  type="radio"
                  checked={mergeId === "new"}
                  onChange={() => setMergeId("new")}
                />
                {t("demoAdd.createMeaning")}
              </label>
              {candidates.map((candidate) => (
                <label key={candidate.id}>
                  <input
                    type="radio"
                    checked={mergeId === candidate.id}
                    onChange={() => setMergeId(candidate.id)}
                  />
                  {t("demoAdd.addContextTo", {
                    meaning: candidate.translation,
                  })}
                </label>
              ))}
              <small>{t("demoAdd.mergeHelp")}</small>
            </fieldset>
          )}
          <label className="field">
            <span>
              {t("demoAdd.tags")} <small>{t("demoAdd.commaSeparated")}</small>
            </span>
            <div className="input-with-icon">
              <Link2 size={17} />
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Work, Travel"
                dir="auto"
              />
            </div>
          </label>
          {item && (
            <details className="advanced-fields">
              <summary>{t("demoAdd.examplesTranslations")}</summary>
              <label className="field">
                <span>{t("demoAdd.exampleLines")}</span>
                <textarea
                  value={examples}
                  onChange={(event) => setExamples(event.target.value)}
                  dir="auto"
                  rows={3}
                />
              </label>
              <label className="field">
                <span>{t("demoAdd.alternativeWording")}</span>
                <textarea
                  value={translations}
                  onChange={(event) => setTranslations(event.target.value)}
                  dir="auto"
                  rows={2}
                />
              </label>
            </details>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="button ghost" onClick={onClose}>
              {t("feedback.cancel")}
            </button>
            <button className="button primary" type="submit">
              {item ? <Save size={18} /> : <Plus size={18} />}
              {item
                ? t("demoAdd.saveEdit")
                : mergeId !== "new" && candidates.length
                  ? t("demoAdd.addContext")
                  : t("demoAdd.addToVocabulary")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
