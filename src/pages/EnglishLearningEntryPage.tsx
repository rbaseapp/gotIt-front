import { useCallback } from "react";
import { ApiError } from "../lib/api";
import { curriculumApi } from "../lib/structuredEnglish";
import { useResource } from "../lib/useResource";
import { RemoteState } from "../components/RemoteState";
import { EnglishLearningPathPage } from "./EnglishLearningPathPage";
import { StructuredEnglishPage } from "./StructuredEnglishPage";

/** Select the published content source; both use the existing program UI. */
export function EnglishLearningEntryPage() {
  const source = useResource(
    useCallback(async () => {
      try {
        return (await curriculumApi.catalog()).programs.length > 0;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return false;
        throw error;
      }
    }, []),
  );
  if (source.loading || source.error)
    return (
      <div className="english-path-page live-page">
        <RemoteState
          loading={source.loading}
          error={source.error}
          retry={() => void source.reload()}
        />
      </div>
    );
  return source.data ? <StructuredEnglishPage /> : <EnglishLearningPathPage />;
}
