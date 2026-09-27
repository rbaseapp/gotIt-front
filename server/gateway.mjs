import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { isIP } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export const DEFAULT_CORE = "https://rbase-core-api.onrender.com";
export const DEFAULT_GOTIT = "https://gotit-backend.onrender.com";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};
const applePayAssociationPath =
  "/.well-known/apple-developer-merchantid-domain-association";
const defaultUpstreamRetryDelays = [250, 750, 1500];
const defaultUpstreamWarmupRetryDelays = [
  500, 1500, 3000, 5000, 8000, 13000, 20000, 15000,
];
const renderUnavailableStatuses = new Set([502, 503, 504]);
const csp =
  "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client https://connect.facebook.net https://cdn.paddle.com; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.googleusercontent.com https://*.facebook.com https://*.fbcdn.net https://*.paddle.com; connect-src 'self' https://api.openai.com https://accounts.google.com/gsi/ https://*.facebook.com https://*.facebook.net https://*.paddle.com; frame-src https://accounts.google.com/gsi/ https://*.facebook.com https://*.paddle.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://*.facebook.com https://*.paddle.com; frame-ancestors 'none'";
function upstream(value, development) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        development &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error(
      "API targets must be HTTPS origins; localhost HTTP is allowed only in development.",
    );
  return url.origin;
}
export function configuration(env = process.env) {
  const development = env.NODE_ENV !== "production";
  const origin =
    env.PUBLIC_APP_ORIGIN ||
    env.RENDER_EXTERNAL_URL ||
    (development ? `http://localhost:${env.PORT || "10000"}` : "");
  if (!origin)
    throw new Error(
      "PUBLIC_APP_ORIGIN or RENDER_EXTERNAL_URL is required in production.",
    );
  const publicUrl = new URL(origin);
  if (
    publicUrl.origin !== origin ||
    publicUrl.username ||
    publicUrl.password ||
    (!development && publicUrl.protocol !== "https:")
  )
    throw new Error("Website origin must be a canonical HTTPS origin.");
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  if (
    !Number.isInteger(trustProxyHops) ||
    trustProxyHops < 0 ||
    trustProxyHops > 3
  )
    throw new Error(
      "TRUST_PROXY_HOPS must be 0–3 and match the hosting network.",
    );
  const paddleEnvironment = env.PADDLE_ENVIRONMENT;
  if (!["sandbox", "production"].includes(paddleEnvironment))
    throw new Error(
      "PADDLE_ENVIRONMENT is required and must be sandbox or production.",
    );
  return {
    origin,
    core: upstream(env.CORE_API_PROXY_TARGET || DEFAULT_CORE, development),
    gotit: upstream(env.GOTIT_API_PROXY_TARGET || DEFAULT_GOTIT, development),
    dist: resolve(env.FRONTEND_DIST || "dist"),
    trustProxyHops,
    paddleClientToken: env.PADDLE_CLIENT_TOKEN || "",
    paddleEnvironment,
    paddlePriceIds: {
      month: env.PADDLE_PRO_MONTHLY_PRICE_ID || "",
      ...(env.PADDLE_PRO_YEARLY_PRICE_ID
        ? { year: env.PADDLE_PRO_YEARLY_PRICE_ID }
        : {}),
    },
    upstreamRetryDelays: defaultUpstreamRetryDelays,
    upstreamWarmupRetryDelays: defaultUpstreamWarmupRetryDelays,
    upstreamReadyTtlMs: 10 * 60 * 1000,
    prewarmUpstreams: true,
  };
}
export function createGateway(config) {
  let draining = false;
  let startupPrewarmTriggered = false;
  let coreReadyUntil = 0;
  let coreWarmup;
  const buckets = new Map();
  const ensureCoreReady = () => {
    if (Date.now() < coreReadyUntil) return Promise.resolve();
    if (!coreWarmup) {
      coreWarmup = waitForUpstream(
        config.core,
        config.upstreamWarmupRetryDelays,
      )
        .then(() => {
          coreReadyUntil = Date.now() + config.upstreamReadyTtlMs;
        })
        .finally(() => {
          coreWarmup = undefined;
        });
    }
    return coreWarmup;
  };
  const prewarmCore = () => {
    if (config.prewarmUpstreams !== false)
      void ensureCoreReady().catch(() => {});
  };
  const server = http.createServer(async (req, res) => {
    const requestId = crypto.randomUUID();
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(self), geolocation=()",
    );
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    if (config.origin.startsWith("https://"))
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    const fail = (status, code) => {
      if (!res.headersSent && !res.destroyed) {
        res.writeHead(status, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ error: { code }, requestId }));
      }
    };
    if (draining) {
      fail(503, "DRAINING");
      return;
    }
    try {
      if (
        !req.url?.startsWith("/") ||
        req.url.startsWith("//") ||
        req.url.includes("\\")
      ) {
        fail(400, "INVALID_PATH");
        return;
      }
      if (/%(?:2f|5c|2e)/i.test(req.url)) {
        fail(400, "INVALID_PATH");
        return;
      }
      const url = new URL(req.url, config.origin);
      const pathname = decodeURIComponent(url.pathname);
      if (
        pathname.includes("\0") ||
        (pathname !== applePayAssociationPath &&
          pathname.split("/").some((part) => part.startsWith(".")))
      ) {
        fail(400, "INVALID_PATH");
        return;
      }
      if (pathname === "/health" || pathname === "/ready") {
        if (!["GET", "HEAD"].includes(req.method)) {
          fail(405, "METHOD_NOT_ALLOWED");
          return;
        }
        await stat(resolve(config.dist, "index.html"));
        if (!startupPrewarmTriggered) {
          startupPrewarmTriggered = true;
          prewarmCore();
        }
        if (pathname === "/ready" && config.prewarmUpstreams !== false) {
          try {
            await ensureCoreReady();
          } catch {
            fail(503, "UPSTREAM_UNAVAILABLE");
            return;
          }
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          req.method === "HEAD"
            ? undefined
            : JSON.stringify({
                status: "ok",
                service: "gotit-front",
                requestId,
              }),
        );
        return;
      }
      if (pathname === "/runtime-config") {
        if (req.method !== "GET") {
          fail(405, "METHOD_NOT_ALLOWED");
          return;
        }
        const countryCode = detectedCountryCode(req.headers);
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify({
            paddleClientToken: config.paddleClientToken,
            paddleEnvironment: config.paddleEnvironment,
            paddlePriceIds: config.paddlePriceIds,
            ...(countryCode ? { countryCode } : {}),
          }),
        );
        return;
      }
      const prefix = pathname.startsWith("/core-api/")
        ? "/core-api"
        : pathname.startsWith("/gotit-api/")
          ? "/gotit-api"
          : undefined;
      if (prefix) {
        const apiPath = pathname.slice(prefix.length);
        if (
          !apiPath.startsWith("/api/v1/") ||
          (prefix === "/core-api" &&
            !/^\/api\/v1\/(?:auth\/(?:login|register|google|facebook|refresh|logout|me)|billing\/(?:plans|status|checkout|portal))$/.test(
              apiPath,
            ))
        ) {
          fail(404, "NOT_FOUND");
          return;
        }
        if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
          fail(405, "METHOD_NOT_ALLOWED");
          return;
        }
        if (req.headers.origin && req.headers.origin !== config.origin) {
          fail(403, "ORIGIN_REJECTED");
          return;
        }
        const forwarded = String(req.headers["x-forwarded-for"] || "")
          .split(",")
          .map((ip) => ip.trim())
          .filter((ip) => isIP(ip));
        const clientIP = config.trustProxyHops
          ? forwarded.at(-config.trustProxyHops) || req.socket.remoteAddress
          : req.socket.remoteAddress;
        const now = Date.now();
        for (const [key, value] of buckets)
          if (value.expires <= now) buckets.delete(key);
        if (!buckets.has(clientIP) && buckets.size >= 10000) {
          fail(503, "RATE_LIMIT_CAPACITY");
          return;
        }
        const bucket = buckets.get(clientIP) || {
          count: 0,
          expires: now + 60000,
        };
        bucket.count++;
        buckets.set(clientIP, bucket);
        if (bucket.count > 240) {
          res.setHeader("Retry-After", "60");
          fail(429, "RATE_LIMITED");
          return;
        }
        const limit =
          apiPath === "/api/v1/pronunciation/assessments"
            ? 1024 * 1024
            : 256 * 1024;
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > limit) {
            fail(413, "PAYLOAD_TOO_LARGE");
            return;
          }
          chunks.push(chunk);
        }
        const body = size ? Buffer.concat(chunks) : undefined;
        if (
          body &&
          (!/^application\/json(?:\s*;|$)/i.test(
            req.headers["content-type"] || "",
          ) ||
            req.method === "GET")
        ) {
          fail(415, "JSON_REQUIRED");
          return;
        }
        const headers = {
          "X-Request-ID": requestId,
          "X-Forwarded-For": clientIP || "",
        };
        if (prefix === "/gotit-api") headers.Origin = config.origin;
        if (prefix === "/core-api") headers["X-Application-Key"] = "gotit";
        if (req.headers.authorization)
          headers.Authorization = req.headers.authorization;
        if (req.headers["idempotency-key"])
          headers["Idempotency-Key"] = req.headers["idempotency-key"];
        if (body) headers["Content-Type"] = "application/json";
        if (prefix === "/core-api") {
          try {
            await ensureCoreReady();
          } catch {
            res.setHeader("Retry-After", "2");
            fail(503, "UPSTREAM_UNAVAILABLE");
            return;
          }
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 80000);
        const cancel = () => {
          if (!res.writableEnded) controller.abort();
        };
        res.on("close", cancel);
        try {
          const upstreamUrl = `${prefix === "/core-api" ? config.core : config.gotit}${apiPath}${url.search}`;
          const retryDelays =
            ["GET", "HEAD"].includes(req.method) ||
            req.headers["idempotency-key"]
              ? config.upstreamRetryDelays
              : [];
          let response;
          let content;
          for (let attempt = 0; ; attempt++) {
            response = await fetch(upstreamUrl, {
              method: req.method,
              headers,
              body,
              redirect: "manual",
              signal: controller.signal,
            });
            if (response.status >= 300 && response.status < 400) {
              fail(502, "UPSTREAM_REDIRECT_REJECTED");
              return;
            }
            const chunks = [];
            let received = 0;
            if (response.body)
              for await (const chunk of response.body) {
                received += chunk.length;
                if (received > 4 * 1024 * 1024) {
                  controller.abort();
                  fail(502, "UPSTREAM_RESPONSE_TOO_LARGE");
                  return;
                }
                chunks.push(Buffer.from(chunk));
              }
            content = Buffer.concat(chunks);
            const infrastructureUnavailable =
              renderUnavailableStatuses.has(response.status) &&
              response.headers.get("content-type")?.startsWith("text/html");
            if (!infrastructureUnavailable) break;
            if (prefix === "/core-api") coreReadyUntil = 0;
            if (attempt === retryDelays.length) {
              res.setHeader("Retry-After", "2");
              fail(503, "UPSTREAM_UNAVAILABLE");
              return;
            }
            await delay(retryDelays[attempt], undefined, {
              signal: controller.signal,
            });
          }
          for (const header of [
            "content-type",
            "retry-after",
            "idempotency-replayed",
          ]) {
            const value = response.headers.get(header);
            if (value) res.setHeader(header, value);
          }
          res.writeHead(response.status);
          res.end(content);
        } finally {
          clearTimeout(timer);
          res.off("close", cancel);
        }
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        fail(405, "METHOD_NOT_ALLOWED");
        return;
      }
      const root = await realpath(config.dist);
      let target = resolve(root, `.${pathname}`);
      let servingSpa = false;
      if (target !== root && !target.startsWith(`${root}${sep}`)) {
        fail(400, "INVALID_PATH");
        return;
      }
      let info = await stat(target).catch(() => null);
      if (!info?.isFile()) {
        if (extname(pathname) || pathname.startsWith("/assets/")) {
          fail(404, "NOT_FOUND");
          return;
        }
        target = resolve(root, "index.html");
        servingSpa = true;
        info = await stat(target);
      }
      target = await realpath(target);
      if (!target.startsWith(`${root}${sep}`)) {
        fail(403, "INVALID_PATH");
        return;
      }
      const contentType =
        pathname === applePayAssociationPath
          ? "text/plain; charset=utf-8"
          : mime[extname(target)];
      if (!contentType) {
        fail(404, "NOT_FOUND");
        return;
      }
      if (servingSpa) prewarmCore();
      if (pathname.startsWith("/assets/") && !target.endsWith(".html"))
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": info.size,
      });
      res.end(req.method === "HEAD" ? undefined : await readFile(target));
    } catch {
      fail(502, "GATEWAY_UNAVAILABLE");
    }
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
  server.once("listening", () => {
    if (!startupPrewarmTriggered) {
      startupPrewarmTriggered = true;
      prewarmCore();
    }
  });
  server.drain = () => {
    draining = true;
    server.closeIdleConnections();
    return new Promise((resolveClose) => server.close(resolveClose));
  };
  return server;
}

