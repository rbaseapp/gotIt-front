import { useCallback, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { firstRunSkipped } from "../../lib/onboarding/firstRun";
import { curriculumApi } from "../../lib/structuredEnglish";
import { useResource } from "../../lib/useResource";

/**
 * The first time a learner enters their account (from sign-in or the landing
 * page) and they have no level yet, they land on the short level check instead of
 * an empty dashboard. Deep links, learners with progress and learners who chose
 * "not now" are never interrupted.
 */
export function FirstRunGate({ children }: { children: ReactNode }) {
  const { mode, user } = useApp();
  const { pathname } = useLocation();
  const live = mode === "live" && Boolean(user);
  const curriculum = useResource(
    useCallback(
      () => (live ? curriculumApi.get() : Promise.resolve(null)),
      [live],
    ),
  );
  const entry = pathname === "/" || pathname === "/dashboard";
  if (!live || !entry) return <>{children}</>;
  if (curriculum.loading && !curriculum.data)
    return (
      <div className="empty-session" role="status">
        <LoaderCircle className="spin" size={30} />
      </div>
    );
  const data = curriculum.data;
  const needsCheck =
    data &&
    !data.onboarding &&
    Object.keys(data.completed ?? {}).length === 0 &&
    !firstRunSkipped(user!.id);
  return needsCheck ? <Navigate to="/start" replace /> : <>{children}</>;
}
