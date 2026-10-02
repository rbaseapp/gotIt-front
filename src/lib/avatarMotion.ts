/** Audio-driven poses, not phoneme recognition: blend only adjacent mouth shapes. */
export function avatarMouth(level: number) {
  const stops = [0.025, 0.14, 0.34, 0.75];
  const weights = [0, 0, 0, 0];
  const safeLevel = Number.isFinite(level)
    ? Math.max(0, Math.min(1, level))
    : 0;
  const interval = stops.findIndex(
    (stop, index) => index > 0 && safeLevel < stop,
  );
  if (safeLevel <= stops[0]) weights[0] = 1;
  else if (interval === -1) weights[3] = 1;
  else {
    const blend =
      (safeLevel - stops[interval - 1]) /
      (stops[interval] - stops[interval - 1]);
    weights[interval - 1] = 1 - blend;
    weights[interval] = blend;
  }
  // Convert desired contributions to source-over alpha. Independent opacity
  // weights leave the closed mouth visible behind two open mouth images.
  const wide = weights[3];
  const rounded = wide < 1 ? weights[2] / (1 - wide) : 0;
  const remaining = weights[0] + weights[1];
  const soft = remaining > 0 ? weights[1] / remaining : 0;
  return { soft, rounded, wide, speaking: safeLevel > stops[0] };
}

/** Gentle onset/release filter rapid syllable flicker at any refresh rate. */
export function smoothAvatarLevel(
  previous: number,
  measured: number,
  elapsedMs: number,
) {
  const target = Number.isFinite(measured)
    ? Math.max(0, Math.min(1, measured))
    : 0;
  const current = Number.isFinite(previous)
    ? Math.max(0, Math.min(1, previous))
    : 0;
  const duration = Number.isFinite(elapsedMs)
    ? Math.max(0, Math.min(100, elapsedMs))
    : 0;
  const timeConstant = 110;
  const level =
    current + (target - current) * (1 - Math.exp(-duration / timeConstant));
  return target === 0 && level < 0.008 ? 0 : level;
}
