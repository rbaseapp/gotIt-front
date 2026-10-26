export function initLanding(
  root: ShadowRoot,
  ctx: { navigate: (path: string) => void; destinations: Record<string, string> },
): () => void;
