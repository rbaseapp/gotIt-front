import {
  parseProfile,
  parseTokens,
  parseUser,
  profilePayload,
} from "./contracts";
import type { AuthTokens, AuthUser, ProfilePatch } from "../types";

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

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "כתובת האימייל או הסיסמה אינן נכונות.",
  USER_ALREADY_EXISTS: "כבר קיים חשבון עם כתובת האימייל הזו.",
  USER_DISABLED: "החשבון אינו פעיל.",
  VALIDATION_ERROR: "הפרטים אינם תקינים. בדקו את השדות ונסו שוב.",
  INVALID_REFRESH_TOKEN: "הכניסה פגה. יש להיכנס מחדש.",
  INVALID_ACCESS_TOKEN: "הכניסה פגה. יש להיכנס מחדש.",
  UNAUTHORIZED: "הכניסה פגה. יש להיכנס מחדש.",
  CORE_AUTH_UNAVAILABLE: "שירות האימות אינו זמין כרגע. נסו שוב בעוד רגע.",
  READING_PROVIDER_AUTHENTICATION:
    "Anthropic דחה את מפתח ה־API שמוגדר בשרת. יש להחליף את ANTHROPIC_API_KEY ולבצע Deploy מחדש.",
  READING_PROVIDER_BILLING:
    "חשבון Anthropic דורש הגדרת Billing או קרדיט API פעיל.",
  READING_PROVIDER_PERMISSION:
    "למפתח Anthropic אין הרשאה ל־Workspace או למודל שנבחר.",
  READING_PROVIDER_RATE_LIMIT:
    "מגבלת הבקשות של Anthropic נוצלה כרגע. יש לנסות שוב בעוד רגע.",
  READING_PROVIDER_REQUEST_INVALID:
    "Anthropic דחה את מבנה הבקשה. יש לבדוק את הגדרות המודל בשרת.",
  READING_PROVIDER_TIMEOUT:
    "Anthropic לא השיב בתוך 30 שניות. יש לנסות שוב או לבדוק את זמני התגובה ב־Render.",
  READING_PROVIDER_RESPONSE_INVALID:
    "Anthropic החזיר תשובה שהשרת לא הצליח לעבד. יש לבדוק את המודל וה־structured output.",
  READING_PROVIDER_UPSTREAM:
    "הבקשה ל־Anthropic נכשלה לפני שהתקבלה תשובה תקינה.",
};

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
        path.startsWith("reading") || path === "import" ? 75000 : 20000,
      ),
      credentials: "omit",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "לא ניתן להגיע לשירות. בדקו חיבור, כתובות API ומדיניות CORS.",
    );
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
      messages[code] ||
        (response.status >= 500
          ? "השירות אינו זמין זמנית. נסו שוב."
          : "לא הצלחנו להשלים את הבקשה."),
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
      "השירות החזיר תשובה לא תקינה. נסו שוב.",
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
        "אישור Google אינו תקין. נסו שוב.",
      );
    clearTokens();
    const requestGeneration = generation;
    const payload = await request(coreUrl, "auth/google", "POST", { idToken });
    if (requestGeneration !== generation)
      throw new ApiError(401, "UNAUTHORIZED", "הסשן הסתיים.");
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
      throw new ApiError(401, "UNAUTHORIZED", "הסשן הסתיים.");
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
        throw new ApiError(401, "INVALID_REFRESH_TOKEN", "יש להיכנס לחשבון.");
      const payload = await request(coreUrl, "auth/refresh", "POST", {
        refreshToken,
      });
      if (requestGeneration !== generation)
        throw new ApiError(401, "UNAUTHORIZED", "הסשן הסתיים.");
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
    if (!response.ok)
      throw new ApiError(
        response.status,
        "AUDIO_UNAVAILABLE",
        "שמע אינו זמין. ודאו שהוגדר ספק דיבור בשרת.",
      );
    const blob = await response.blob();
    if (!blob.type.startsWith("audio/") || blob.size > 5000000)
      throw new ApiError(502, "INVALID_RESPONSE", "קובץ השמע אינו תקין.");
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
