import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, it, expect, vi } from "vitest";
import i18n from "../src/i18n";
import { StructuredEnglishPage } from "../src/pages/StructuredEnglishPage";
import type {
  Curriculum,
  CurriculumAttempt,
} from "../src/lib/structuredEnglish";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  unit: vi.fn(),
  teacher: vi.fn(),
  teacherTurn: vi.fn(),
  start: vi.fn(),
  attempt: vi.fn(),
  answer: vi.fn(),
  heartbeat: vi.fn(),
  expose: vi.fn(),
  navigate: vi.fn(),
  pathChoice: vi.fn(),
}));
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: { id: "curriculum-user" } }),
}));
vi.mock("../src/lib/structuredEnglish", async (original) => ({
  ...(await original<typeof import("../src/lib/structuredEnglish")>()),
  curriculumApi: mocks,
}));
const data: Curriculum = {
  program: {
    id: "english-zero-c1",
    version: "2026-10-21.1",
    title: "אנגלית מאפס עד C1",
    researchStatus: "Not calibrated",
    attribution: "CC BY-SA 4.0",
  },
  enrolled: true,
  revision: 1,
  settings: { minutes: 10, literacy: "starting", timezone: "Asia/Jerusalem" },
  currentUnit: "P01",
  completed: {},
  drafts: {},
  cursors: {},
  placement: {},
  units: [
    {
      id: "P01",
      band: "Pre-A1",
      title: "ברכות",
      goal: "להציג את עצמנו",
      words: 12,
      unlocked: true,
      waived: false,
      lessons: [{ id: "P01-L1", title: "שיעור ראשון", minutes: 10 }],
      unseen: null,
    },
  ],
  phonics: [
    { id: "F01", title: "צלילים ראשונים", minutes: 12, unlocked: true },
  ],
  dailyPlan: [
    { kind: "review", minutes: 4 },
    { kind: "rotate", minutes: 5 },
    { kind: "wrap", minutes: 1 },
  ],
  review: {
    due: 0,
    introduced: 6,
    usable: 0,
    retained: 0,
    maintenance: 0,
    queue: [],
  },
  reading: {
    eligible: false,
    remainingTargets: 6,
    remainingMinutes: 30,
    minWords: 20,
    maxWords: 40,
  },
  activeMinutes: 0,
  articleJob: null,
  activeAttempts: {},
  nextAction: { kind: "words", id: "P01" },
  graduation: {
    ready: false,
    complete: false,
    skills: ["reading", "listening", "speaking", "writing"],
  },
  evidence: [],
  elective: { count: 957, optional: true, unlocked: false },
};
const attempt: CurriculumAttempt = {
  id: "11111111-1111-4111-a111-111111111111",
  activityId: "words:P01:recognition",
  version: "2026-10-21.1",
  cursor: 0,
  total: 6,
  result: null,
  question: {
    id: "question-0",
    kind: "recognition",
    prompt: "בחרו משמעות",
    text: null,
    hasAudio: false,
    audioParts: 0,
    hasHint: false,
    passage: null,
    picture: null,
    choices: [
      { id: "choice-a", text: "שלום" },
      { id: "choice-b", text: "להתראות" },
    ],
  },
  feedback: null,
  assisted: false,
};
const phase = (cursor = 0) => ({
  id: "P01-L1",
  band: "Pre-A1",
  title: "שיעור ראשון",
  minutes: 10,
  cursor,
  total: 14,
  complete: false,
  phase: {
    kind: "guided_production",
    instruction: "נסו להציג את עצמכם.",
    english: null,
    contrast: null,
    task: null,
    turns: null,
    support: null,
    passage: null,
    target: null,
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(data);
  mocks.heartbeat.mockResolvedValue({ activeSeconds: 0 });
  mocks.unit.mockResolvedValue({
    unit: {
      id: "P01",
      band: "Pre-A1",
      title: "ברכות",
      goal: "שיחה קצרה",
      grammar: "I am",
      words: Array.from({ length: 12 }, (_, index) => ({
        id: `P01-T${index + 1}`,
        en: `word${index + 1}`,
        he: `משמעות ${index + 1}`,
        unit: "P01",
        band: "Pre-A1",
        track: "communicative",
        evidence: { status: "introduced", dueAt: "2026-10-22" },
      })),
      games: ["recognition", "matching", "recall", "listening", "context"].map(
        (mode) => ({
          mode,
          practised: 0,
          eligible: ["recognition", "matching"].includes(mode) ? 6 : 0,
        }),
      ),
      support: [],
      dialogue: [],
      passage: "Hello. I am Ben.",
      writingPrompt: "Write.",
      roleplayPrompt: "Speak.",
      lessons: [
        {
          id: "P01-L1",
          title: "שיעור ראשון",
          minutes: 10,
          targets: Array.from({ length: 6 }, (_, index) => ({
            en: `word${index + 1}`,
            he: `משמעות ${index + 1}`,
          })),
        },
      ],
    },
  });
  mocks.start.mockResolvedValue(attempt);
  mocks.attempt.mockResolvedValue(attempt);
  mocks.teacher.mockResolvedValue(phase());
});
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <StructuredEnglishPage />
    </MemoryRouter>,
  );
