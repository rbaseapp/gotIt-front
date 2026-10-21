import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { errorMessage } from "./product";
import { cachedResource, loadResource } from "./resourceCache";

export function useCachedResource<T>(load: () => Promise<T>, cacheKey: string) {
  const entry = useMemo(() => cachedResource<T>(cacheKey), [cacheKey]);
  const subscribe = useCallback(
    (listener: () => void) => {
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },
    [entry],
  );
  const state = useSyncExternalStore(subscribe, () => entry.state);
  const reload = useCallback(
    () => loadResource(entry, load, true),
    [entry, load],
  );
  useEffect(() => {
    void loadResource(entry, load);
  }, [entry, load, state.revision]);
  return {
    data: state.data,
    error: state.error === undefined ? "" : errorMessage(state.error),
    loading: state.data === undefined && state.error === undefined,
    refreshing: state.pending,
    reload,
  };
}
