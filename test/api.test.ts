import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, clearTokens, setTokens } from "../src/lib/api";
import { seedProfile } from "../src/data/seed";

const tokens = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  expiresIn: 900,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
afterEach(clearTokens);
describe("API token lifecycle and safe failures", () => {
  it("single-flights refresh rotation for concurrent requests after a reload", async () => {
    clearTokens();
    sessionStorage.setItem("gotit.refresh", "stored-refresh");
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json({
          ...tokens,
          accessToken: "new-access",
          refreshToken: "rotated-refresh",
        });
      }
      return json({ profile: seedProfile });
    });
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([api.getProfile(), api.getProfile()]);
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
    ).toHaveLength(1);
    expect(localStorage.getItem("gotit.refresh")).toBe("rotated-refresh");
    expect(sessionStorage.getItem("gotit.refresh")).toBeNull();
  });
  it("restores a rotated session after the browser tab closes", async () => {
    clearTokens();
    setTokens(tokens);
    expect(localStorage.getItem("gotit.refresh")).toBe("old-refresh");
    sessionStorage.clear();
    vi.resetModules();
    const reopened = await import("../src/lib/api");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("/auth/refresh");
      expect(JSON.parse(String(init?.body))).toEqual({
        refreshToken: "old-refresh",
      });
      return json({ ...tokens, refreshToken: "rotated-refresh" });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(reopened.hasStoredSession()).toBe(true);
    await reopened.api.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("gotit.refresh")).toBe("rotated-refresh");
    reopened.clearTokens();
  });
  it("uses a refresh token rotated by another tab", async () => {
    clearTokens();
    setTokens(tokens);
    localStorage.setItem("gotit.refresh", "other-tab-refresh");
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        refreshToken: "other-tab-refresh",
      });
      return json({ ...tokens, refreshToken: "new-refresh" });
    });
    vi.stubGlobal("fetch", fetchMock);
    await api.refresh();
    expect(localStorage.getItem("gotit.refresh")).toBe("new-refresh");
  });
  it("retries once when another tab rotates during refresh", async () => {
    clearTokens();
    setTokens(tokens);
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const submitted = JSON.parse(String(init?.body)).refreshToken;
      if (submitted === "old-refresh") {
        localStorage.setItem("gotit.refresh", "other-tab-refresh");
        return json({ error: { code: "INVALID_REFRESH_TOKEN" } }, 401);
      }
      expect(submitted).toBe("other-tab-refresh");
      return json({ ...tokens, refreshToken: "new-refresh" });
    });
    vi.stubGlobal("fetch", fetchMock);
    await api.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("gotit.refresh")).toBe("new-refresh");
  });
  it("retries a protected 401 once with a fresh access token", async () => {
    clearTokens();
    setTokens(tokens);
    let profileCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh"))
        return json({ ...tokens, accessToken: "new-access" });
      profileCalls++;
      if (profileCalls === 1)
        return json({ error: { code: "UNAUTHORIZED" } }, 401);
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer new-access",
      });
      return json({ profile: seedProfile });
    });
    vi.stubGlobal("fetch", fetchMock);
    await api.getProfile();
    expect(profileCalls).toBe(2);
  });
  it("never retries forever when a fresh token is rejected", async () => {
    clearTokens();
    setTokens(tokens);
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/auth/refresh")
        ? json(tokens)
        : json({ error: { code: "UNAUTHORIZED" } }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.getProfile()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("does not revive a session after a pending refresh completes following logout", async () => {
    clearTokens();
    sessionStorage.setItem("gotit.refresh", "old-refresh");
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveResponse = resolve;
          }),
      ),
    );
    const refresh = api.refresh();
    clearTokens();
    resolveResponse(json(tokens));
    await expect(refresh).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem("gotit.refresh")).toBeNull();
    expect(localStorage.getItem("gotit.refresh")).toBeNull();
  });
  it("handles logout 204 and clears local credentials even on service failure", async () => {
    clearTokens();
    setTokens(tokens);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await api.logout();
    expect(sessionStorage.getItem("gotit.refresh")).toBeNull();
    expect(localStorage.getItem("gotit.refresh")).toBeNull();
    setTokens(tokens);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("private network diagnostics");
      }),
    );
    await expect(api.logout()).rejects.toBeInstanceOf(ApiError);
    expect(sessionStorage.getItem("gotit.refresh")).toBeNull();
    expect(localStorage.getItem("gotit.refresh")).toBeNull();
  });
  it("allows pronunciation assessment latency and reports a timeout distinctly", async () => {
    clearTokens();
    setTokens(tokens);
    const aborted = AbortSignal.abort(
      new DOMException("Timed out", "TimeoutError"),
    );
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(aborted);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Timed out", "TimeoutError");
      }),
    );

    await expect(
      api.product("pronunciation/assessments", "POST", {
        audioBase64: "audio",
      }),
    ).rejects.toMatchObject({
      status: 0,
      code: "REQUEST_TIMEOUT",
    });
    expect(timeout).toHaveBeenCalledWith(60000);
  });
  it("allows Sol lesson preparation time and reports a timeout before opening a session", async () => {
    clearTokens();
    setTokens(tokens);
    const aborted = AbortSignal.abort(
      new DOMException("Timed out", "TimeoutError"),
    );
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(aborted);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Timed out", "TimeoutError");
      }),
    );

    await expect(
      api.product("private-lessons/realtime-sessions", "POST", {
        targetLanguageCode: "en",
      }),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
    expect(timeout).toHaveBeenCalledWith(90000);
    await expect(
      api.product("courses/intake", "POST", {}),
    ).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
    });
    expect(timeout).toHaveBeenCalledWith(120000);
  });
  it("never exposes raw internal server messages and rejects malformed success responses", async () => {
    clearTokens();
    setTokens(tokens);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "database password leaked",
            },
          },
          500,
        ),
      ),
    );
    await expect(api.getProfile()).rejects.toThrow(
      "השירות אינו זמין זמנית. נסו שוב.",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ profile: {} })),
    );
    await expect(api.getProfile()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
