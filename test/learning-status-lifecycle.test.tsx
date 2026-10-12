import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import {
  LearningStatusProvider,
  PersistentLearningStatusBar,
} from "../src/components/LearningStatusProvider";
import { LearningStatusSource } from "../src/components/LearningStatusSource";
import type { LearningStatusBarProps } from "../src/components/LearningStatusBar";

const language = {
  value: "en",
  options: ["en", "ar"],
  translationCode: "he",
  onChange: vi.fn(),
};
const loaded: LearningStatusBarProps = {
  goal: { type: "items", current: 17, value: 20 },
  streakDays: 2,
  language,
};

function Fixture({
  page = "today",
  status = loaded,
  owner = "learner-a",
}: {
  page?: string;
  status?: LearningStatusBarProps | null;
  owner?: string;
}) {
  return (
    <LearningStatusProvider enabled key={owner}>
      <PersistentLearningStatusBar />
      {status && <LearningStatusSource key={page} {...status} />}
    </LearningStatusProvider>
  );
}

it("retains DOM nodes and known metrics through controller gaps, loading and failed refreshes", () => {
  const view = render(<Fixture />);
  const bar = document.querySelector(".learning-status-bar");
  const progress = screen.getByRole("progressbar");
  const streak = document.querySelector(".learning-status-streak");
  const mutations = new MutationObserver(() => {});
  mutations.observe(view.container, { childList: true, subtree: true });
  view.rerender(<Fixture page="practice" status={null} />);
  expect(document.querySelector(".learning-status-bar")).toBe(bar);
  expect(screen.getByRole("combobox")).toBeDisabled();
  view.rerender(<Fixture page="words" status={{ language }} />);
  expect(screen.getByRole("progressbar")).toBe(progress);
  expect(progress).toHaveAttribute("value", "17");
  expect(document.querySelector(".learning-status-streak")).toBe(streak);
  expect(streak).toHaveTextContent("2");
  expect(screen.getByRole("combobox")).not.toBeDisabled();
  view.rerender(
    <Fixture
      page="words"
      status={{
        ...loaded,
        goal: { type: "items", current: 0, value: 10 },
        streakDays: 0,
      }}
    />,
  );
  expect(screen.getByRole("progressbar")).toBe(progress);
  expect(progress).toHaveAttribute("value", "0");
  expect(progress).toHaveAttribute("max", "10");
  expect(streak).toHaveTextContent("0");
  const removed = mutations
    .takeRecords()
    .flatMap((record) => [...record.removedNodes]);
  expect(
    removed.some(
      (node) =>
        node === bar ||
        node.contains(progress) ||
        (streak && node.contains(streak)),
    ),
  ).toBe(false);
  mutations.disconnect();
});

it("never carries another language's metrics into a pending selection", () => {
  const view = render(<Fixture />);
  const bar = document.querySelector(".learning-status-bar");
  const arabic = { ...language, value: "ar" };
  view.rerender(<Fixture status={{ language: arabic }} />);
  expect(document.querySelector(".learning-status-bar")).toBe(bar);
  expect(screen.getByRole("combobox")).toHaveValue("ar");
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(document.querySelector(".learning-status-streak")).toBeNull();
  view.rerender(
    <Fixture status={{ ...loaded, language: arabic, streakDays: 0 }} />,
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "17");
  expect(document.querySelector(".learning-status-streak")).toHaveTextContent(
    "0",
  );
});

it("discards the snapshot at the authenticated owner boundary", () => {
  const view = render(<Fixture />);
  view.rerender(<Fixture owner="learner-b" status={{ language }} />);
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(document.querySelector(".learning-status-streak")).toBeNull();
});
