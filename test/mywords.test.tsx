import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DevMyWordsPage } from "../src/pages/DevMyWordsPage";
import { FeedbackProvider } from "../src/components/Feedback";
import { seedProfile } from "../src/data/seed";
import { clearTokens, setTokens } from "../src/lib/api";
import {
  memorySegments,
  myWordsDesignEnabled,
  reviewDay,
  sourceLink,
} from "../src/lib/myWords";
import { cardId, myWordCards, myWordsDashboard } from "./mywords-fixtures";
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ profile: seedProfile }),
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({ hasEntitlement: () => true }),
}));
const requests: Array<{ url: URL; init?: RequestInit }> = [];
beforeEach(() => {
  setTokens({ accessToken: "test", refreshToken: "test", expiresIn: 3600 });
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      requests.push({ url, init });
      let body: unknown;
      if (url.pathname.endsWith("dashboard/languages"))
        body = {
          languages: [
            { code: "en", count: 248 },
            { code: "ar", count: 0 },
          ],
        };
      else if (url.pathname.endsWith("/dashboard")) body = myWordsDashboard;
      else if (url.pathname.endsWith("/word-packs")) body = { packs: [] };
      else if (url.pathname.endsWith("/tags"))
        body = { tags: [{ id: cardId(90), name: "עסקים" }], nextCursor: null };
      else if (url.pathname.endsWith("/bulk")) {
        const data = JSON.parse(String(init?.body));
        body = { ids: data.ids, action: data.action };
      } else if (url.pathname.endsWith("/learning-items")) {
        const search = url.searchParams.get("search");
        const page = Number(url.searchParams.get("page") || 1);
        const cards = search
          ? myWordCards.filter((c) =>
              `${c.sourceText} ${c.primaryTranslation}`.includes(search),
            )
          : myWordCards;
        body = {
          items: page === 1 ? cards.slice(0, 9) : cards.slice(9),
          nextCursor: null,
          summary: {
            ...myWordsDashboard.counts,
            tags: { [cardId(90)]: 1 },
            topics: {},
          },
          totalCount: cards.length,
          page,
          pageCount: Math.ceil(cards.length / 9) || 1,
        };
      } else throw new Error(`Unexpected ${url}`);
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});
afterEach(clearTokens);
const mount = (entry = "/vocabulary") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <FeedbackProvider>
        <DevMyWordsPage />
      </FeedbackProvider>
    </MemoryRouter>,
  );
describe("DEV my words", () => {
  it("preserves a returned selection and resets pagination for a changed search", async () => {
    mount(
      `/vocabulary?library.page=2&library.selected=${cardId(10)}&library.language=en`,
    );
    await screen.findByRole("article", { name: /itinerary/ });
    expect(screen.getByRole("toolbar")).toBeVisible();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "revenue" },
    });
    await screen.findByRole("article", { name: /revenue/ });
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(
      requests.some(
        (r) =>
          r.url.searchParams.get("search") === "revenue" &&
          r.url.searchParams.get("page") === "1",
      ),
    ).toBe(true);
  });
  it("restricts rollout and uses calendar review dates in the profile timezone", () => {
    expect(myWordsDesignEnabled("gotit-dev.rbaseapp.com", false)).toBe(true);
    expect(myWordsDesignEnabled("127.0.0.1", true)).toBe(true);
    for (const host of [
      "gotit.rbaseapp.com",
      "gotit-dev.rbaseapp.com.example.com",
      "example.com",
    ])
      expect(myWordsDesignEnabled(host, true)).toBe(false);
    expect(
      reviewDay(
        "2026-10-12T21:30:00Z",
        "Asia/Jerusalem",
        new Date("2026-10-12T20:00:00Z"),
      ),
    ).toBe(1);
    expect(reviewDay(null, "UTC")).toBeNull();
    expect(memorySegments(140)).toBe(5);
    expect(sourceLink("javascript:alert(1)")).toBeUndefined();
  });
  it("renders complete card metadata and an accessible drawer with highlighted real context", async () => {
    mount();
    const card = await screen.findByRole("article", {
      name: "revenue · הכנסות",
    });
    expect(within(card).getByText("(n)")).toBeVisible();
    expect(within(card).getByText("ft.com")).toBeVisible();
    expect(
      requests.some(
        (r) =>
          r.url.pathname.endsWith("/word-packs") &&
          r.url.searchParams.get("sourceLanguageCode") === "en" &&
          r.url.searchParams.get("translationLanguageCode") === "he",
      ),
    ).toBe(true);
    expect(
      within(card).getByRole("img", { name: "חוזק זיכרון 2 מתוך 5" }),
    ).toBeVisible();
    fireEvent.click(
      within(card).getByRole("button", { name: /הכנסות.*revenue/ }),
    );
    const drawer = await screen.findByRole("dialog", { name: "revenue" });
    expect(within(drawer).getByText("0/0")).toBeVisible();
    expect(drawer.querySelector("mark")).toHaveTextContent("revenue");
    expect(
      within(drawer).getByRole("link", { name: "ft.com" }),
    ).toHaveAttribute("href", "https://ft.com/article");
    fireEvent.click(within(drawer).getByRole("button", { name: "סגירה" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("keeps a server-wide debounced search and server filters; appends the next page once", async () => {
    mount();
    await screen.findByRole("article", { name: "revenue · הכנסות" });
    fireEvent.click(screen.getByRole("button", { name: "להציג עוד מילים" }));
    await screen.findByRole("article", { name: "itinerary · מסלול נסיעה" });
    expect(screen.getAllByRole("article")).toHaveLength(10);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "הכנסות" },
    });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "סינון" }));
    fireEvent.click(screen.getByRole("button", { name: "מהתוסף" }));
    fireEvent.click(screen.getByRole("button", { name: "שם עצם" }));
    await waitFor(() =>
      expect(
        requests.some(
          (r) =>
            r.url.searchParams.get("origins") === "chrome_extension" &&
            r.url.searchParams.get("partsOfSpeech") === "noun,n",
        ),
      ).toBe(true),
    );
    expect(
      requests
        .filter((r) => r.url.pathname.endsWith("learning-items"))
        .every((r) => r.url.searchParams.get("view") === "cards"),
    ).toBe(true);
  });
  it("uses only explicitly selected IDs for practice and confirmed server mutations", async () => {
    mount();
    await screen.findByRole("article", { name: "revenue · הכנסות" });
    fireEvent.click(screen.getByRole("checkbox", { name: /revenue/ }));
    const toolbar = screen.getByRole("toolbar");
    expect(
      within(toolbar)
        .getByRole("link", { name: "לתרגל אותן" })
        .getAttribute("href"),
    ).toContain(`items=${cardId(1)}`);
    fireEvent.click(
      within(toolbar).getByRole("button", { name: "סימון ידני כנלמד" }),
    );
    const confirm = await screen.findByRole("dialog");
    fireEvent.click(
      within(confirm).getByRole("button", { name: "סימון ידני כנלמד" }),
    );
    await waitFor(() =>
      expect(requests.some((r) => r.url.pathname.endsWith("/bulk"))).toBe(true),
    );
    const body = JSON.parse(
      String(
        requests.find((r) => r.url.pathname.endsWith("/bulk"))?.init?.body,
      ),
    );
    expect(body).toEqual({ ids: [cardId(1)], action: "mark_mastered" });
  });
});
