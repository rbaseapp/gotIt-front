// Short-lived, memory-only server snapshots, scoped by owner and complete query.
export type ResourceState<T> = {
  data?: T;
  error?: unknown;
  pending: boolean;
  updatedAt: number;
  revision: number;
};
export type ResourceEntry<T> = {
  state: ResourceState<T>;
  listeners: Set<() => void>;
  request?: Promise<void>;
  generation: number;
};
const entries = new Map<string, ResourceEntry<unknown>>();
let sessionVersion = 0;
export const resourceSessionVersion = () => sessionVersion;
const freshFor = 30_000;
const retainFor = 300_000;
export function resourceKey(
  user: { applicationId: string; id: string } | null | undefined,
  path: string,
) {
  return `${user?.applicationId}:${user?.id}:${path}`;
}
export function createResourceEntry<T>(): ResourceEntry<T> {
  return {
    state: { pending: false, updatedAt: 0, revision: 0 },
    listeners: new Set(),
    generation: 0,
  };
}
function publish<T>(entry: ResourceEntry<T>, state: ResourceState<T>) {
  entry.state = state;
  entry.listeners.forEach((listener) => listener());
}
export function cachedResource<T>(key: string): ResourceEntry<T> {
  let entry = entries.get(key);
  if (
    entry &&
    !entry.listeners.size &&
    !entry.request &&
    Date.now() - entry.state.updatedAt > retainFor
  ) {
    entries.delete(key);
    entry = undefined;
  }
  if (!entry) {
    for (const [oldKey, old] of entries) {
      if (entries.size < 100) break;
      if (!old.listeners.size && !old.request) entries.delete(oldKey);
    }
    entry = createResourceEntry();
    entries.set(key, entry);
  }
  return entry as ResourceEntry<T>;
}
export function loadResource<T>(
  entry: ResourceEntry<T>,
  load: () => Promise<T>,
  force = false,
) {
  if (entry.request) return entry.request;
  if (
    !force &&
    entry.state.data !== undefined &&
    Date.now() - entry.state.updatedAt < freshFor
  )
    return Promise.resolve();
  const generation = entry.generation;
  publish(entry, { ...entry.state, pending: true, error: undefined });
  const request = Promise.resolve()
    .then(() => {
      if (generation !== entry.generation)
        throw new Error("Resource invalidated");
      return load();
    })
    .then(
      (data) => {
        if (generation === entry.generation)
          publish(entry, {
            ...entry.state,
            data,
            error: undefined,
            pending: false,
            updatedAt: Date.now(),
          });
      },
      (error: unknown) => {
        if (generation === entry.generation)
          publish(entry, { ...entry.state, error, pending: false });
      },
    )
    .finally(() => {
      if (entry.request === request) entry.request = undefined;
    });
  entry.request = request;
  return request;
}
export function invalidateResourceCache(reset = false) {
  if (reset) sessionVersion++;
  for (const entry of entries.values()) {
    entry.generation++;
    entry.request = undefined;
    publish(entry, {
      data: !reset && entry.listeners.size ? entry.state.data : undefined,
      pending: false,
      updatedAt: 0,
      revision: entry.state.revision + (reset ? 0 : 1),
    });
  }
}
