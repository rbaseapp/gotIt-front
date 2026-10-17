/** Temporary rollout boundary: the approved dashboard is only available in DEV. */
export function dashboardDesignEnabled(
  hostname = window.location.hostname,
  localPreview = import.meta.env.VITE_DASHBOARD_DESIGN === "true",
) {
  return (
    hostname === "gotit-dev.rbaseapp.com" ||
    (localPreview && ["localhost", "127.0.0.1", "[::1]"].includes(hostname))
  );
}

export function captureIsInactive(
  createdAt: string | undefined,
  now = Date.now(),
) {
  return !!createdAt && now - Date.parse(createdAt) >= 3 * 86400000;
}
