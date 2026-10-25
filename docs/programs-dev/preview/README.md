# Local visual fixture

The HTML entry renders the real programs component and shared header with fixed sample data. It is not imported by the application build and does not call a provider or database.

From the backend checkout (which owns sharp), run `node scripts/program-artwork-preview.mjs <absolute-path-to-this-preview-directory>`. This serves only the five allowlisted sample images on loopback port 3021. From the frontend checkout run Vite on port 5187 with `VITE_PROGRAMS_DESIGN=true` and `VITE_DASHBOARD_DESIGN=true`, then open `/docs/programs-dev/preview/index.html` (`?locale=en` for LTR).

Production uses authenticated artwork endpoints and owned content, never these sample files.
