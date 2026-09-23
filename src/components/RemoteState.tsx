import { useTranslation } from "react-i18next";

export function RemoteState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {loading && (
        <p role="status" className="remote-status">
          {t("common.loadingFromServer")}
        </p>
      )}
      {error && (
        <div role="alert" className="form-error">
          {error}
          <button type="button" className="button ghost" onClick={retry}>
            {t("common.tryAgain")}
          </button>
        </div>
      )}
    </>
  );
}
