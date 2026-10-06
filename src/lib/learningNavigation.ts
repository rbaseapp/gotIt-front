import type { AuthUser, UserProfile } from "../types";

export function unitPracticeLink(
  packId: string,
  language: string,
  profile: UserProfile,
  user?: Pick<AuthUser, "applicationId" | "id"> | null,
  returnTo = `/english-learning?unit=${packId}&tab=words`,
) {
  let pace: string | null = null;
  try {
    pace = localStorage.getItem(
      `${selectedProgramKey(user)}.practicePace.${language}`,
    );
  } catch {
    /* The saved daily preference remains available in the profile. */
  }
  const count =
    pace === "long"
      ? 20
      : pace
        ? 10
        : Math.max(10, Math.min(20, profile.defaultNewItemsPerDay));
  return `/learn/session/smart?${new URLSearchParams({
    pack: packId,
    language,
    count: String(count),
    includeNew: pace === "review" ? "0" : "1",
    batch: "1",
    ready: "1",
    return: learningReturn(returnTo),
  })}`;
}

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
