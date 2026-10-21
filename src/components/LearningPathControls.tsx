import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";
import "../path-choices.css";

export type PathChoiceItem = {
  key: string;
  title: string;
  complete: boolean;
  skipped: boolean;
  href?: string;
  onOpen?: () => void;
  unavailable?: string;
  recommendation?: string;
};
export function LearningPathControls({
  title,
  items,
  busy,
  error,
  onChoice,
}: {
  title: string;
  items: PathChoiceItem[];
  busy: boolean;
  error?: string;
  onChoice: (skipped: boolean, key?: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  const skipped = items.filter((item) => item.skipped).length;
  const complete = items.filter((item) => item.complete).length;
  const remaining = items.length - complete - skipped;
  return (
    <section
      className="path-choices ux-card"
      aria-label={title}
      aria-busy={busy}
    >
      <header>
        <h2 dir="auto">{title}</h2>
        {remaining > 0 ? (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            {t("pathChoices.skipUnit")}
          </button>
        ) : skipped > 0 ? (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void onChoice(false)}
          >
            {t("pathChoices.restoreUnit")}
          </button>
        ) : null}
      </header>
      <p>{t("pathChoices.help")}</p>
      <p role="status">
        {t("pathChoices.summary", { complete, skipped, remaining })}
      </p>
      {remaining === 0 && <p>{t("pathChoices.routeEnd")}</p>}
      {error && <p role="alert">{error}</p>}
      <ol>
        {items.map((item) => (
          <li key={item.key}>
            <div>
              <strong dir="auto">{item.title}</strong>
              <small>
                {t(
                  item.complete
                    ? "pathChoices.completed"
                    : item.skipped
                      ? "pathChoices.skipped"
                      : "pathChoices.pending",
                )}
              </small>
              {item.recommendation && <small>{item.recommendation}</small>}
              {!item.href && item.unavailable && (
                <small>{item.unavailable}</small>
              )}
            </div>
            <div className="path-choice-actions">
              {item.href && (
                <Link className="button secondary" to={item.href}>
                  {t("pathChoices.startHere")}
                </Link>
              )}
              {item.onOpen && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={item.onOpen}
                >
                  {t("pathChoices.startHere")}
                </button>
              )}
              {!item.complete && (
                <button
                  type="button"
                  className="button ghost"
                  disabled={busy}
                  onClick={() => void onChoice(!item.skipped, item.key)}
                  aria-label={`${t(item.skipped ? "pathChoices.restore" : "pathChoices.skip")}: ${item.title}`}
                >
                  {t(item.skipped ? "pathChoices.restore" : "pathChoices.skip")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <Modal
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={t("pathChoices.confirmTitle")}
      >
        <div className="modal-body">
          <p>{t("pathChoices.confirmBody", { count: remaining })}</p>
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={async () => {
              await onChoice(true);
              setConfirm(false);
            }}
          >
            {t("pathChoices.skipUnit")}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            {t("common.cancel")}
          </button>
        </div>
      </Modal>
    </section>
  );
}
