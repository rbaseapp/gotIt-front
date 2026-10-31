import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { TutorInvite } from "../src/components/onboarding/AccountFinish";
import { FirstChatIntro } from "../src/components/FirstChatIntro";
import { TeacherAvatar } from "../src/components/TeacherAvatar";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: { id: "u1" } }),
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({ status: null, hasEntitlement: () => false }),
}));

it("invites to the first chat with Moochi and shows the saved plan", () => {
  render(
    <MemoryRouter>
      <TutorInvite band="B1" minutes={10} />
    </MemoryRouter>,
  );
  expect(screen.getByText("היי, אני מוחי. נכיר?")).toBeInTheDocument();
  expect(screen.getByText("התוכנית שלכם שמורה")).toBeInTheDocument();
  expect(screen.getByText("כ-130 מילים חדשות בחודש")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "בואו נכיר" })).toHaveAttribute(
    "href",
    "/private-lesson?practice=free&intro=1",
  );
  expect(screen.queryByText(/רייצ/)).not.toBeInTheDocument();
});

it("starts the first chat with a plain voice or writing choice", () => {
  const onMode = vi.fn();
  const onStart = vi.fn((event: { preventDefault: () => void }) =>
    event.preventDefault(),
  );
  const onWarmup = vi.fn();
  render(
    <FirstChatIntro
      level="B1"
      minutes={5}
      mode="voice"
      onMode={onMode}
      busy={false}
      disabled={false}
      error=""
      onStart={onStart}
      onWarmup={onWarmup}
    />,
  );
  expect(screen.getByRole("button", { name: "בקול" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "בכתב" }));
  expect(onMode).toHaveBeenCalledWith("text");
  fireEvent.click(screen.getByRole("button", { name: /קודם חימום של דקה/ }));
  expect(onWarmup).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: /מתחילים · 5 דקות/ }));
  expect(onStart).toHaveBeenCalledOnce();
});

it("hides the level chip when the level is unknown", () => {
  render(
    <FirstChatIntro
      level=""
      minutes={5}
      mode="text"
      onMode={vi.fn()}
      busy={false}
      disabled={false}
      error=""
      onStart={vi.fn()}
      onWarmup={vi.fn()}
    />,
  );
  expect(screen.queryByText("לפי בדיקת הרמה שלכם")).not.toBeInTheDocument();
});

it("shows why the chat could not start instead of doing nothing", () => {
  render(
    <FirstChatIntro
      level=""
      minutes={5}
      mode="voice"
      onMode={vi.fn()}
      busy={false}
      disabled={false}
      error="יש לסיים את השיעור הקולי הנוכחי לפני פתיחת שיעור חדש."
      onStart={vi.fn()}
      onWarmup={vi.fn()}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "יש לסיים את השיעור הקולי הנוכחי",
  );
});

it("says it is preparing while the chat is being set up", () => {
  render(
    <FirstChatIntro
      level=""
      minutes={5}
      mode="voice"
      onMode={vi.fn()}
      busy
      disabled={false}
      error=""
      onStart={vi.fn()}
      onWarmup={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: /מכינים את השיעור/ }),
  ).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("דקה וחצי");
});

it("draws Moochi as layered frames: poses, mouths and looks", () => {
  const { container } = render(
    <TeacherAvatar
      variant="moochi"
      activity="listening"
      audioLevel={0.5}
      active
      label="Moochi"
    />,
  );
  expect(container.querySelector(".teacher-avatar.moochi")).not.toBeNull();
  expect(container.querySelectorAll(".moochi-pose")).toHaveLength(6);
  expect(container.querySelectorAll(".moochi-mouth")).toHaveLength(5);
  expect(container.querySelectorAll(".moochi-look")).toHaveLength(6);
  // A loud voice opens exactly one mouth.
  expect(container.querySelectorAll(".moochi-mouth[data-on]")).toHaveLength(1);
});
