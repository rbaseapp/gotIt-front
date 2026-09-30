import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { LastLessonCard } from "../src/components/LastLessonCard";
import type { SavedPrivateLesson } from "../src/lib/privateLesson";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../src/lib/privateLesson", () => ({ listPrivateLessons: mocks.list }));

const itemId = "11111111-1111-4111-8111-111111111111";
const lesson = {
  id: "22222222-2222-4222-8222-222222222222",
  status: "completed",
  topic: "Past tense",
  targetLanguageCode: "en",
  supportLanguageCode: "he",
  endedAt: "2026-09-29T10:00:00.000Z",
  report: {
    summary: "למדנו לתאר אירוע בעבר ולשאול מתי התרחש.",
    corrections: [
      {
        original: "I go yesterday",
        corrected: "I went yesterday",
        explanation: "לאירוע שהסתיים בעבר משתמשים בצורת העבר.",
      },
    ],
    nextLessonPlan: "לתרגל תשובה מלאה על מה שעשית אתמול.",
    recommendedReviewItemIds: [itemId],
  },
} as SavedPrivateLesson;

function show() {
  return render(
    <MemoryRouter>
      <LastLessonCard />
    </MemoryRouter>,
  );
}

beforeEach(() => mocks.list.mockReset());

it("shows a concise teaching recap and links to available lesson review", async () => {
  mocks.list.mockResolvedValue([
    { ...lesson, status: "summarizing", report: null },
    lesson,
  ]);
  show();
  expect(
    await screen.findByRole("region", { name: "מה למדנו בשיעור האחרון" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("למדנו לתאר אירוע בעבר ולשאול מתי התרחש."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("לאירוע שהסתיים בעבר משתמשים בצורת העבר."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "תרגול מהשיעור האחרון" }),
  ).toHaveAttribute("href", `/learn/session/smart?items=${itemId}`);
  expect(screen.getByRole("link", { name: "יומן השיעורים" })).toHaveAttribute(
    "href",
    "/private-lesson?practice=free",
  );
});

it("hides the practice action when no review was recommended", async () => {
  mocks.list.mockResolvedValue([
    { ...lesson, report: { ...lesson.report!, recommendedReviewItemIds: [] } },
  ]);
  show();
  await screen.findByRole("region", { name: "מה למדנו בשיעור האחרון" });
  expect(
    screen.queryByRole("link", { name: "תרגול מהשיעור האחרון" }),
  ).not.toBeInTheDocument();
});

it("does not show an unfinished lesson as a recap", async () => {
  mocks.list.mockResolvedValue([
    { ...lesson, status: "summarizing", report: null },
  ]);
  show();
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(50));
  expect(
    screen.queryByRole("region", { name: "מה למדנו בשיעור האחרון" }),
  ).not.toBeInTheDocument();
});
