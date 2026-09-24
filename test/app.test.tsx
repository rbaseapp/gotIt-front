import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { AppProvider } from "../src/context/AppContext";
import { clearTokens } from "../src/lib/api";
import { seedItems, seedProfile } from "../src/data/seed";
import { FeedbackProvider } from "../src/components/Feedback";

function mount(path = "/dashboard", demo = true) {
  vi.stubEnv("VITE_DEMO_MODE", demo ? "true" : "false");
  clearTokens();
  if (demo) localStorage.setItem("gotit.mode", JSON.stringify("demo"));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </FeedbackProvider>
    </MemoryRouter>,
  );
}
describe("complete frontend flows", () => {
  it("traverses the full immutable eight-word queue without repeats as evidence updates state", async () => {
    mount("/learn/session/flashcards");
    const user = userEvent.setup();
    const seen = new Set<string>();
    await screen.findByRole("button", { name: "גילוי התשובה" });
    for (let index = 0; index < 8; index++) {
      const source = screen.getByRole("heading", { level: 1 }).textContent!;
      expect(seen.has(source)).toBe(false);
      seen.add(source);
      await user.click(screen.getByRole("button", { name: "גילוי התשובה" }));
      await user.click(screen.getByRole("button", { name: "זכרתי" }));
    }
    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    expect(
      JSON.parse(localStorage.getItem("gotit.demo.v2")!).attempts,
    ).toHaveLength(8);
  });
  it("explicitly merges an occurrence into an existing sense without replacing its accepted meaning", async () => {
    mount("/vocabulary");
    const user = userEvent.setup();
    await user.click(
      (await screen.findAllByRole("button", { name: "מילה חדשה" }))[0],
    );
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("מילה או ביטוי"), "wander");
    await user.type(
      within(dialog).getByLabelText("המשמעות המדויקת"),
      "a different translation",
    );
    await user.type(
      within(dialog).getByLabelText(/משפט מקור/),
      "We wander together.",
    );
    await user.click(
      within(dialog).getByRole("radio", { name: /הוספת ההקשר/ }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "הוספת ההקשר" }),
    );
    const state = JSON.parse(localStorage.getItem("gotit.demo.v2")!);
    expect(state.items).toHaveLength(seedItems.length);
    expect(
      state.items.find((item: { id: string }) => item.id === "wander")
        .translation,
    ).toBe("לשוטט");
    expect(
      state.items
        .find((item: { id: string }) => item.id === "wander")
        .occurrences.at(-1).context,
    ).toBe("We wander together.");
  });
  it("completes a stable matching board and records each matched item separately", async () => {
    mount("/learn/session/matching");
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "מצאו את כל הזוגות" });
    const ids = JSON.parse(localStorage.getItem("gotit.demo.v2")!).sessions[0]
      .itemIds;
    for (const id of ids) {
      const item = seedItems.find((value) => value.id === id)!;
      await user.click(
        screen.getByRole("button", { name: item.source, exact: true }),
      );
      await user.click(
        screen.getByRole("button", { name: item.translation, exact: true }),
      );
    }
    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    expect(
      JSON.parse(localStorage.getItem("gotit.demo.v2")!).attempts.map(
        (value: { itemId: string }) => value.itemId,
      ),
    ).toEqual(ids);
  });
  it("offers a three-word drag and drop round in demo mode", async () => {
    mount("/learn/session/drag_drop");
    const user = userEvent.setup();
    await screen.findByRole("heading", {
      name: "התאימו כל פירוש למילה",
    });
    expect(document.querySelectorAll(".drag-drop-row")).toHaveLength(3);
    expect(document.querySelectorAll(".meaning-card")).toHaveLength(3);
    const ids = JSON.parse(localStorage.getItem("gotit.demo.v2")!).sessions[0]
      .itemIds;
    expect(ids).toHaveLength(3);

    for (const id of ids) {
      const item = seedItems.find((value) => value.id === id)!;
      await user.click(
        screen.getByRole("button", {
          name: `גרירת הפירוש: ${item.translation}`,
        }),
      );
      await user.click(
        screen.getByRole("button", {
          name: `משבצת פירוש ריקה עבור ${item.source}`,
        }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: `הפירוש ששובץ: ${item.translation}`,
          }),
        ).toBeDisabled(),
      );
    }

    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    expect(
      JSON.parse(localStorage.getItem("gotit.demo.v2")!).attempts.map(
        (value: { itemId: string }) => value.itemId,
      ),
    ).toEqual(ids);
  });
  it("handles microphone denial honestly and skips pronunciation without an invented score or XP", async () => {
    const getUserMedia = vi.fn(async () => {
      throw new DOMException("Denied", "NotAllowedError");
    });
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia },
    });
    vi.stubGlobal("MediaRecorder", class {});
    mount("/learn/session/pronunciation?items=wander");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "לחצו ודברו" }));
    expect(await screen.findByText(/הרשאת מיקרופון נדחתה/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "המשך ללא ציון" }));
    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    expect(
      JSON.parse(localStorage.getItem("gotit.demo.v2")!).attempts[0],
    ).toMatchObject({ result: "skipped", xp: 0 });
  });
  it("opens the library, searches, and soft deletes then restores a word", async () => {
    mount("/vocabulary");
    const user = userEvent.setup();
    const search = await screen.findByRole("textbox", {
      name: "חיפוש באוצר המילים",
    });
    await user.type(search, "wander");
    await user.click(screen.getByRole("button", { name: /^wander/ }));
    await user.click(screen.getByRole("button", { name: "מחיקת מילה" }));
    await user.click(screen.getByRole("button", { name: "מחיקה רכה" }));
    expect(
      screen.queryByRole("button", { name: /^wander/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "נמחקו" }));
    await user.click(screen.getByRole("button", { name: /^wander/ }));
    await user.click(screen.getByRole("button", { name: "שחזור מילה" }));
    expect(
      JSON.parse(localStorage.getItem("gotit.demo.v2")!).items.find(
        (item: { id: string }) => item.id === "wander",
      ).deletedAt,
    ).toBeNull();
  });
  it("completes a targeted flashcard, replays with capped XP, and retains a stable queue", async () => {
    mount("/learn/session/flashcards?items=wander");
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "wander" });
    await user.click(screen.getByRole("button", { name: "גילוי התשובה" }));
    expect(
      ["לא זכרתי", "התאמצתי", "זכרתי"].map((name) =>
        screen.getByRole("button", { name }),
      ),
    ).toHaveLength(3);
    expect(
      screen.queryByRole("button", { name: "זכרתי מיד" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "זכרתי" }));
    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    await user.click(screen.getByRole("button", { name: "עוד סיבוב" }));
    await screen.findByRole("heading", { name: "wander" });
    await user.click(screen.getByRole("button", { name: "גילוי התשובה" }));
    await user.click(screen.getByRole("button", { name: "זכרתי" }));
    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    const persisted = JSON.parse(localStorage.getItem("gotit.demo.v2")!);
    expect(persisted.attempts).toHaveLength(2);
    expect(persisted.attempts.map((value: { xp: number }) => value.xp)).toEqual(
      [10, 0],
    );
    expect(
      persisted.sessions.filter(
        (value: { status: string }) => value.status === "completed",
      ),
    ).toHaveLength(2);
  });
  it("requires a corrected spelling before proceeding after a partial typo", async () => {
    mount("/learn/session/listening?items=wander");
    const user = userEvent.setup();
    const answer = await screen.findByRole("textbox", { name: "התשובה שלך" });
    expect(document.querySelectorAll(".letter-box")).toHaveLength(6);
    await user.type(answer, "wandr");
    await user.click(screen.getByRole("button", { name: "בדיקה" }));
    expect(screen.getByRole("button", { name: "להמשיך" })).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", {
        name: "הקלידו את המילה הנכונה כדי לחזק את הזיכרון",
      }),
      "wander",
    );
    await user.click(screen.getByRole("button", { name: "להמשיך" }));
    await screen.findByRole("heading", { name: "עבודה מעולה!" });
    const event = JSON.parse(localStorage.getItem("gotit.demo.v2")!)
      .attempts[0];
    expect(event.score).toBe(65);
    expect(event.userAnswer).toBe("wandr");
    expect(event.result).toBe("partially_correct");
  });
  it("reading does not create practice evidence or XP", async () => {
    mount("/reading");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "פתיחת דוגמת קריאה" }),
    );
    expect(
      screen.getByText("עצם הקריאה אינה מעלה שליטה או XP."),
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("gotit.demo.v2")!).attempts).toEqual(
      [],
    );
    expect(JSON.parse(localStorage.getItem("gotit.readings.v1")!)).toHaveLength(
      1,
    );
  });
  it("validates login password policy and does not issue invented product requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mount("/dashboard", false);
    const password = await screen.findByLabelText("סיסמה");
    expect(password).toHaveAttribute("minlength", "12");
    expect(password).toHaveAttribute("maxlength", "128");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("loads and patches the real profile without leaking demo data or identity fields", async () => {
    const identity = {
      id: "11111111-1111-4111-8111-111111111111",
      applicationId: "22222222-2222-4222-8222-222222222222",
      email: "real@example.com",
      emailVerified: false,
      status: "active",
    };
    const tokens = {
      accessToken: "access-test",
      refreshToken: "refresh-test",
      expiresIn: 900,
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/login"))
        return new Response(JSON.stringify({ user: identity, ...tokens }));
      if (url.endsWith("/auth/me"))
        return new Response(JSON.stringify({ user: identity }));
      if (url.endsWith("/profile"))
        return new Response(
          JSON.stringify({
            profile:
              init?.method === "PATCH"
                ? JSON.parse(init.body as string)
                : seedProfile,
          }),
        );
      if (url.includes("/learning-items?"))
        return new Response(JSON.stringify({ items: [], nextCursor: null }));
      if (url.includes("/tags"))
        return new Response(JSON.stringify({ tags: [] }));
      throw new Error("Unexpected API route");
    });
    vi.stubGlobal("fetch", fetchMock);
    mount("/settings", false);
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("כתובת אימייל"),
      identity.email,
    );
    await user.type(screen.getByLabelText("סיסמה"), "safe-password-123");
    const form = screen.getByLabelText("סיסמה").closest("form")!;
    fireEvent.submit(form);
    await screen.findByRole("heading", { name: "הגדרות" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "שמירת שינויים" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "שמירת שינויים" }));
    await screen.findByRole("button", { name: "נשמר בהצלחה" });
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(JSON.parse(patch[1]!.body as string)).not.toHaveProperty("email");
    expect(JSON.parse(patch[1]!.body as string)).not.toHaveProperty("name");
    expect(sessionStorage.getItem("gotit.refresh")).toBe("refresh-test");
    expect(localStorage.getItem("gotit.auth")).toBeNull();
    await user.click(screen.getByRole("link", { name: "אוצר מילים" }));
    expect(
      await screen.findByRole("heading", { name: "אוצר המילים שלי" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "אין מילים להצגה" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("wander")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).queryByRole("table"),
    ).not.toBeInTheDocument();
  });
});
