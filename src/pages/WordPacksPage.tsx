import { useCallback, useMemo, useState } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Layers3,
  Play,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RemoteState } from "../components/RemoteState";
import { useFeedback } from "../components/Feedback";
import { useSubscription } from "../context/SubscriptionContext";
import {
  errorMessage,
  product,
  wordPackAddReceiptSchema,
  wordPackRemoveReceiptSchema,
  wordPacksSchema,
  type WordPack,
} from "../lib/product";
import { useResource } from "../lib/useResource";

const levelLabels = {
  beginner: "מתחילים",
  intermediate: "בינוניים",
  advanced: "מתקדמים",
};

export function WordPacksPage() {
  const packs = useResource(
    useCallback(() => product(wordPacksSchema, "word-packs"), []),
  );
  const { hasEntitlement } = useSubscription();
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string>();
  const grouped = useMemo(() => {
    const groups = new Map<string, { title: string; packs: WordPack[] }>();
    for (const pack of packs.data?.packs || []) {
      const current = groups.get(pack.track.id) || {
        title: pack.track.title,
        packs: [],
      };
      current.packs.push(pack);
      groups.set(pack.track.id, current);
    }
    return [...groups.values()];
  }, [packs.data]);

  const add = async (pack: WordPack) => {
    if (!hasEntitlement("vocabulary.write")) {
      navigate("/billing");
      return;
    }
    setBusy(pack.id);
    try {
      const receipt = await product(
        wordPackAddReceiptSchema,
        `word-packs/${pack.id}/add`,
        "POST",
      );
      toast(
        `המאגר נוסף: ${receipt.added} מילים חדשות, ${receipt.linkedExisting} מילים שכבר היו בספרייה.`,
        { tone: "success" },
      );
      await packs.reload();
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  const remove = async (pack: WordPack, keepWords: boolean) => {
    const approved = await confirm({
      title: keepWords ? "הסרת שיוך המאגר" : "הסרת המאגר",
      message: keepWords
        ? "המאגר יוסר, אך כל המילים יישארו פעילות בספרייה שלך."
        : "מילים שהגיעו רק מהמאגר יעברו לארכיון. מילים ממקור נוסף והתקדמות הלימוד יישמרו.",
      confirmLabel: keepWords ? "הסר והשאר מילים" : "הסר מאגר",
      tone: keepWords ? "warning" : "danger",
    });
    if (!approved) return;
    setBusy(pack.id);
    try {
      const receipt = await product(
        wordPackRemoveReceiptSchema,
        `word-packs/${pack.id}?mode=${keepWords ? "keep_words" : "archive_exclusive"}`,
        "DELETE",
      );
      toast(
        keepWords
          ? `${receipt.retained} מילים נשארו בספרייה.`
          : `${receipt.archived} מילים עברו לארכיון ו־${receipt.retained} נשארו פעילות.`,
        { tone: "success" },
      );
      await packs.reload();
    } catch (reason) {
      toast(errorMessage(reason), { tone: "error" });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="word-packs-page live-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">מסלולי מילים לפי נושא ורמה</p>
          <h1>מאגרי מילים</h1>
          <p>הוסיפו יחידה לספרייה והתחילו סשן שמתרגל רק את מילות המאגר.</p>
        </div>
      </section>
      <RemoteState
        loading={packs.loading}
        error={packs.error}
        retry={() => void packs.reload()}
      />
      {grouped.map((group) => (
        <section className="pack-track" key={group.packs[0]!.track.id}>
          <div className="pack-track-heading">
            <span className="pack-track-icon">
              <BriefcaseBusiness size={22} />
            </span>
            <div>
              <h2>{group.title}</h2>
              <p>
                {levelLabels[group.packs[0]!.track.levelCode]} · CEFR{" "}
                {group.packs[0]!.track.cefrFrom}–{group.packs[0]!.track.cefrTo}
              </p>
            </div>
          </div>
          <div className="pack-grid">
            {group.packs.map((pack) => (
              <article
                className={`pack-card ${pack.installed ? "installed" : ""}`}
                key={pack.id}
              >
                <div className="pack-card-top">
                  <span className="pack-module">
                    <Layers3 size={16} /> יחידה {pack.moduleNumber}
                  </span>
                  {pack.installed && (
                    <span className="pack-installed">
                      <BookOpenCheck size={15} />
                      {pack.installedVersion !== pack.version
                        ? "עדכון זמין"
                        : "נוסף"}
                    </span>
                  )}
                </div>
                <h3>{pack.title}</h3>
                <p>{pack.description}</p>
                <div className="pack-counts">
                  <span>
                    <b>{pack.wordCount}</b> מילים
                  </span>
                  {pack.installed && (
                    <>
                      <span>
                        <b>{pack.progress.new}</b> חדשות
                      </span>
                      <span>
                        <b>{pack.progress.mastered}</b> נלמדו
                      </span>
                    </>
                  )}
                </div>
                {pack.installed ? (
                  <div className="pack-actions">
                    {pack.installedVersion !== pack.version && (
                      <button
                        className="button secondary"
                        disabled={busy === pack.id}
                        onClick={() => void add(pack)}
                      >
                        עדכון המאגר
                      </button>
                    )}
                    <Link
                      className="button primary"
                      to={`/learn/session/smart?pack=${pack.id}`}
                    >
                      <Play size={17} /> לימוד המאגר
                    </Link>
                    <details className="pack-manage">
                      <summary>ניהול מאגר</summary>
                      <button
                        className="button ghost"
                        disabled={busy === pack.id}
                        onClick={() => void remove(pack, true)}
                      >
                        הסר שיוך והשאר מילים
                      </button>
                      <button
                        className="button danger"
                        disabled={busy === pack.id}
                        onClick={() => void remove(pack, false)}
                      >
                        <Trash2 size={16} /> הסר מילים בלעדיות
                      </button>
                    </details>
                  </div>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy === pack.id}
                    onClick={() => void add(pack)}
                  >
                    {busy === pack.id
                      ? "מוסיף…"
                      : `הוסף ${pack.wordCount} מילים`}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!packs.loading && !packs.error && !grouped.length && (
        <section className="live-panel">
          <p>אין כרגע מאגרים זמינים לצמד השפות שלך.</p>
        </section>
      )}
    </div>
  );
}
