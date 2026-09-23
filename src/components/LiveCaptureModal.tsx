import { useRef, useState } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  captureReceipt,
  errorMessage,
  intent,
  previewSchema,
  product,
  type Intent,
} from "../lib/product";
import { Modal } from "./Modal";
import { getLanguageOptions } from "../lib/languages";
import { useTranslation } from "react-i18next";

export function LiveCaptureModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t("capture.title")} size="lg">
      {open && <CaptureForm onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}
function CaptureForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const languageOptions = getLanguageOptions(i18n.resolvedLanguage || "en");
  const { profile } = useApp();
  const [source, setSource] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(
    profile.defaultSourceLanguage || "",
  );
  const [targetLanguage, setTargetLanguage] = useState(
    profile.defaultTranslationLanguage || "he",
  );
  const [translation, setTranslation] = useState("");
  const [variants, setVariants] = useState("");
  const [sentence, setSentence] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [method, setMethod] = useState(
    profile.translationMethodPreference || "auto",
  );
  const [preview, setPreview] =
    useState<z.infer<typeof previewSchema>["preview"]>();
  const [previewSignature, setPreviewSignature] = useState("");
  const [candidate, setCandidate] = useState<number>();
  const [decision, setDecision] = useState("auto");
  const [pending, setPending] = useState<Intent>();
  const [saved, setSaved] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const pendingRef = useRef<Intent | undefined>(undefined);
  const input = {
    selectedText: source,
    ...(sourceLanguage ? { sourceLanguageCode: sourceLanguage } : {}),
    translationLanguageCode: targetLanguage,
    translationMethod: method,
    context: {
      ...(sentence.trim() ? { sentenceText: sentence } : {}),
      ...(url.trim() ? { pageUrl: url } : {}),
      ...(title.trim() ? { pageTitle: title } : {}),
    },
  };
  const signature = JSON.stringify(input);
  const validPreview = preview && previewSignature === signature;
  const runPreview = async () => {
    setBusy(true);
    setError("");
    setCandidate(undefined);
    try {
      const result = await product(
        previewSchema,
        "captures/preview",
        "POST",
        input,
      );
      setPreview(result.preview);
      setPreviewSignature(signature);
      setDecision(result.preview.existingSenses.items.length ? "" : "auto");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (
      saving.current ||
      (!pendingRef.current &&
        !pending &&
        (!validPreview || !translation.trim() || !decision))
    )
      return;
    saving.current = true;
    setBusy(true);
    setError("");
    const selected =
      candidate === undefined
        ? undefined
        : preview?.enrichment.candidates[candidate];
    const submission =
      pendingRef.current ||
      pending ||
      intent({
        item: {
          sourceText: preview?.sourceText || source,
          sourceLanguageCode: preview?.sourceLanguageCode || sourceLanguage,
          translationLanguageCode:
            preview?.translationLanguageCode || targetLanguage,
          itemType: "other",
          ...(selected
            ? {
                partOfSpeech: selected.partOfSpeech,
                phoneticText: selected.phoneticText,
                phoneticScheme: selected.phoneticScheme,
              }
            : {}),
        },
        translation: {
          text: translation,
          variants: variants
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
          ...(selected ? { selectionToken: selected.selectionToken } : {}),
        },
        context: {
          ...input.context,
          selectedText: source,
          sourceType: "web_manual",
        },
        senseDecision:
          decision === "auto" || decision === "create_new_sense"
            ? { mode: decision }
            : { mode: "merge", learningItemId: decision },
      });
    pendingRef.current = submission;
    setPending(submission);
    try {
      const result = await product(
        captureReceipt,
        "captures",
        "POST",
        submission.body,
        submission.eventId,
      );
      setSaved(result.capture.learningItemId);
      onSaved?.();
      window.dispatchEvent(new Event("gotit:library-changed"));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  if (saved)
    return (
      <div className="modal-body form-stack">
        <p role="status">{t("capture.savedDescription")}</p>
        <Link
          className="button primary"
          to={`/vocabulary?item=${saved}`}
          onClick={onClose}
        >
          {t("capture.openWord")}
        </Link>
        <button className="button ghost" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    );
  return (
    <div className="modal-body form-stack">
      <p>{t("capture.description")}</p>
      <fieldset
        disabled={busy || !!pending}
        className="form-stack plain-fieldset"
      >
        <label className="field">
          <span>{t("capture.sourceText")}</span>
          <input
            dir="auto"
            maxLength={500}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          />
        </label>
        <div className="live-form-grid">
          <label className="field">
            <span>{t("capture.sourceLanguage")}</span>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
            >
              <option value="">{t("capture.autoDetect")}</option>
              {languageOptions.map(([code, label]) => (
                <option value={code} key={code}>
                  {label} · {code}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("capture.translationLanguage")}</span>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {languageOptions.map(([code, label]) => (
                <option value={code} key={code}>
                  {label} · {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>{t("capture.translationMethod")}</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
          >
            <option value="auto">{t("capture.automatic")}</option>
            <option value="dictionary">{t("capture.dictionary")}</option>
            <option value="ai">AI</option>
          </select>
        </label>
        <details>
          <summary>{t("capture.contextOptional")}</summary>
          <div className="form-stack">
            <label className="field">
              <span>{t("capture.originalSentence")}</span>
              <textarea
                dir="auto"
                maxLength={4000}
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("capture.sourceTitle")}</span>
              <input
                maxLength={500}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("capture.sourceUrl")}</span>
              <input
                dir="ltr"
                type="url"
                maxLength={2048}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
          </div>
        </details>
        <button
          type="button"
          className="button secondary"
          disabled={!source.trim() || !targetLanguage.trim()}
          onClick={() => void runPreview()}
        >
          {t("capture.checkTranslation")}
        </button>
        {validPreview && (
          <>
            <p role="status">
              {preview.enrichment.status === "succeeded"
                ? t("capture.chooseSuggestion")
                : t("capture.manualTranslation")}
            </p>
            <div className="live-options">
              {preview.enrichment.candidates.map((c, index) => (
                <button
                  type="button"
                  className="button secondary"
                  key={index}
                  onClick={() => {
                    setCandidate(index);
                    setTranslation(c.text);
                    setVariants(c.variants.join("\n"));
                  }}
                >
                  {c.text} · {c.provenance.providerName}
                </button>
              ))}
            </div>
            <label className="field">
              <span>{t("capture.meaningToSave")}</span>
              <input
                dir="auto"
                maxLength={1000}
                required
                value={translation}
                onChange={(e) => {
                  setTranslation(e.target.value);
                  setCandidate(undefined);
                }}
              />
            </label>
            <label className="field">
              <span>{t("capture.variants")}</span>
              <textarea
                dir="auto"
                value={variants}
                maxLength={10000}
                onChange={(e) => {
                  setVariants(e.target.value);
                  setCandidate(undefined);
                }}
              />
            </label>
            <label className="field">
              <span>{t("capture.senseDecision")}</span>
              <select
                value={decision}
                onChange={(e) => {
                  const value = e.target.value;
                  setDecision(value);
                  const existing = preview.existingSenses.items.find(
                    (s) => s.learningItemId === value,
                  );
                  if (existing?.primaryTranslation) {
                    setTranslation(existing.primaryTranslation);
                    setCandidate(undefined);
                  }
                }}
              >
                <option value="" disabled>
                  {t("capture.chooseMeaning")}
                </option>
                {!preview.existingSenses.items.length && (
                  <option value="auto">
                    {t("capture.autoCreate")}
                  </option>
                )}
                <option value="create_new_sense">{t("capture.createSense")}</option>
                {preview.existingSenses.items.map((s) => (
                  <option key={s.learningItemId} value={s.learningItemId}>
                    {t("capture.mergeInto", { meaning: s.primaryTranslation || s.sourceText, status: s.userStatus })}
                  </option>
                ))}
              </select>
            </label>
            {decision &&
              decision !== "auto" &&
              decision !== "create_new_sense" && (
                <p>{t("capture.mergeHelp")}</p>
              )}
            {preview.existingSenses.hasMore && (
              <p>{t("capture.moreMeanings")}</p>
            )}
            {candidate !== undefined && (
              <p className="auth-footnote">
                {t("capture.verifiedSuggestion")}
              </p>
            )}
          </>
        )}
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <p>{t("capture.lockedRequest")}</p>
      )}
      <button
        className="button primary"
        disabled={
          busy ||
          (!pending && (!validPreview || !translation.trim() || !decision))
        }
        onClick={() => void save()}
      >
        {busy ? t("capture.saving") : pending ? t("capture.retrySave") : t("capture.saveWord")}
      </button>
    </div>
  );
}
