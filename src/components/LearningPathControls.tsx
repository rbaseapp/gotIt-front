import { useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";
import "../path-choices.css";

export type PathChoiceItem = {
  key: string;
  title: string;
  complete: boolean;
  skipped: boolean;
};
export type PathChoiceControl = {
  busy: boolean;
  error?: string;
  onChoice: (skipped: boolean, key?: string) => Promise<void>;
};
function ChoiceMenu({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <div
      className="path-choice-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="path-choice-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="path-choice-options">
          {children(() => {
            setOpen(false);
            trigger.current?.focus();
          })}
        </div>
      )}
    </div>
  );
}

/** A secondary action in an existing stage, without a second stage list. */
export function PathStepChoice({
  item,
  busy,
  onChoice,
}: PathChoiceControl & { item: PathChoiceItem }) {
  const { t } = useTranslation();
  if (item.complete) return null;
  const label = t(item.skipped ? "pathChoices.restore" : "pathChoices.skip");
  return (
    <ChoiceMenu label={`${label}: ${item.title}`}>
      {(close) => (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            close();
            void onChoice(!item.skipped, item.key);
          }}
        >
          {label}
        </button>
      )}
    </ChoiceMenu>
  );
}

/** Unit options live in the existing map heading. */
export function LearningPathControls({
  title,
  items,
  busy,
  onChoice,
}: PathChoiceControl & {
  title: string;
  items: PathChoiceItem[];
}) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  const remaining = items.filter(
    (item) => !item.complete && !item.skipped,
  ).length;
  const skipped = items.some((item) => item.skipped && !item.complete);
  if (!remaining && !skipped) return null;
  return (
    <>
      <ChoiceMenu label={`${t("pathChoices.chooseStep")}: ${title}`}>
        {(close) => (
          <>
            {remaining > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  close();
                  setConfirm(true);
                }}
              >
                {t("pathChoices.skipUnit")}
              </button>
            )}
            {skipped && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  close();
                  void onChoice(false);
                }}
              >
                {t("pathChoices.restoreUnit")}
              </button>
            )}
          </>
        )}
      </ChoiceMenu>
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
            {t("feedback.cancel")}
          </button>
        </div>
      </Modal>
    </>
  );
}
