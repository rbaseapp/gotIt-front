import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { LessonWorkspace } from "../src/components/LessonWorkspace";
import i18n from "../src/i18n";
import { guidedSession } from "./guided-lesson-fixtures";

function mount(
  onAnswer = vi.fn(async () => true),
  onReview = vi.fn(async () => true),
  activity = guidedSession.activity!,
  answerBlocked = false,
) {
  const onAction = vi.fn(),
    onPause = vi.fn(),
    onFinish = vi.fn(),
    onTranslate = vi.fn(),
    onInputMode = vi.fn();
  render(
    <MemoryRouter>
      <LessonWorkspace
        lesson={guidedSession.lesson}
        activity={activity}
        remaining={298}
        status="Ready"
        audioLevel={0}
        busy={false}
        answerBlocked={answerBlocked}
        ready
        microphoneMuted
        inputMode="text"
        error=""
        onAnswer={onAnswer}
        onReview={onReview}
        onAction={onAction}
        onMicrophone={() => {}}
        onInputMode={onInputMode}
        onReplay={() => {}}
        onTranslate={onTranslate}
        onPause={onPause}
        onFinish={onFinish}
      />
    </MemoryRouter>,
  );
  return { onAction, onPause, onFinish, onTranslate, onInputMode };
}
it("keeps a typed answer after a failed submission and clears it only after server success", async () => {
  const answer = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  mount(answer);
  const user = userEvent.setup();
  await user.click(
    screen.getAllByRole("button", { name: i18n.t("lessonUi.answerText") })[0],
  );
  const textbox = screen.getByRole("textbox", {
    name: i18n.t("lessonUi.yourAnswer"),
  });
  await user.type(textbox, "水をください。");
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.send") }),
  );
  expect(textbox).toHaveValue("水をください。");
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.send") }),
  );
  await waitFor(() => expect(textbox).toHaveValue(""));
  expect(answer.mock.calls).toEqual([["水をください。"], ["水をください。"]]);
});
it("offers help without advancing or finishing a lesson and keeps Japanese examples in Japanese", async () => {
  const actions = mount();
  const user = userEvent.setup();
  expect(screen.getByText("水をください。")).toHaveAttribute("lang", "ja");
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.helpWhenNeeded") }),
  );
  await user.click(
    within(
      screen.getByRole("dialog", { name: i18n.t("lessonUi.help") }),
    ).getByRole("button", { name: i18n.t("lessonUi.hint") }),
  );
  expect(actions.onAction).toHaveBeenCalledExactlyOnceWith("hint");
  expect(actions.onFinish).not.toHaveBeenCalled();
});
it("discloses the current clock policy while paused and requires confirmation before ending", async () => {
  const actions = mount();
  const user = userEvent.setup();
  await user.click(
    screen.getAllByRole("button", { name: i18n.t("lessonUi.pause") })[0],
  );
  expect(actions.onPause).toHaveBeenCalledWith(true);
  expect(screen.getByText(i18n.t("lessonUi.pausePolicy"))).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.resume") }),
  );
  expect(actions.onPause).toHaveBeenLastCalledWith(false);
  await user.click(
    screen.getAllByRole("button", { name: i18n.t("lessonUi.finish") })[0],
  );
  expect(actions.onFinish).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.finishAndSave") }),
  );
  expect(actions.onFinish).toHaveBeenCalledOnce();
});

