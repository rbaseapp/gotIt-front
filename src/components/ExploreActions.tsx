import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
export function ExploreActions() {
  const { t } = useTranslation();
  return (
    <div className="ux-explore">
      <Link className="button secondary" to="/private-lesson?practice=free">
        {t("ux.freeChat")}
      </Link>
      <Link className="button secondary" to="/reading">
        {t("ux.reading")}
      </Link>
    </div>
  );
}
