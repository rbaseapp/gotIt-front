import type { AuthUser } from "../types";

// A destination is presentation context, never learning authority. Keep it local.
export function learningReturn(value: string | null, fallback = "/learn") {
  if (!value || value.startsWith("//") || /[\\\r\n]/u.test(value))
    return fallback;
  return /^\/(?:dashboard|vocabulary|learn|reading|history|private-lesson|word-packs|english-learning|courses(?:\/[a-zA-Z0-9-]+)?|homework\/[a-zA-Z0-9-]+)(?:[?#]|$)/u.test(
    value,
  )
    ? value
    : fallback;
}

export function practiceLink(
  game: string,
  scope: URLSearchParams,
  fallbackLanguage: string,
) {
  const params = new URLSearchParams();
  for (const key of ["items", "pack", "reading", "language", "return"]) {
    const value = scope.get(key);
    if (value)
      params.set(key, key === "return" ? learningReturn(value) : value);
  }
  if (
    !params.has("language") &&
    !["items", "pack", "reading"].some((key) => params.has(key)) &&
    fallbackLanguage
  )
    params.set("language", fallbackLanguage);
  // Spelling uses the existing typed recall contract, with a full alphabet keyboard.
  if (game === "spelling") params.set("input", "letters");
  return `${game === "smart" ? "/learn/smart" : `/learn/session/${game === "spelling" ? "recall" : game}`}${params.size ? `?${params}` : ""}`;
}

export function smartSessionLink(scope: URLSearchParams) {
  const params = new URLSearchParams(scope);
  params.set("ready", "1");
  return `/learn/session/smart?${params}`;
}

export function selectedProgramKey(
  user?: Pick<AuthUser, "applicationId" | "id"> | null,
) {
  return `gotit.selectedProgram.v1.${user?.applicationId ?? "demo"}.${user?.id ?? "demo"}`;
}
export function selectedProgram(
  user?: Pick<AuthUser, "applicationId" | "id"> | null,
  language?: string,
) {
  try {
    if (language) {
      const selected = localStorage.getItem(
        `${selectedProgramKey(user)}.${language}`,
      );
      if (selected) return selected;
    }
    return localStorage.getItem(selectedProgramKey(user));
  } catch {
    return null;
  }
}
export function chooseProgram(
  value: string,
  user?: Pick<AuthUser, "applicationId" | "id"> | null,
  language?: string,
) {
  try {
    localStorage.setItem(selectedProgramKey(user), value);
    if (language) {
      localStorage.setItem(`${selectedProgramKey(user)}.${language}`, value);
      chooseHomeLanguage(language, user);
    }
  } catch {
    /* Current navigation still works. */
  }
}
export function homeLanguage(
  user?: Pick<AuthUser, "applicationId" | "id"> | null,
) {
  try {
    return localStorage.getItem(`${selectedProgramKey(user)}.language`) || "";
  } catch {
    return "";
  }
}
export function chooseHomeLanguage(
  language: string,
  user?: Pick<AuthUser, "applicationId" | "id"> | null,
) {
  try {
    localStorage.setItem(`${selectedProgramKey(user)}.language`, language);
  } catch {
    /* Optional navigation context. */
  }
}
