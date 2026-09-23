import {
  parseProfile,
  parseTokens,
  parseUser,
  profilePayload,
} from "./contracts";
import type { AuthTokens, AuthUser, ProfilePatch } from "../types";
import i18n from "../i18n";

const coreUrl = (import.meta.env.VITE_CORE_API_URL || "/core-api").replace(
  /\/$/,
  "",
);
const productUrl = (import.meta.env.VITE_GOTIT_API_URL || "/gotit-api").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const messageCodes = new Set([
  "SUBSCRIPTION_REQUIRED",
  "AI_MONTHLY_LIMIT_REACHED",
  "BILLING_NOT_CONFIGURED",
  "INVALID_CREDENTIALS",
  "USER_ALREADY_EXISTS",
  "USER_DISABLED",
  "VALIDATION_ERROR",
  "INVALID_REFRESH_TOKEN",
  "INVALID_ACCESS_TOKEN",
  "UNAUTHORIZED",
  "CORE_AUTH_UNAVAILABLE",
  "FACEBOOK_AUTH_NOT_CONFIGURED",
  "FACEBOOK_TOKEN_INVALID",
  "FACEBOOK_EMAIL_REQUIRED",
  "SPEECH_NOT_CONFIGURED",
  "SPEECH_UNAVAILABLE",
  "AUDIO_INVALID",
  "SKILL_UNAVAILABLE",
  "READING_PROVIDER_AUTHENTICATION",
  "READING_PROVIDER_BILLING",
  "READING_PROVIDER_PERMISSION",
  "READING_PROVIDER_WORKSPACE",
  "READING_PROVIDER_MODEL_ACCESS",
  "READING_PROVIDER_RATE_LIMIT",
  "READING_PROVIDER_REQUEST_INVALID",
  "READING_PROVIDER_TIMEOUT",
  "READING_PROVIDER_RESPONSE_INVALID",
  "READING_PROVIDER_UPSTREAM",
]);

function localizedMessage(code: string): string {
  return messageCodes.has(code) ? i18n.t(`apiErrors.${code}`) : "";
}