it("reviews an edited transcript without recording another learning answer, and preserves the draft on failure", async () => {
  const answer = vi.fn(async () => true);
  const review = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  mount(answer, review, {
    ...guidedSession.activity!,
    lastAnswer: {
      question: "Ask for water",
      answer: "water",
      channel: "voice",
    },
  });
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonUi.helpWhenNeeded") }),
  );
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonReview.title") }),
  );
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonReview.edit") }),
  );
  const textbox = screen.getByRole("textbox", {
    name: i18n.t("lessonReview.corrected"),
  });
  await user.clear(textbox);
  await user.type(textbox, "Water, please.");
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonReview.submit") }),
  );
  expect(textbox).toHaveValue("Water, please.");
  await user.click(
    screen.getByRole("button", { name: i18n.t("lessonReview.submit") }),
  );
  await screen.findByText(i18n.t("lessonReview.originalPreserved"));
  expect(review.mock.calls).toEqual([["Water, please."], ["Water, please."]]);
  expect(answer).not.toHaveBeenCalled();
});

it("sends Enter once, keeps Shift+Enter and composition for editing, and locks an in-flight draft", async () => {
  let resolve!: (success: boolean) => void;
  const answer = vi.fn(
    () =>
      new Promise<boolean>((done) => {
        resolve = done;
      }),
  );
  mount(answer);
  const textbox = screen.getByRole("textbox", {
    name: i18n.t("lessonUi.yourAnswer"),
  });
  fireEvent.change(textbox, { target: { value: "I want tea." } });
  fireEvent.keyDown(textbox, { key: "Enter", shiftKey: true });
  fireEvent.keyDown(textbox, { key: "Enter", isComposing: true });
  expect(answer).not.toHaveBeenCalled();
  fireEvent.keyDown(textbox, { key: "Enter" });
  fireEvent.keyDown(textbox, { key: "Enter" });
  expect(answer).toHaveBeenCalledExactlyOnceWith("I want tea.");
  expect(textbox).toBeDisabled();
  resolve(false);
  await waitFor(() => expect(textbox).toBeEnabled());
  expect(textbox).toHaveValue("I want tea.");
});

it("switches input modes without submitting or losing the learner's draft", async () => {
  const answer = vi.fn(async () => true);
  const actions = mount(answer);
  const user = userEvent.setup();
  const textbox = screen.getByRole("textbox", {
    name: i18n.t("lessonUi.yourAnswer"),
  });
  await user.type(textbox, "An unfinished answer");
  await user.click(
    screen.getByRole("button", {
      name: i18n.t("lessonRoom.voice"),
      exact: true,
    }),
  );
  expect(actions.onInputMode).toHaveBeenLastCalledWith("voice");
  await user.click(
    screen.getByRole("button", {
      name: i18n.t("lessonUi.answerText"),
      exact: true,
    }),
  );
  expect(actions.onInputMode).toHaveBeenLastCalledWith("text");
  expect(textbox).toHaveValue("An unfinished answer");
  expect(answer).not.toHaveBeenCalled();
});

it("renders canonical conversation turns and avoids duplicating the current tutor turn", () => {
  const activity = {
    ...guidedSession.activity!,
    interactionMode: "conversation" as const,
    tutorText: "What do you enjoy doing?",
    turns: [
      { role: "tutor" as const, text: "Hello!" },
      { role: "learner" as const, text: "I enjoy reading." },
      { role: "tutor" as const, text: "What do you enjoy doing?" },
    ],
  };
  mount(undefined, undefined, activity);
  expect(screen.getAllByText("What do you enjoy doing?")).toHaveLength(1);
  expect(screen.getByText("I enjoy reading.")).toHaveAttribute("dir", "auto");
});

it("lets the learner write during teacher playback but prevents an unanswered send", () => {
  const answer = vi.fn(async () => true);
  mount(answer, undefined, undefined, true);
  const textbox = screen.getByRole("textbox", {
    name: i18n.t("lessonUi.yourAnswer"),
  });
  fireEvent.change(textbox, { target: { value: "My next answer." } });
  expect(textbox).toBeEnabled();
  expect(
    screen.getByRole("button", { name: i18n.t("lessonUi.send") }),
  ).toBeDisabled();
  fireEvent.keyDown(textbox, { key: "Enter" });
  expect(answer).not.toHaveBeenCalled();
  expect(textbox).toHaveValue("My next answer.");
});
