import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ProgramsPage } from "../src/pages/ProgramsPage";
import { FeedbackProvider } from "../src/components/Feedback";
import { product, type WordPack } from "../src/lib/product";
import i18n from "../src/i18n";

const state = vi.hoisted(() => ({
  profile: {
    defaultSourceLanguage: null as string | null,
    defaultTranslationLanguage: null as string | null,
  },
  updateProfile: vi.fn(),
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: null, ...state }),
}));
vi.mock("../src/lib/courses", () => ({
  courseApi: { list: async () => ({ courses: [] }) },
}));
vi.mock("../src/lib/product", async (original) => ({
  ...(await original<object>()),
  product: vi.fn(),
}));
const pack: WordPack = {
  id: "d3000000-0000-4000-8000-000000000001",
  slug: "first",
  title: "First unit",
  description: "",
  moduleNumber: 1,
  version: 1,
  wordCount: 50,
  installed: false,
  installedVersion: null,
  topic: {
    id: "d3000000-0000-4000-8000-000000000001",
    slug: "english-learning-path-en-he",
    title: "English",
  },
  track: {
    id: "d3000000-0000-4000-8000-000000000001",
    slug: "basic",
    title: "Basic",
    levelCode: "beginner",
    cefrFrom: "A1",
    cefrTo: "A2",
    sourceLanguageCode: "en",
    translationLanguageCode: "he",
  },
  progress: {
    linked: 0,
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
    due: 0,
  },
};
function mount() {
  render(
    <MemoryRouter initialEntries={["/courses?choose=1"]}>
      <FeedbackProvider>
        <Routes>
          <Route path="/courses" element={<ProgramsPage />} />
          <Route path="/english-learning" element={<h1>Opened map</h1>} />
        </Routes>
      </FeedbackProvider>
    </MemoryRouter>,
  );
}
const button = () =>
  screen.getByRole("button", { name: i18n.t("pathUi.openFromZero") });
beforeEach(() => {
  state.profile = {
    defaultSourceLanguage: null,
    defaultTranslationLanguage: null,
  };
  state.updateProfile.mockReset().mockResolvedValue(undefined);
  vi.mocked(product)
    .mockReset()
    .mockImplementation(
      async (_schema, path) =>
        ({
          packs:
            path.includes("sourceLanguageCode=en&translationLanguageCode=he") ||
            state.updateProfile.mock.calls.length > 0
              ? [pack]
              : [],
        }) as never,
    );
});
it("opens the published English/Hebrew path for a new account after saving the selected pair", async () => {
  let finishSave!: () => void;
  state.updateProfile.mockReturnValue(
    new Promise<void>((resolve) => {
      finishSave = resolve;
    }),
  );
  mount();
  await waitFor(() => expect(button()).toBeEnabled());
  fireEvent.click(button());
  expect(state.updateProfile).toHaveBeenCalledWith({
    defaultSourceLanguage: "en",
    defaultTranslationLanguage: "he",
  });
  expect(screen.queryByText("Opened map")).not.toBeInTheDocument();
  await act(async () => finishSave());
  expect(await screen.findByText("Opened map")).toBeInTheDocument();
});
it("switches the published pair on older servers but verifies the catalog before opening", async () => {
  state.profile = {
    defaultSourceLanguage: "ar",
    defaultTranslationLanguage: "he",
  };
  vi.mocked(product).mockResolvedValue({ packs: [] } as never);
  mount();
  const target = screen.getByRole("combobox", {
    name: i18n.t("courses.targetLanguage"),
  });
  fireEvent.focus(target);
  fireEvent.click(screen.getByRole("option", { name: /^English/u }));
  await waitFor(() => expect(button()).toBeEnabled());
  expect(
    screen.queryByText(i18n.t("pathUi.pairUnavailable")),
  ).not.toBeInTheDocument();
  fireEvent.click(button());
  expect(
    await screen.findByText(i18n.t("englishPath.unavailableTitle")),
  ).toBeInTheDocument();
  expect(state.updateProfile).toHaveBeenCalledWith({
    defaultSourceLanguage: "en",
    defaultTranslationLanguage: "he",
  });
  expect(screen.queryByText("Opened map")).not.toBeInTheDocument();
});
it("checks the newly selected pair instead of the saved profile pair", async () => {
  state.profile = {
    defaultSourceLanguage: "fr",
    defaultTranslationLanguage: "he",
  };
  mount();
  expect(
    await screen.findByText(i18n.t("pathUi.pairUnavailable")),
  ).toBeInTheDocument();
  fireEvent.focus(
    screen.getByRole("combobox", { name: i18n.t("courses.targetLanguage") }),
  );
  fireEvent.click(screen.getByRole("option", { name: /^English/u }));
  await waitFor(() => expect(button()).toBeEnabled());
  expect(
    screen.queryByText(i18n.t("pathUi.pairUnavailable")),
  ).not.toBeInTheDocument();
  expect(state.updateProfile).not.toHaveBeenCalled();
});
it("does not call a pending catalog unsupported", async () => {
  let finish!: () => void;
  vi.mocked(product).mockImplementation(async (_schema, path) => {
    if (path.includes("?"))
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    return { packs: path.includes("?") ? [pack] : [] } as never;
  });
  mount();
  expect(button()).toBeDisabled();
  expect(
    screen.queryByText(i18n.t("pathUi.pairUnavailable")),
  ).not.toBeInTheDocument();
  await act(async () => finish());
  await waitFor(() => expect(button()).toBeEnabled());
});
it("shows failed catalog loading with retry and keeps the map closed if saving fails", async () => {
  vi.mocked(product)
    .mockRejectedValueOnce(new Error("catalog failed"))
    .mockRejectedValueOnce(new Error("catalog failed"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("catalog failed");
  expect(
    screen.queryByText(i18n.t("pathUi.pairUnavailable")),
  ).not.toBeInTheDocument();
  expect(button()).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: i18n.t("common.tryAgain") }),
  );
  await waitFor(() => expect(button()).toBeEnabled());
  state.updateProfile.mockRejectedValue(new Error("save failed"));
  fireEvent.click(button());
  expect(await screen.findByText("save failed")).toBeInTheDocument();
  expect(screen.queryByText("Opened map")).not.toBeInTheDocument();
});