async function waitForUpstream(origin, retryDelays) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 85000);
  try {
    for (let attempt = 0; ; attempt++) {
      let retryable = false;
      try {
        const response = await fetch(`${origin}/ready`, {
          method: "GET",
          headers: { "X-Request-ID": crypto.randomUUID() },
          redirect: "manual",
          signal: controller.signal,
        });
        const contentType = response.headers.get("content-type") || "";
        const content = await response.text();
        let readiness;
        if (contentType.startsWith("application/json"))
          try {
            readiness = JSON.parse(content);
          } catch {
            readiness = undefined;
          }
        if (
          response.status === 200 &&
          readiness &&
          typeof readiness === "object" &&
          readiness.status === "ready"
        )
          return;
        retryable =
          (renderUnavailableStatuses.has(response.status) &&
            contentType.startsWith("text/html")) ||
          response.status === 200;
      } catch {
        retryable = !controller.signal.aborted;
      }
      if (!retryable || attempt === retryDelays.length)
        throw new Error("Upstream readiness check failed");
      await delay(retryDelays[attempt], undefined, {
        signal: controller.signal,
      });
    }
  } finally {
    clearTimeout(timer);
  }
}

function detectedCountryCode(headers) {
  for (const name of [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "cloudfront-viewer-country",
  ]) {
    const value = Array.isArray(headers[name])
      ? headers[name][0]
      : headers[name];
    const code = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (/^[A-Z]{2}$/u.test(code) && code !== "XX") return code;
  }
  return undefined;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const config = configuration();
    await stat(resolve(config.dist, "index.html"));
    const server = createGateway(config);
    const port = Number(process.env.PORT || 10000);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("Invalid PORT.");
    server.listen(port, "0.0.0.0", () =>
      console.info(`GotIt frontend listening on port ${port}`),
    );
    const shutdown = () => {
      const timer = setTimeout(() => {
        server.closeAllConnections();
        process.exit(1);
      }, 20000);
      timer.unref();
      void server.drain().then(() => {
        clearTimeout(timer);
        process.exit(0);
      });
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  } catch {
    console.error(
      "Frontend preflight failed. Check HTTPS origins, port, proxy settings, and built dist/index.html.",
    );
    process.exitCode = 1;
  }
}
