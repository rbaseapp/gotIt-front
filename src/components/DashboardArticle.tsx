import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSubscription } from "../context/SubscriptionContext";
import { RemoteState } from "./RemoteState";
import {
  errorMessage,
  intent,
  product,
  readingPreview,
  readingSchema,
  type Intent,
  type Reading,
  type Item,
} from "../lib/product";
import { textSegments } from "../lib/reading";

export function DashboardArticle({
  language,
  words,
  inactive,
  interests,
  loading,
  error,
  reload,
}: {
  language: string;
  words: Item[];
  inactive: boolean;
  interests: string[];
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  const { t } = useTranslation();
  const { hasEntitlement } = useSubscription();
  const [topic, setTopic] = useState(interests[0] ?? "");
  const [custom, setCustom] = useState(false);
  const [selected, setSelected] = useState(() =>
    words.slice(0, 6).map((word) => word.id),
  );
  const [preview, setPreview] = useState<z.infer<typeof readingPreview>>();
  const [saved, setSaved] = useState<Reading>();
  const [publication, setPublication] = useState<Intent>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [generation, setGeneration] = useState(false);
  const generate = async () => {
    if (busy || !language || loading || error) return;
    setBusy(true);
    setFailure("");
    setGeneration(true);
    try {
      const result = await product(readingPreview, "reading/preview", "POST", {
        targetLanguageCode: language,
        ...(selected.length ? { learningItemIds: selected } : {}),
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        contentType: "article",
        lengthPreset: "short",
      });
      setPreview(result);
      setSaved(undefined);
      setPublication(undefined);
    } catch (reason) {
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setFailure("");
    setGeneration(false);
    const submission =
      publication ?? intent({ publicationToken: preview.publicationToken });
    setPublication(submission);
    try {
      const result = await product(
        z.object({ reading: readingSchema }),
        "reading",
        "POST",
        submission.body,
        submission.eventId,
      );
      setSaved(result.reading);
      setPreview(undefined);
      setPublication(undefined);
    } catch (reason) {
      setFailure(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const reading = saved ?? preview?.reading;
  const topics = [
    ...new Set([
      ...interests.slice(0, 3),
      ...["technology", "series", "travel", "food"].map((key) =>
        t(`newDashboard.topics.${key}`),
      ),
    ]),
  ].slice(0, 4);
  return (
    <section className="nd-article nd-card" aria-labelledby="nd-article-title">
      <header className="nd-card-heading">
        <span className="nd-square gold">
          <Sparkles size={22} />
        </span>
        <div>
          <h2 id="nd-article-title">
            {t(
              inactive
                ? "newDashboard.inactiveArticle"
                : "newDashboard.articleTitle",
            )}{" "}
            <small className="nd-ai">AI</small>
          </h2>
          <p>{t("newDashboard.articleHelp")}</p>
        </div>
      </header>
      {!reading && (
        <>
          <fieldset disabled={busy || loading || !!error}>
            <legend>{t("newDashboard.articleTopic")}</legend>
            <div className="nd-topic-options">
              {topics.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={!custom && topic === value}
                  onClick={() => {
                    setCustom(false);
                    setTopic(value);
                  }}
                >
                  {value}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={custom}
                onClick={() => {
                  setCustom(true);
                  setTopic("");
                }}
              >
                {t("newDashboard.customTopic")}
              </button>
            </div>
            {custom && (
              <label className="nd-custom-topic">
                <span>{t("newDashboard.articleTopic")}</span>
                <input
                  value={topic}
                  maxLength={500}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </label>
            )}
          </fieldset>
          <fieldset disabled={busy || loading || !!error}>
            <legend>
              {t("newDashboard.articleWords", { count: selected.length })}
            </legend>
            <div className="nd-word-options">
              {words.slice(0, 8).map((word) => (
                <button
                  key={word.id}
                  type="button"
                  dir="auto"
                  aria-pressed={selected.includes(word.id)}
                  onClick={() =>
                    setSelected((ids) =>
                      ids.includes(word.id)
                        ? ids.filter((id) => id !== word.id)
                        : [...ids, word.id],
                    )
                  }
                >
                  {word.sourceText}
                </button>
              ))}
            </div>
            {!words.length && !loading && !error && (
              <p>{t("newDashboard.articleNoWords")}</p>
            )}
          </fieldset>
          {hasEntitlement("reading.ai") ? (
            <button
              className="nd-button gold"
              disabled={
                busy ||
                loading ||
                !!error ||
                !language ||
                (custom && !topic.trim())
              }
              onClick={() => void generate()}
            >
              <Sparkles size={18} />
              {t("newDashboard.writeArticle")}
            </button>
          ) : (
            <Link className="nd-button gold" to="/billing">
              {t("reading.proRequired")}
            </Link>
          )}
          <p className="nd-fine-print">{t("newDashboard.articleNote")}</p>
        </>
      )}
      {reading && (
        <article
          className="nd-reader"
          dir="auto"
          lang={reading.targetLanguageCode}
        >
          <h3>{reading.title}</h3>
          <div className="nd-reading-text">
            {textSegments(reading).map((part, index) =>
              part.itemId ? (
                <mark
                  key={index}
                  title={
                    reading.targets.find((target) => target.id === part.itemId)
                      ?.translationText
                  }
                >
                  {part.text}
                </mark>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )}
          </div>
        </article>
      )}
      {preview && (
        <button
          className="nd-button gold"
          disabled={busy}
          onClick={() => void save()}
        >
          {t("newDashboard.saveArticle")}
        </button>
      )}
      {saved && (
        <>
          <p role="status">{t("newDashboard.articleSaved")}</p>
          <Link
            className="nd-button gold"
            to={`/learn/session/article_quiz?${new URLSearchParams({ reading: saved.id, language, return: "/dashboard" })}`}
          >
            {t("newDashboard.articleQuiz")}
          </Link>
        </>
      )}
      <RemoteState
        loading={loading || busy}
        error={error || failure}
        retry={() => void (error ? reload() : generation ? generate() : save())}
      />
      <Link
        className="nd-text-link"
        to={`/reading?${new URLSearchParams({ language })}`}
      >
        {t("ux.reading")}
      </Link>
    </section>
  );
}
