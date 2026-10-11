/** Approved practice hub rollout: DEV host or an explicit loopback preview. */
export function practiceDesignEnabled(
  hostname = window.location.hostname,
  localPreview = import.meta.env.VITE_PRACTICE_DESIGN === "true",
) {
  return (
    hostname === "gotit-dev.rbaseapp.com" ||
    (localPreview && ["localhost", "127.0.0.1", "[::1]"].includes(hostname))
  );
}

export const practiceCards = [
  {
    id: "flashcards",
    asset: "cards",
    game: "flashcards",
    skill: "recognition",
  },
  { id: "writing", asset: "keyboard", game: "recall", skill: "recall" },
  { id: "drag", asset: "translation", game: "drag_drop", skill: "recognition" },
  { id: "sentences", asset: "puzzle", game: null, skill: "recognition" },
  { id: "mixed", asset: "gamepad", game: "smart", skill: null },
  { id: "dialogue", asset: "chat", game: null, skill: null },
  { id: "pictures", asset: "picture", game: null, skill: "recognition" },
  {
    id: "listening",
    asset: "headphones",
    game: "listening",
    skill: "listening",
  },
] as const;

export function sessionGame(type: string) {
  return type === "smart_review"
    ? "smart"
    : type === "listening_spelling"
      ? "listening"
      : type;
}

export function recentPracticeTime(
  value: string,
  locale: string,
  now = Date.now(),
) {
  const seconds = Math.min(0, (Date.parse(value) - now) / 1000);
  const [unit, divisor]: [Intl.RelativeTimeFormatUnit, number] =
    Math.abs(seconds) >= 86400
      ? ["day", 86400]
      : Math.abs(seconds) >= 3600
        ? ["hour", 3600]
        : ["minute", 60];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.ceil(seconds / divisor),
    unit,
  );
}

export function recentPracticeLink(
  session: {
    id: string;
    sessionType: string;
    status: string;
    scope?: { type: string; id: string } | null;
  },
  language: string,
  returnTo: string,
) {
  const params = new URLSearchParams({ language, return: returnTo });
  if (session.status === "active") params.set("resume", session.id);
  if (session.scope?.type === "pack") params.set("pack", session.scope.id);
  if (session.status !== "active")
    return `/history?${new URLSearchParams({ language })}`;
  return `/learn/session/${sessionGame(session.sessionType)}?${params}`;
}
