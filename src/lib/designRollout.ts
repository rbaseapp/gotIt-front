/**
 * The redesigned screens (top navigation, dashboard, practice, my words, programs and
 * settings) are the default on every host. Each screen keeps a kill switch: building with
 * VITE_<SCREEN>_DESIGN=false brings back its previous layout.
 */
export const designEnabled = (setting: string | undefined) =>
  setting !== "false";
