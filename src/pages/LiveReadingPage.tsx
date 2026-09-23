import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { BookOpenText, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { RemoteState } from "../components/RemoteState";
import {
  errorMessage,
  intent,
  page,
  product,
  query,
  readingPreview,
  readingSchema,
  readingSummary,
  uuid,
  type Intent,
  type Reading,
} from "../lib/product";
import { useResource } from "../lib/useResource";
import { textSegments } from "../lib/reading";
import { useFeedback } from "../components/Feedback";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "react-i18next";
export function LiveReadingPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useApp();
  const { hasEntitlement } = useSubscription();
  const canGenerate = hasEntitlement("reading.ai");
  const { confirm, toast } = useFeedback();
  const [topic, setTopic] = useState(profile.interests[0] || "");
  const [language, setLanguage] = useState(
    profile.languages[0]?.languageCode || "en",
  );
  const [level, setLevel] = useState("");
  const [length, setLength] = useState("short");
  const [contentType, setContentType] = useState("article");
  const [preview, setPreview] = useState<z.infer<typeof readingPreview>>();
  const [reading, setReading] = useState<Reading>();
  const [pending, setPending] = useState<Intent>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string>();
  const historyUrl = `reading${query({ limit: "10", cursor })}`;
  const history = useResource(
    useCallback(() => product(page(readingSummary), historyUrl), [historyUrl]),
  );
  const quota = useResource(
    useCallback(
      () =>
        product(
          z.object({
            quota: z
              .object({
                limit: z.number().int(),
                used: z.number().int(),
                remaining: z.number().int(),
                period: z.enum(["trial", "month"]),
                resetsAt: z.string().datetime().nullable(),
              })
              .nullable(),
          }),
          "reading/quota",
        ),
      [],
    ),
  );
  const generate = async () => {
    if (!canGenerate) {
      setError(t("reading.proRequired"));
      return;
    }
    setBusy(true);
    setError("");
    setReading(undefined);
    setPreview(undefined);
    setPending(undefined);
    try {
      const result = await product(readingPreview, "reading/preview", "POST", {
        targetLanguageCode: language,
        ...(topic.trim() ? { topic } : {}),
        ...(level ? { requestedLevel: level } : {}),
        contentType,
        lengthPreset: length,
      });
      setPreview(result);
      await quota.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const open = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    const submission =
      pending || intent({ publicationToken: preview.publicationToken });
    setPending(submission);
    try {
      const result = await product(
        z.object({ reading: readingSchema }),
        "reading",
        "POST",
        submission.body,
        submission.eventId,
      );
      setReading(result.reading);
      setPreview(undefined);
      setPending(undefined);
      await history.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const view = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await product(
        z.object({ reading: readingSchema }),
        `reading/${id}`,
      );
      setReading(result.reading);
      setPreview(undefined);
      setPending(undefined);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    const approved = await confirm({
      title: t("reading.removeTitle"),
      message: t("reading.removeDescription"),
      confirmLabel: t("reading.removeConfirm"),
      tone: "danger",
    });
    if (!approved) return;
    setBusy(true);
    setError("");
    try {
      await product(z.object({ id: uuid }), `reading/${id}`, "DELETE");
      if (reading?.id === id) setReading(undefined);
      await history.reload();
      toast(t("reading.removed"), { tone: "success" });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="reading-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("reading.eyebrow")}</p>
          <h1>{t("reading.title")}</h1>
          <p>{t("reading.description")}</p>
        </div>
        <BookOpenText size={36} />
      </section>
      <div className="live-two-columns">
        <section className="live-panel form-stack">
          <h2>{t("reading.promptTitle")}</h2>
          <fieldset
            disabled={
              busy ||
              !!pending ||
              !canGenerate ||
              quota.data?.quota?.remaining === 0
            }
            className="plain-fieldset form-stack"
          >
            <label className="field">
              <span>{t("reading.topic")}</span>
              <input
                maxLength={500}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("reading.topicPlaceholder")}
              />
            </label>
            <label className="field">
              <span>{t("reading.language")}</span>
              <input
                maxLength={64}
                dir="ltr"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </label>
            <div className="live-form-grid">
              <label className="field">
                <span>{t("reading.level")}</span>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="">{t("reading.effectiveLevel")}</option>
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("reading.length")}</span>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                >
                  <option value="short">{t("reading.short")}</option>
                  <option value="medium">{t("reading.medium")}</option>
                  <option value="long">{t("reading.long")}</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>{t("reading.contentType")}</span>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
              >
                {["article", "story", "essay", "news_style", "other"].map((k) => (
                  <option key={k} value={k}>
                    {t(`reading.types.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={!language.trim()}
              onClick={() => void generate()}
            >
              <Sparkles size={17} />
              {busy ? t("reading.preparing") : t("reading.createPreview")}
            </button>
          </fieldset>
          <p className="muted-note">
            {canGenerate && quota.data?.quota
              ? t(
                  quota.data.quota.period === "trial"
                    ? "reading.trialQuota"
                    : "reading.quota",
                  {
                    remaining: quota.data.quota.remaining,
                    limit: quota.data.quota.limit,
                  },
                )
              : !canGenerate
                ? t("reading.lockedQuota")
                : t("reading.loadingQuota")}
          </p>
          <p className="muted-note">{t("reading.providerNote")}</p>
        </section>
        <section className="live-panel">
          <h2>{t("reading.history")}</h2>
          <RemoteState
            loading={history.loading}
            error={history.error}
            retry={() => void history.reload()}
          />
          {history.data?.items.map((r) => (
            <div className="live-toolbar" key={r.id}>
              <button
                className="button ghost"
                disabled={busy}
                onClick={() => void view(r.id)}
              >
                {r.title}
              </button>
              <small>
                {r.targetLanguageCode} ·{" "}
                {new Date(r.openedAt).toLocaleDateString(i18n.resolvedLanguage)}
              </small>
              <button
                className="button ghost danger-text"
                disabled={busy}
                onClick={() => void remove(r.id)}
              >
                {t("reading.remove")}
              </button>
            </div>
          ))}
          {history.data && !history.data.items.length && (
            <p>{t("reading.emptyHistory")}</p>
          )}
          {history.data?.nextCursor && (
            <button
              className="button ghost"
              onClick={() => setCursor(history.data!.nextCursor!)}
            >
              {t("reading.more")}
            </button>
          )}
        </section>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="live-panel">
          <p className="eyebrow">{t("reading.ready")}</p>
          <h2>{preview.reading.title}</h2>
          <p>
            {t("reading.previewWords", { count: preview.reading.targets.length })} ·{" "}
            {preview.reading.effectiveLevel || t("reading.noLevelSet")} ·{" "}
            {preview.provider.name}
          </p>
          <small>
            {t("reading.validUntil", { time: new Date(preview.expiresAt).toLocaleTimeString(i18n.resolvedLanguage) })}
          </small>
          <p>{t("reading.openNote")}</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void open()}
          >
            {pending ? t("reading.retryOpen") : t("reading.open")}
          </button>
        </section>
      )}
      {reading && (
        <article className="live-panel live-reading">
          <p className="eyebrow">
            {reading.targetLanguageCode} · {reading.effectiveLevel || t("reading.noLevel")}
          </p>
          <h2 dir="auto">{reading.title}</h2>
          <div
            className="live-reading-body"
            dir="auto"
            lang={reading.targetLanguageCode}
          >
            {textSegments(reading).map((segment, index) =>
              segment.itemId ? (
                <Link
                  className="reading-word"
                  key={index}
                  to={`/vocabulary?item=${segment.itemId}`}
                  title={t("reading.openWord")}
                >
                  {segment.text}
                </Link>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </div>
          <p>{t("reading.noXp")}</p>
          <Link
            className="button primary"
            to={`/learn/session/article_quiz?reading=${reading.id}`}
          >
            {t("reading.practiceWords")}
          </Link>
        </article>
      )}
    </div>
  );
}