async function request(
  base: string,
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
  eventId?: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/${path}`, {
      method,
      headers: {
        ...(base === coreUrl ? { "X-Application-Key": "gotit" } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-request-id": crypto.randomUUID(),
        ...(eventId ? { "Idempotency-Key": eventId } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(
        path.includes("/study/") && path.endsWith("/image")
          ? 120000
          : path.startsWith("reading") || path === "import"
            ? 75000
            : 20000,
      ),
      credentials: "omit",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", i18n.t("apiErrors.network"));
  }
  if (response.status === 204) return undefined;
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = payload as { error?: { code?: string } } | undefined;
    const code =
      typeof error?.error?.code === "string"
        ? error.error.code
        : "REQUEST_FAILED";
    throw new ApiError(
      response.status,
      code,
      localizedMessage(code) ||
        (response.status >= 500
          ? i18n.t("apiErrors.serverUnavailable")
          : i18n.t("apiErrors.requestFailed")),
    );
  }
  return payload;
}

function checked<T>(parser: (value: unknown) => T, payload: unknown): T {
  try {
    return parser(payload);
  } catch {
    throw new ApiError(
      502,
      "INVALID_RESPONSE",
      i18n.t("apiErrors.invalidResponse"),
    );
  }
}

let tokens: AuthTokens | null = null;
let expiresAt = 0;
let refreshPending: Promise<string> | null = null;
let generation = 0;
function storedRefresh() {
  try {
    return sessionStorage.getItem("gotit.refresh");
  } catch {
    return null;
  }
}

export function setTokens(value: AuthTokens) {
  tokens = value;
  expiresAt = Date.now() + value.expiresIn * 1000;
  try {
    sessionStorage.setItem("gotit.refresh", value.refreshToken);
  } catch {
    /* Memory-only session is still usable. */
  }
}
export function clearTokens() {
  generation++;
  tokens = null;
  expiresAt = 0;
  try {
    sessionStorage.removeItem("gotit.refresh");
    localStorage.removeItem("gotit.auth");
    localStorage.removeItem("gotit.demo");
  } catch {
    /* Storage may be blocked. */
  }
}

export const api = {
  async google(idToken: string): Promise<AuthUser> {
    if (!idToken || idToken.length > 16384)
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        i18n.t("apiErrors.invalidGoogleCredential"),
      );
    clearTokens();
    const requestGeneration = generation;
    const payload = await request(coreUrl, "auth/google", "POST", { idToken });
    if (requestGeneration !== generation)
      throw new ApiError(401, "UNAUTHORIZED", i18n.t("apiErrors.sessionEnded"));
    checked(parseUser, payload);
    setTokens(checked(parseTokens, payload));
    return this.me();
  },
  async facebook(accessToken: string): Promise<AuthUser> {
    if (!accessToken || accessToken.length > 16384)
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        i18n.t("apiErrors.invalidFacebookCredential"),
      );
    clearTokens();
    const requestGeneration = generation;
    const payload = await request(coreUrl, "auth/facebook", "POST", {
      accessToken,
    });
    if (requestGeneration !== generation)
      throw new ApiError(401, "UNAUTHORIZED", i18n.t("apiErrors.sessionEnded"));
    checked(parseUser, payload);
    setTokens(checked(parseTokens, payload));
    return this.me();
  },
  async signIn(
    mode: "login" | "register",
    email: string,
    password: string,
  ): Promise<AuthUser> {
    clearTokens();
    const requestGeneration = generation;
    const payload = await request(coreUrl, `auth/${mode}`, "POST", {
      email: email.trim(),
      password,
    });
    if (requestGeneration !== generation)
      throw new ApiError(401, "UNAUTHORIZED", i18n.t("apiErrors.sessionEnded"));
    checked(parseUser, payload);
    setTokens(checked(parseTokens, payload));
    return this.me();
  },
  async refresh(): Promise<string> {
    if (refreshPending) return refreshPending;
    refreshPending = (async () => {
      const requestGeneration = generation;
      const refreshToken = tokens?.refreshToken || storedRefresh();
      if (!refreshToken)
        throw new ApiError(
          401,
          "INVALID_REFRESH_TOKEN",
          i18n.t("apiErrors.signInRequired"),
        );
      const payload = await request(coreUrl, "auth/refresh", "POST", {
        refreshToken,
      });
      if (requestGeneration !== generation)
        throw new ApiError(
          401,
          "UNAUTHORIZED",
          i18n.t("apiErrors.sessionEnded"),
        );
      setTokens(checked(parseTokens, payload));
      return tokens!.accessToken;
    })();
    try {
      return await refreshPending;
    } finally {
      refreshPending = null;
    }
  },
  async token(): Promise<string> {
    return tokens && expiresAt > Date.now() + 30000
      ? tokens.accessToken
      : this.refresh();
  },
  async authorized(
    base: string,
    path: string,
    method = "GET",
    body?: unknown,
    eventId?: string,
  ): Promise<unknown> {
    const token = await this.token();
    try {
      return await request(base, path, method, body, token, eventId);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      try {
        return await request(
          base,
          path,
          method,
          body,
          tokens && tokens.accessToken !== token
            ? await this.token()
            : await this.refresh(),
          eventId,
        );
      } catch (failure) {
        if (failure instanceof ApiError && failure.status === 401) {
          clearTokens();
          window.dispatchEvent(new Event("gotit:session-expired"));
        }
        throw failure;
      }
    }
  },
  async product(
    path: string,
    method = "GET",
    body?: unknown,
    eventId?: string,
  ): Promise<unknown> {
    try {
      return await this.authorized(productUrl, path, method, body, eventId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens();
        window.dispatchEvent(new Event("gotit:session-expired"));
      }
      throw error;
    }
  },
  async core(
    path: string,
    method = "GET",
    body?: unknown,
    eventId?: string,
  ): Promise<unknown> {
    return this.authorized(coreUrl, path, method, body, eventId);
  },
  async audio(id: string): Promise<Blob> {
    const send = async (token: string) =>
      fetch(
        `${productUrl}/api/v1/learning-items/${encodeURIComponent(id)}/audio`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "omit",
          signal: AbortSignal.timeout(20000),
        },
      );
    let response = await send(await this.token());
    if (response.status === 401) response = await send(await this.refresh());
    if (response.status === 402) {
      const payload = (await response.json().catch(() => undefined)) as
        { error?: { code?: string } } | undefined;
      if (payload?.error?.code === "SUBSCRIPTION_REQUIRED")
        throw new ApiError(
          402,
          "SUBSCRIPTION_REQUIRED",
          localizedMessage("SUBSCRIPTION_REQUIRED"),
        );
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        "AUDIO_UNAVAILABLE",
        i18n.t("apiErrors.audioUnavailable"),
      );
    const blob = await response.blob();
    if (!blob.type.startsWith("audio/") || blob.size > 5000000)
      throw new ApiError(
        502,
        "INVALID_RESPONSE",
        i18n.t("apiErrors.invalidAudio"),
      );
    return blob;
  },
  async me(): Promise<AuthUser> {
    return checked(parseUser, await this.authorized(coreUrl, "auth/me"));
  },
  async getProfile(): Promise<ProfilePatch> {
    return checked(parseProfile, await this.authorized(productUrl, "profile"));
  },
  async saveProfile(profile: ProfilePatch): Promise<ProfilePatch> {
    return checked(
      parseProfile,
      await this.authorized(
        productUrl,
        "profile",
        "PATCH",
        profilePayload(profile),
      ),
    );
  },
  async logout() {
    const refreshToken = tokens?.refreshToken || storedRefresh();
    clearTokens();
    try {
      if (refreshToken)
        await request(coreUrl, "auth/logout", "POST", { refreshToken });
    } finally {
      clearTokens();
    }
  },
};
