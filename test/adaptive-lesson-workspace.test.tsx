import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { LessonWorkspace } from "../src/components/LessonWorkspace";
import { guidedSession } from "./guided-lesson-fixtures";
import i18n from "../src/i18n";
it("offers an explicit finish when activities are exhausted and blocks another recycled answer", () => {
  const onFinish = vi.fn(),
    onAnswer = vi.fn(async () => true);
  render(
    <MemoryRouter>
      <LessonWorkspace
        lesson={guidedSession.lesson}
        activity={{ ...guidedSession.activity!, status: "exhausted" }}
        remaining={180}
        status="Ready"
        audioLevel={0}
        busy={false}
        ready
        microphoneMuted
        inputMode="text"
        error=""
        onAnswer={onAnswer}
        onAction={() => {}}
        onInputMode={() => {}}
        onMicrophone={() => {}}
        onReplay={() => {}}
        onTranslate={() => {}}
        onPause={() => {}}
        onFinish={onFinish}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(i18n.t("lessonUi.activitiesFinished")),
  ).toBeInTheDocument();
  const input = screen.getByRole("textbox", {
    name: i18n.t("lessonUi.yourAnswer"),
  });
  expect(input).toBeDisabled();
  expect(
    screen.getByRole("button", { name: i18n.t("lessonUi.hint"), exact: true }),
  ).toBeDisabled();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onAnswer).not.toHaveBeenCalled();
  fireEvent.click(
    screen
      .getAllByRole("button", { name: i18n.t("lessonUi.finish"), exact: true })
      .at(-1)!,
  );
  expect(onFinish).toHaveBeenCalledOnce();
});

it("shows actual activity progress instead of claiming that all three lesson stages are finished", () => {
  render(
    <MemoryRouter>
      <LessonWorkspace
        lesson={guidedSession.lesson}
        activity={{
          ...guidedSession.activity!,
          protocolVersion: "adaptive-v1",
          completedActivities: 5,
          stage: "chat",
          status: "active",
        }}
        remaining={180}
        status="Ready"
        audioLevel={0}
        busy={false}
        ready
        microphoneMuted
        inputMode="text"
        error=""
        onAnswer={async () => true}
        onAction={() => {}}
        onInputMode={() => {}}
        onMicrophone={() => {}}
        onReplay={() => {}}
        onTranslate={() => {}}
        onPause={() => {}}
        onFinish={() => {}}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(
      new RegExp(
        i18n.t("lessonUi.activityCaption", {
          count: 6,
          title: i18n.t("lessonUi.stage3"),
        }),
      ),
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: i18n.t("lessonUi.stages") }),
  ).not.toBeInTheDocument();
});
