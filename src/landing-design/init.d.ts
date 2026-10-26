export function initLanding(
  root: ShadowRoot,
  ctx: { navigate: (path: string) => void; destinations: Record<string, string>; setLanguage: (code: string) => void;
    t: (key: string) => string;
    lang: string;
    dir: "rtl" | "ltr";
    languageNames: Record<string, string>;
  },
): () => void;
