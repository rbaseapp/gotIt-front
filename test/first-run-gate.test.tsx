import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { FirstRunGate } from "../src/components/onboarding/FirstRunGate";
import { markFirstRunSkipped } from "../src/lib/onboarding/firstRun";

const state = vi.hoisted(() => ({
  curriculum: {} as Record<string, unknown>,
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ mode: "live", user: { id: "learner-1" } }),
}));
vi.mock("../src/lib/structuredEnglish", () => ({
  curriculumApi: { get: async () => state.curriculum },
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <FirstRunGate>
        <Routes>
          <Route path="/start" element={<div>level check</div>} />
          <Route path="*" element={<div>app</div>} />
        </Routes>
      </FirstRunGate>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  state.curriculum = { onboarding: null, completed: {} };
});

it("sends a new learner from the dashboard to the level check", async () => {
  renderAt("/dashboard");
  expect(await screen.findByText("level check")).toBeInTheDocument();
});

it("leaves deep links alone", async () => {
  renderAt("/courses");
  expect(await screen.findByText("app")).toBeInTheDocument();
});

it("does not ask again once the level is saved", async () => {
  state.curriculum = { onboarding: { startUnit: 12 }, completed: {} };
  renderAt("/dashboard");
  expect(await screen.findByText("app")).toBeInTheDocument();
});

it("does not interrupt learners with progress", async () => {
  state.curriculum = { onboarding: null, completed: { "gate:u1": true } };
  renderAt("/dashboard");
  expect(await screen.findByText("app")).toBeInTheDocument();
});

it("respects 'not now'", async () => {
  markFirstRunSkipped("learner-1");
  renderAt("/");
  await waitFor(() => expect(screen.getByText("app")).toBeInTheDocument());
});
