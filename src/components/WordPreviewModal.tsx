import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";

export type WordPreview = {
  sourceText: string;
  translationText?: string | null;
};

export function WordPreviewModal({
  word,
  onClose,
}: {
  word: WordPreview | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={Boolean(word)}
      onClose={onClose}
      title={t("vocabulary.wordDetails")}
      size="sm"
    >
      {word && (
        <div className="modal-body word-preview">
          <b dir="auto">{word.sourceText}</b>
          <span dir="auto">
            {word.translationText || t("vocabulary.noMeaning")}
          </span>
        </div>
      )}
    </Modal>
  );
}
