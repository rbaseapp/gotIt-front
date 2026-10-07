import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGateway,
  configuration,
  upstreamTimeoutMs,
} from "../server/gateway.mjs";

it("allows long homework preparation without extending unrelated requests", () => {
  const path =
    "/api/v1/courses/homework/11111111-1111-4111-8111-111111111111/prepare";
  assert.equal(upstreamTimeoutMs("/gotit-api", path), 220000);
  assert.equal(upstreamTimeoutMs("/core-api", path), 80000);
  assert.equal(
    upstreamTimeoutMs("/gotit-api", path.replace("/prepare", "/actions")),
    80000,
  );
});

let upstream;
let gateway;
let upstreamOrigin;
let gatewayOrigin;
let directory;
let renderFailuresRemaining = 0;
let renderRetryRequests = 0;
let renderStartingResponsesRemaining = 0;
let googleAuthRequests = 0;
let homeworkFailuresRemaining = 0;
let homeworkPrepareRequests = 0;
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "gotit-gateway-"));
  await mkdir(join(directory, "assets"));
  await mkdir(join(directory, ".well-known"));
  await writeFile(
    join(directory, "index.html"),
    '<!doctype html><title>GotIt</title><meta property="og:image" content="/og-image.png" />',
  );
  await writeFile(join(directory, "assets", "app.js"), "export default 1");
  await writeFile(
    join(
      directory,
      ".well-known",
      "apple-developer-merchantid-domain-association",
    ),
    "paddle-apple-pay-verification",
  );
  upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const receivedBody = Buffer.concat(chunks).toString();
    if (req.url === "/ready") {
      renderRetryRequests++;
      if (renderFailuresRemaining-- > 0) {
        res.writeHead(502, {
          "Content-Type": "text/html; charset=utf-8",
        });
        res.end("<!doctype html><title>502</title><h1>Bad Gateway</h1>");
        return;
      }
      if (renderStartingResponsesRemaining-- > 0) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<!doctype html><title>Starting service</title>");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ready" }));
      return;
    }
    if (req.url === "/api/v1/auth/google") googleAuthRequests++;
    if (/^\/api\/v1\/courses\/homework\/[0-9a-f-]+\/prepare$/i.test(req.url)) {
      homeworkPrepareRequests++;
      if (homeworkFailuresRemaining-- > 0) {
        res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<!doctype html><title>Starting service</title>");
        return;
      }
    }
    if (req.url === "/api/v1/realtime/connect") {
      res.writeHead(200, { "Content-Type": "application/sdp" });
      res.end(
        `v=0\r\no=provider\r\na=received:${req.headers["content-type"]}:${receivedBody.length}\r\n`,
      );
      return;
    }
    res.writeHead(
      req.url === "/api/v1/redirect" ? 302 : 200,
      req.url === "/api/v1/redirect"
        ? { Location: "https://evil.example" }
        : {
            "Content-Type": req.url?.endsWith("/audio")
              ? "audio/wav"
              : "application/json",
            "Idempotency-Replayed": "true",
          },
    );
    res.end(
      req.url === "/api/v1/redirect"
        ? undefined
        : JSON.stringify({
            path: req.url,
            method: req.method,
            authorization: req.headers.authorization || null,
            applicationKey: req.headers["x-application-key"] || null,
            eventId: req.headers["idempotency-key"] || null,
            origin: req.headers.origin || null,
            body: receivedBody,
          }),
    );
  });
  const upstreamPort = await listen(upstream);
  upstreamOrigin = `http://127.0.0.1:${upstreamPort}`;
  const config = configuration({
    NODE_ENV: "development",
    PUBLIC_APP_ORIGIN: "http://localhost:10000",
    CORE_API_PROXY_TARGET: upstreamOrigin,
    GOTIT_API_PROXY_TARGET: upstreamOrigin,
    FRONTEND_DIST: directory,
    TRUST_PROXY_HOPS: "0",
    PADDLE_CLIENT_TOKEN: "test_public_token",
    PADDLE_ENVIRONMENT: "sandbox",
    PADDLE_PRO_MONTHLY_PRICE_ID: "pri_00000000000000000000000000",
    PADDLE_PRO_YEARLY_PRICE_ID: "pri_11111111111111111111111111",
  });
  config.upstreamRetryDelays = [5, 10, 20];
  config.upstreamWarmupRetryDelays = [5, 10, 20];
  config.upstreamReadyTtlMs = 0;
  config.prewarmUpstreams = false;
  gateway = createGateway(config);
  const port = await listen(gateway);
  gatewayOrigin = `http://127.0.0.1:${port}`;
});
after(async () => {
  await gateway.drain();
  await new Promise((resolve) => upstream.close(resolve));
  await rm(directory, { recursive: true, force: true });
});
describe("production frontend gateway", () => {
  it("forwards only the named email verification and recovery routes", async () => {
    for (const path of [
      "verify-email",
      "resend-verification",
      "forgot-password",
      "reset-password",
    ]) {
      const response = await fetch(
        `${gatewayOrigin}/core-api/api/v1/auth/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com" }),
        },
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.path, `/api/v1/auth/${path}`);
      assert.equal(body.applicationKey, "gotit");
    }
    assert.equal(
      (
        await fetch(
          `${gatewayOrigin}/core-api/api/v1/auth/reset-password/admin`,
        )
      ).status,
      404,
    );
  });
  it("serves the SPA and assets with security and cache headers", async () => {
    const page = await fetch(`${gatewayOrigin}/vocabulary`);
    assert.equal(page.status, 200);
    assert.match(
      page.headers.get("content-security-policy"),
      /accounts\.google\.com/,
    );
    assert.match(page.headers.get("content-security-policy"), /paddle\.com/);
    assert.match(
      page.headers.get("content-security-policy"),
      /https:\/\/api\.openai\.com/,
    );
    assert.equal(
      page.headers.get("cross-origin-opener-policy"),
      "same-origin-allow-popups",
    );
    assert.equal(page.headers.get("cache-control"), "no-store");
    // Link previews need an absolute image URL on the public origin.
    const html = await page.text();
    assert.match(html, /content="http:\/\/localhost:10000\/og-image\.png"/);
    assert.equal(
      Number(page.headers.get("content-length")),
      Buffer.byteLength(html),
    );
    const asset = await fetch(`${gatewayOrigin}/assets/app.js`);
    assert.match(asset.headers.get("cache-control"), /immutable/);
    assert.equal(await asset.text(), "export default 1");
  });
  it("serves only the Apple Pay association file from .well-known", async () => {
    const association = await fetch(
      `${gatewayOrigin}/.well-known/apple-developer-merchantid-domain-association`,
    );
    assert.equal(association.status, 200);
    assert.equal(
      association.headers.get("content-type"),
      "text/plain; charset=utf-8",
    );
    assert.equal(await association.text(), "paddle-apple-pay-verification");
    assert.equal(
      (await fetch(`${gatewayOrigin}/.well-known/other-file`)).status,
      400,
    );
  });
  it("reports health without leaking configuration", async () => {
    const response = await fetch(`${gatewayOrigin}/ready`);
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), [
      "requestId",
      "service",
      "status",
    ]);
    assert.equal(body.status, "ok");
  });
  it("serves only public runtime checkout configuration", async () => {
    const response = await fetch(`${gatewayOrigin}/runtime-config`);
    assert.deepEqual(await response.json(), {
      paddleClientToken: "test_public_token",
      paddleEnvironment: "sandbox",
      paddlePriceIds: {
        month: "pri_00000000000000000000000000",
        year: "pri_11111111111111111111111111",
      },
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
  it("adds a valid edge-provided country to runtime pricing configuration", async () => {
    const response = await fetch(`${gatewayOrigin}/runtime-config`, {
      headers: { "x-vercel-ip-country": "il" },
    });
    assert.deepEqual(await response.json(), {
      paddleClientToken: "test_public_token",
      paddleEnvironment: "sandbox",
      paddlePriceIds: {
        month: "pri_00000000000000000000000000",
        year: "pri_11111111111111111111111111",
      },
      countryCode: "IL",
    });
  });
  it("allowlists Core auth routes and injects only the public application context", async () => {
    const response = await fetch(
      `${gatewayOrigin}/core-api/api/v1/auth/google`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer access",
        },
        body: JSON.stringify({ idToken: "opaque" }),
      },
    );
    const body = await response.json();
    assert.equal(body.path, "/api/v1/auth/google");
    assert.equal(body.applicationKey, "gotit");
    assert.equal(body.authorization, "Bearer access");
    assert.equal(body.origin, null);
    assert.equal(JSON.parse(body.body).idToken, "opaque");
  });
  it("allowlists Facebook authentication without forwarding provider secrets", async () => {
    const response = await fetch(
      `${gatewayOrigin}/core-api/api/v1/auth/facebook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: "opaque-facebook-token" }),
      },
    );
    const body = await response.json();
    assert.equal(body.path, "/api/v1/auth/facebook");
    assert.equal(body.applicationKey, "gotit");
    assert.deepEqual(JSON.parse(body.body), {
      accessToken: "opaque-facebook-token",
    });
  });
  it("waits for a sleeping Core before sending a Google credential once", async () => {
    renderFailuresRemaining = 2;
    renderStartingResponsesRemaining = 1;
    renderRetryRequests = 0;
    googleAuthRequests = 0;
    const response = await fetch(
      `${gatewayOrigin}/core-api/api/v1/auth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "render-outage" }),
      },
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.path, "/api/v1/auth/google");
    assert.equal(renderRetryRequests, 4);
    assert.equal(googleAuthRequests, 1);
  });
  it("does not send a Google credential while Core remains unavailable", async () => {
    renderFailuresRemaining = 10;
    renderRetryRequests = 0;
    googleAuthRequests = 0;
    const response = await fetch(
      `${gatewayOrigin}/core-api/api/v1/auth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "render-outage" }),
      },
    );
    assert.equal(response.status, 503);
    assert.equal(
      response.headers.get("content-type"),
      "application/json; charset=utf-8",
    );
    assert.equal(response.headers.get("retry-after"), "2");
    assert.equal((await response.json()).error.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(renderRetryRequests, 4);
    assert.equal(googleAuthRequests, 0);
    renderFailuresRemaining = 0;
  });
  it("forwards product idempotency and strips arbitrary client headers", async () => {
    const response = await fetch(
      `${gatewayOrigin}/gotit-api/api/v1/practice/attempts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "event",
          Cookie: "private=1",
          "X-Application-Key": "spoof",
        },
        body: "{}",
      },
    );
    const body = await response.json();
    assert.equal(body.eventId, "event");
    assert.equal(body.applicationKey, null);
    assert.equal(body.origin, "http://localhost:10000");
    assert.equal(response.headers.get("idempotency-replayed"), "true");
  });
  it("retries a replayable homework preparation after an infrastructure response", async () => {
    const path =
      "/gotit-api/api/v1/courses/homework/11111111-1111-4111-8111-111111111111/prepare";
    const command = {
      revision: 0,
      eventId: "22222222-2222-4222-8222-222222222222",
    };
    homeworkPrepareRequests = 0;
    homeworkFailuresRemaining = 1;
    const response = await fetch(`${gatewayOrigin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    assert.equal(response.status, 200);
    assert.equal(homeworkPrepareRequests, 2);
    assert.deepEqual(JSON.parse((await response.json()).body), command);

    homeworkPrepareRequests = 0;
    homeworkFailuresRemaining = 1;
    const invalid = await fetch(`${gatewayOrigin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: 0 }),
    });
    assert.equal(invalid.status, 503);
    assert.equal((await invalid.json()).error.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(homeworkPrepareRequests, 1);
    homeworkFailuresRemaining = 0;
  });
  it("allowlists authenticated billing routes and forwards checkout idempotency", async () => {
    const response = await fetch(
      `${gatewayOrigin}/core-api/api/v1/billing/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer access",
          "Idempotency-Key": "checkout-event",
        },
        body: JSON.stringify({ planKey: "pro-monthly" }),
      },
    );
    const body = await response.json();
    assert.equal(body.path, "/api/v1/billing/checkout");
    assert.equal(body.applicationKey, "gotit");
    assert.equal(body.authorization, "Bearer access");
    assert.equal(body.eventId, "checkout-event");
  });
  it("rejects foreign origins, encoded proxy paths, unsupported bodies, and upstream redirects", async () => {
    assert.equal(
      (
        await fetch(`${gatewayOrigin}/gotit-api/api/v1/profile`, {
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${gatewayOrigin}/gotit-api/api/v1%2fprofile`)).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${gatewayOrigin}/gotit-api/api/v1/profile`, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "{}",
        })
      ).status,
      415,
    );
    assert.equal(
      (await fetch(`${gatewayOrigin}/gotit-api/api/v1/redirect`)).status,
      502,
    );
    assert.equal(
      (await fetch(`${gatewayOrigin}/core-api/api/v1/profile`)).status,
      404,
    );
  });
  it("forwards SDP only to the guarded Realtime connect endpoint", async () => {
    const response = await fetch(
      `${gatewayOrigin}/gotit-api/api/v1/realtime/connect`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer ticket",
          "Content-Type": "application/sdp",
        },
        body: "v=0\r\no=browser\r\n",
      },
    );
    assert.equal(response.status, 200);
    assert.match(await response.text(), /a=received:application\/sdp:/);
    assert.equal(
      (
        await fetch(`${gatewayOrigin}/gotit-api/api/v1/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: "v=0",
        })
      ).status,
      415,
    );
  });
  it("enforces canonical production HTTPS configuration", () => {
    assert.throws(() =>
      configuration({
        NODE_ENV: "production",
        CORE_API_PROXY_TARGET: "http://example.com",
        GOTIT_API_PROXY_TARGET: "https://api.example.com",
      }),
    );
    assert.throws(() =>
      configuration({
        NODE_ENV: "production",
        PUBLIC_APP_ORIGIN: "http://front.example.com",
      }),
    );
    const config = configuration({
      NODE_ENV: "production",
      PUBLIC_APP_ORIGIN: "https://front.example.com",
      CORE_API_PROXY_TARGET: "https://core.example.com",
      GOTIT_API_PROXY_TARGET: "https://api.example.com",
      TRUST_PROXY_HOPS: "1",
      PADDLE_ENVIRONMENT: "production",
    });
    assert.equal(config.origin, "https://front.example.com");
  });
});
