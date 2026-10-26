import { useCallback, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import moochi from "../../assets/ux/dashboard-moohi.png";
import { useSubscription } from "../../context/SubscriptionContext";
import { curriculumApi } from "../../lib/structuredEnglish";
import { useResource } from "../../lib/useResource";
import "../../onboarding.css";

/** What is behind the paywall, and what stays free. Never a dead end. */
export function LockedFeature({ kind }: { kind: "courses" | "tutor" }) {
  const { t } = useTranslation();
  return (
    <div className="ob ob-lock" style={{ minHeight: 0 }}>
      <img className="ob-moochi" src={moochi} alt="" draggable={false} />
      <div className="ob-bubble">
        <h1>{t(`start.locked.${kind}.title`)}</h1>
        <p>{t(`start.locked.${kind}.body`)}</p>
      </div>
      <Link className="ob-btn yellow" to="/billing">
        {t("start.locked.upgrade")}
      </Link>
      <Link className="ob-link" to="/learn">
        {t("start.locked.free")}
      </Link>
    </div>
  );
}

/** Free conversation opens once the learner has a base: a goal to reach, not a wall. */
export function TutorLockCard({
  done,
  required,
}: {
  done: number;
  required: number;
}) {
  const { t } = useTranslation();
  const percent = required ? Math.round((done / required) * 100) : 0;
  return (
    <div className="ob ob-lock" style={{ minHeight: 0 }}>
      <img className="ob-moochi" src={moochi} alt="" draggable={false} />
      <div className="ob-bubble">
        <h1>{t("start.tutorLock.title")}</h1>
        <p>
          {t("start.tutorLock.body", { left: Math.max(0, required - done) })}
        </p>
      </div>
      <div
        className="ob-lock-bar"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={required}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>{t("start.tutorLock.progress", { done, required })}</small>
      <Link className="ob-btn" to="/english-learning">
        {t("start.tutorLock.go")}
      </Link>
    </div>
  );
}

/** Programs and courses: a paid or trial feature. */
export function CurriculumAccess({ children }: { children: ReactNode }) {
  const { status, loading, hasEntitlement } = useSubscription();
  if (loading) return <Loading />;
  return !status || hasEntitlement("curriculum.access") ? (
    <>{children}</>
  ) : (
    <LockedFeature kind="courses" />
  );
}

/** The map and unit words are open to everyone; learning in them is the paid part. */
export function PreviewBanner() {
  const { t } = useTranslation();
  const { status, hasEntitlement } = useSubscription();
  if (!status || hasEntitlement("curriculum.access")) return null;
  return (
    <div className="ob ob-today" style={{ minHeight: 0 }} role="status">
      <img src={moochi} alt="" draggable={false} />
      <div>
        <p>{t("start.locked.preview")}</p>
      </div>
      <Link className="ob-btn yellow" to="/billing">
        {t("start.locked.upgrade")}
      </Link>
    </div>
  );
}

/** Free conversation with the teacher: needs the plan, and a small base to talk from. */
export function TutorAccess({ children }: { children: ReactNode }) {
  const { status, loading, hasEntitlement } = useSubscription();
  const location = useLocation();
  const programLesson = /[?&](course|pack|curriculum)=/.test(location.search);
  const curriculum = useResource(useCallback(() => curriculumApi.get(), []));
  if (programLesson) return <>{children}</>;
  if (loading || (curriculum.loading && !curriculum.data)) return <Loading />;
  if (status && !hasEntitlement("tutor.session"))
    return <LockedFeature kind="tutor" />;
  const gate = curriculum.data?.tutor;
  if (gate && !gate.unlocked)
    return <TutorLockCard done={gate.done} required={gate.required} />;
  return <>{children}</>;
}

function Loading() {
  return (
    <div className="empty-session" role="status">
      <LoaderCircle className="spin" size={30} />
    </div>
  );
}
