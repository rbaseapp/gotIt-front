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
    expect(sessionStorage.getItem("gotit.refresh")).toBe("rotated-refresh");
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
    setTokens(tokens);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("private network diagnostics");
      }),
    );
    await expect(api.logout()).rejects.toBeInstanceOf(ApiError);
    expect(sessionStorage.getItem("gotit.refresh")).toBeNull();
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
