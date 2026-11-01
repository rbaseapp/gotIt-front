import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { AppProvider } from "../src/context/AppContext";
import { FeedbackProvider } from "../src/components/Feedback";
import { clearTokens, hasStoredSession, setTokens } from "../src/lib/api";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function mount(me: () => Response) {
  clearTokens();
  vi.stubEnv("VITE_DEMO_MODE", "false");
  setTokens({ accessToken: "access", refreshToken: "refresh", expiresIn: 900 });
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith("/auth/me")
      ? me()
      : url.endsWith("/auth/refresh")
        ? json({ error: { code: "INVALID_REFRESH_TOKEN" } }, 401)
        : json({ error: { code: "TEST_UNHANDLED_ROUTE" } }, 404),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <FeedbackProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </FeedbackProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearTokens();
});

it("keeps the learner signed in while the server is down, and offers a retry", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const fetchMock = mount(() =>
    json({ error: { code: "SERVICE_UNAVAILABLE" } }, 503),
  );
  // The first answer and the three retries all fail.
  await vi.advanceTimersByTimeAsync(12_000);
  expect(
    await screen.findByText(/השרת מתעורר/, undefined, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/me")),
  ).toHaveLength(4);
  expect(hasStoredSession()).toBe(true);
  expect(
    screen.queryByRole("heading", { name: "כניסה ל־GotIt" }),
  ).not.toBeInTheDocument();
  vi.useRealTimers();
  fetchMock.mockClear();
  await userEvent.click(screen.getByRole("button", { name: "לנסות שוב" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
});

it("still signs out when the server rejects the session", async () => {
  mount(() => json({ error: { code: "UNAUTHORIZED" } }, 401));
  expect(
    await screen.findByRole("heading", { name: "כניסה ל־GotIt" }),
  ).toBeInTheDocument();
  expect(hasStoredSession()).toBe(false);
});
