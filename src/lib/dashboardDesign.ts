import { designEnabled } from "./designRollout";
/** The redesigned dashboard and top navigation (see designRollout). */
export function dashboardDesignEnabled(
  setting: string | undefined = import.meta.env.VITE_DASHBOARD_DESIGN,
) {
  return designEnabled(setting);
}

export function captureIsInactive(
  createdAt: string | undefined,
  now = Date.now(),
) {
  return !!createdAt && now - Date.parse(createdAt) >= 3 * 86400000;
}
