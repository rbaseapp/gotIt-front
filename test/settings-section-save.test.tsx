import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { seedProfile } from "../src/data/seed";
import { LegacySettingsPage } from "../src/pages/LegacySettingsPage";
import i18n from "../src/i18n";

const fns = vi.hoisted(() => ({
  update: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  lesson: vi.fn(),
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: seedProfile,
    mode: "live",
    user: { emailVerified: true },
    updateProfile: fns.update,
    profileError: "",
  }),
}));
vi.mock("../src/lib/notifications", () => ({
  getNotifications: fns.get,
  saveNotifications: fns.save,
}));
vi.mock("../src/lib/privateLesson", async () => ({
  ...(await vi.importActual("../src/lib/privateLesson")),
  getPrivateLessonSetup: fns.lesson,
}));
const preferences = {
  practiceEmail: false,
  practicePush: false,
  systemEmail: false,
  systemPush: false,
  reminderHour: 18,
  timezone: "UTC",
};
const config = { emailAvailable: true, pushAvailable: false };
beforeEach(() => {
  Object.values(fns).forEach((fn) => fn.mockReset());
  fns.update.mockResolvedValue(undefined);
  fns.save.mockResolvedValue(preferences);
});
it("loads and saves only notification preferences without changing the profile or teacher", async () => {
  fns.get
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ preferences, config });
  render(
    <MemoryRouter>
      <LegacySettingsPage section="notifications" />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  expect(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole("button", { name: i18n.t("common.tryAgain") }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
    ).toBeEnabled(),
  );
  await userEvent.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  await waitFor(() => expect(fns.save).toHaveBeenCalledOnce());
  expect(fns.update).not.toHaveBeenCalled();
  expect(fns.lesson).not.toHaveBeenCalled();
});
it("does not load teacher or notification resources while editing goals", async () => {
  render(
    <MemoryRouter>
      <LegacySettingsPage section="learning" />
    </MemoryRouter>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  await waitFor(() => expect(fns.update).toHaveBeenCalledOnce());
  expect(fns.get).not.toHaveBeenCalled();
  expect(fns.lesson).not.toHaveBeenCalled();
  expect(fns.save).not.toHaveBeenCalled();
});
