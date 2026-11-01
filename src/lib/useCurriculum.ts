import { useCallback } from "react";
import { useApp } from "../context/AppContext";
import { resourceKey } from "./resourceCache";
import { curriculumApi } from "./structuredEnglish";
import { useCachedResource } from "./useCachedResource";

/** Cache key of the learner's curriculum state, shared by every screen that reads it. */
export const curriculumKey = (
  user: { applicationId: string; id: string } | null,
) => resourceKey(user, "curriculum");

/**
 * The learner's curriculum state. The entry gate, the home mission and the path all read it;
 * through the shared cache they make one request instead of one each.
 */
export function useCurriculum() {
  const { user } = useApp();
  return useCachedResource(
    useCallback(() => curriculumApi.get(), []),
    curriculumKey(user),
  );
}
