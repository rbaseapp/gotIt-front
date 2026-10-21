import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api, clearTokens, setTokens } from "../src/lib/api";
import {
  cachedResource,
  invalidateResourceCache,
  loadResource,
  resourceKey,
} from "../src/lib/resourceCache";
import { useCachedResource } from "../src/lib/useCachedResource";

const owner = { applicationId: "gotit", id: "learner-a" };
const key = (path = "courses") => resourceKey(owner, path);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  vi.restoreAllMocks();
  clearTokens();
});

it("prefetches once and paints real content synchronously after route remount", async () => {
  const load = vi.fn().mockResolvedValue({ courses: ["owned-course"] });
  await loadResource(cachedResource(key()), load);
  const first = renderHook(() => useCachedResource(load, key()));
  expect(first.result.current.data).toEqual({ courses: ["owned-course"] });
  expect(first.result.current.loading).toBe(false);
  first.unmount();
  const second = renderHook(() => useCachedResource(load, key()));
  expect(second.result.current.data).toEqual({ courses: ["owned-course"] });
  expect(second.result.current.loading).toBe(false);
  expect(load).toHaveBeenCalledTimes(1);
});

it("coalesces prefetch and concurrent mounted consumers", async () => {
  const request = deferred<string>();
  const load = vi.fn(() => request.promise);
  const prefetch = loadResource(cachedResource<string>(key()), load);
  const first = renderHook(() => useCachedResource(load, key()));
  const second = renderHook(() => useCachedResource(load, key()));
  await act(async () => {
    request.resolve("server");
    await prefetch;
  });
  expect(load).toHaveBeenCalledTimes(1);
  expect(first.result.current.data).toBe("server");
  expect(second.result.current.data).toBe("server");
});

it("keeps cards visible while stale data revalidates and reports refresh failures", async () => {
  const load = vi.fn().mockResolvedValue("saved words");
  const entry = cachedResource<string>(key("words?language=en"));
  await loadResource(entry, load);
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 31_000);
  const refresh = deferred<string>();
  load.mockImplementation(() => refresh.promise);
  const hook = renderHook(() =>
    useCachedResource(load, key("words?language=en")),
  );
  expect(hook.result.current.data).toBe("saved words");
  expect(hook.result.current.loading).toBe(false);
  await act(async () => {
    refresh.reject(new Error("offline"));
  });
  expect(hook.result.current.data).toBe("saved words");
  expect(hook.result.current.error).toBeTruthy();
  expect(hook.result.current.loading).toBe(false);
});

it("never paints a previous account, language, filter or page on key changes", async () => {
  const load = vi.fn(() => new Promise<string>(() => {}));
  const original = key("words?language=en&page=1");
  await loadResource(cachedResource(original), async () => "English account A");
  const hook = renderHook(({ cacheKey }) => useCachedResource(load, cacheKey), {
    initialProps: { cacheKey: original },
  });
  expect(hook.result.current.data).toBe("English account A");
  for (const next of [
    key("words?language=ar&page=1"),
    key("words?language=en&page=2"),
    key("words?language=en&search=hello"),
    resourceKey({ ...owner, id: "learner-b" }, "words?language=en&page=1"),
  ]) {
    hook.rerender({ cacheKey: next });
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.loading).toBe(true);
  }
});

it("a successful mutation invalidates snapshots and ignores earlier in-flight reads", async () => {
  setTokens({ accessToken: "test", refreshToken: "test", expiresIn: 3600 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ saved: true }))),
  );
  const old = deferred<string>();
  const load = vi
    .fn()
    .mockImplementationOnce(() => old.promise)
    .mockResolvedValue("after mutation");
  const hook = renderHook(() => useCachedResource(load, key()));
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await act(async () => {
    await api.product("learning-items/bulk", "POST", { action: "delete" });
  });
  await waitFor(() => expect(hook.result.current.data).toBe("after mutation"));
  await act(async () => {
    old.resolve("before mutation");
  });
  expect(hook.result.current.data).toBe("after mutation");
});

it("session reset removes private snapshots and late responses cannot restore them", async () => {
  const old = deferred<string>();
  const entry = cachedResource<string>(key());
  const pending = loadResource(entry, () => old.promise);
  await Promise.resolve();
  clearTokens();
  old.resolve("private old account");
  await pending;
  expect(entry.state.data).toBeUndefined();
  expect(cachedResource<string>(key()).state.data).toBeUndefined();
});

it("artwork lookup leaves learning snapshots intact and failed writes do not invalidate", async () => {
  setTokens({ accessToken: "test", refreshToken: "test", expiresIn: 3600 });
  const entry = cachedResource<string>(key());
  await loadResource(entry, async () => "courses");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ image: null }))),
  );
  await api.product("courses/artwork/lookup", "POST", { kind: "path" });
  expect(entry.state.data).toBe("courses");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR" } }), {
          status: 400,
        }),
    ),
  );
  await expect(
    api.product("learning-items/bulk", "POST", {}),
  ).rejects.toThrow();
  expect(entry.state.data).toBe("courses");
  invalidateResourceCache();
  expect(entry.state.data).toBeUndefined();
});