describe("structured English live learner flow", () => {
  it("skips from the original roadmap without rendering a duplicate list", async () => {
    mocks.pathChoice.mockResolvedValue(undefined);
    const user = userEvent.setup();
    open("/english-learning?unit=P01");
    await screen.findByRole("heading", { name: i18n.t("programMap.roadmap") });
    expect(document.querySelector(".path-choices")).toBeNull();
    expect(document.querySelectorAll(".pm-roadmap")).toHaveLength(1);
    const row = document.querySelector('.pm-step[aria-current="step"]')!;
    await user.click(
      within(row as HTMLElement).getByRole("button", {
        name: new RegExp(`^${i18n.t("pathChoices.skip")}:`),
      }),
    );
    await user.click(
      within(row as HTMLElement).getByRole("button", {
        name: i18n.t("pathChoices.skip"),
        exact: true,
      }),
    );
    await waitFor(() =>
      expect(mocks.pathChoice).toHaveBeenCalledWith({
        unitId: "P01",
        activityId: "teacher:P01-L1",
        revision: 1,
        eventId: expect.any(String),
        skipped: true,
      }),
    );
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("opens the existing whole-unit smart game route without recording exposure or starting a questionnaire", async () => {
    const user = userEvent.setup();
    const { unit } = await mocks.unit();
    mocks.unit.mockResolvedValue({
      unit: {
        ...unit,
        words: unit.words.map((word: object) => ({ ...word, evidence: null })),
        games: unit.games.map((game: object) => ({ ...game, eligible: 0 })),
      },
    });
    open("/english-learning?view=words&unit=P01");
    const smart = await screen.findByRole("button", {
      name: i18n.t("dashboard.smartPractice"),
    });
    expect(smart).toBeEnabled();
    await user.click(smart);
    const url = new URL(
      mocks.navigate.mock.calls[0][0],
      "https://example.test",
    );
    expect(url.pathname).toBe("/learn/session/smart");
    expect(url.searchParams.get("curriculumUnit")).toBe("P01");
    expect(url.searchParams.get("count")).toBe("12");
    expect(url.searchParams.get("language")).toBe("en");
    expect(url.searchParams.get("return")).toBe(
      "/english-learning?view=words&unit=P01",
    );
    expect(url.searchParams.has("pack")).toBe(false);
    expect(url.searchParams.has("items")).toBe(false);
    expect(mocks.expose).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("resumes the actual multi-game session instead of a legacy vocabulary questionnaire", async () => {
    const user = userEvent.setup();
    const resume = "22222222-2222-4222-8222-222222222222";
    mocks.get.mockResolvedValue({
      ...data,
      practiceSessions: { P01: resume },
      activeAttempts: { "words:P01:recognition": attempt.id },
    });
    open("/english-learning?view=words&unit=P01");
    await user.click(
      await screen.findByRole("button", {
        name: i18n.t("dashboard.smartPractice"),
      }),
    );
    const url = new URL(
      mocks.navigate.mock.calls[0][0],
      "https://example.test",
    );
    expect(url.pathname).toBe("/learn/session/smart");
    expect(url.searchParams.get("resume")).toBe(resume);
    expect(mocks.attempt).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("does not enable smart practice while inspecting a locked unit", async () => {
    mocks.get.mockResolvedValue({
      ...data,
      units: data.units.map((unit) => ({ ...unit, unlocked: false })),
    });
    open("/english-learning?view=words&unit=P01");
    expect(
      await screen.findByRole("button", { name: "לתרגול החכם" }),
    ).toBeDisabled();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("renders the existing illustrated program map with the new content", async () => {
    const { container } = open("/english-learning");
    await screen.findByRole("heading", { name: /Pre-A1 · ברכות/ });
    expect(
      container.querySelector(".program-unit-map .pm-hero-art"),
    ).toHaveAttribute("src", "/assets/program-map/hero.webp");
    expect(
      container.querySelector(".pm-roadmap .pm-steps"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".pm-sidebar .pm-keywords"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".c1-nav, .c1-stats, .c1-unit-grid"),
    ).toBeNull();
  });
  it("shows six words at a time, gates later games, and reveals feedback only after submission", async () => {
    const user = userEvent.setup();
    const page = open("/english-zero-c1?view=words&unit=P01");
    await screen.findByText("word6");
    expect(screen.getByText("word6")).toBeVisible();
    expect(screen.queryByText("word7")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /שליפה מעברית/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /זיהוי משמעות/ }));
    expect(mocks.navigate).toHaveBeenCalled();
    page.unmount();
    open(`/english-learning?view=attempt&attempt=${attempt.id}&unit=P01`);
    await screen.findByRole("heading", { name: "בחרו משמעות" });
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    const next = {
      ...attempt,
      cursor: 1,
      question: {
        ...attempt.question!,
        id: "question-1",
        prompt: "המשמעות הבאה",
      },
      feedback: {
        correct: true,
        message: true,
        criteria: [true, true, true, true],
        feedback: "מתאים.",
        answer: "hello",
        independent: false,
        modality: "typed",
      },
    };
    mocks.answer.mockResolvedValue(next);
    mocks.attempt.mockResolvedValue(next);
    await user.click(screen.getByRole("button", { name: "שלום", exact: true }));
    await screen.findByText("hello");
    expect(mocks.answer).toHaveBeenCalledTimes(1);
    expect(mocks.answer.mock.calls[0]?.[4]).toBe("choice-a");
    expect(screen.getByText("המשמעות הבאה")).toBeVisible();
  });
  it("retains a teacher draft and reuses the exact operation and revision after a lost response", async () => {
    const user = userEvent.setup();
    open("/english-zero-c1?view=teacher&lesson=P01-L1&unit=P01");
    await screen.findByText("נסו להציג את עצמכם.");
    const box = screen.getByRole("textbox", { name: "התשובה או השאלה שלכם" });
    await user.type(box, "My name is Noa.");
    mocks.teacherTurn
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({
        feedback: "המשמעות ברורה.",
        advanced: true,
        assisted: false,
        complete: false,
      });
    await user.click(screen.getByRole("button", { name: "שליחה והמשך" }));
    await screen.findByRole("alert");
    expect(box).toHaveValue("My name is Noa.");
    mocks.get.mockResolvedValue({ ...data, revision: 2 });
    mocks.teacher.mockResolvedValue(phase(1));
    await user.click(screen.getByRole("button", { name: "שליחה והמשך" }));
    await waitFor(() => expect(mocks.teacherTurn).toHaveBeenCalledTimes(2));
    expect(mocks.teacherTurn.mock.calls[1]).toEqual(
      mocks.teacherTurn.mock.calls[0],
    );
    await screen.findByText("המשמעות ברורה.");
  });
});
