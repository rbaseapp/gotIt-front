import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { SettingsNotifications } from "../src/components/settings/SettingsNotifications";
import { SettingsProfile } from "../src/components/settings/SettingsProfile";
import { SettingsInterface } from "../src/components/settings/SettingsInterface";
import { seedProfile } from "../src/data/seed";
import i18n from "../src/i18n";
const f = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  avatar: vi.fn(),
  methods: vi.fn(),
}));
vi.mock("../src/lib/notifications", () => ({
  getNotifications: f.get,
  saveNotifications: f.save,
}));
vi.mock("../src/lib/accountSettings", () => ({
  signInMethods: f.methods,
  prepareAvatar: f.avatar,
  linkMethod: vi.fn(),
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    mode: "live",
    profile: seedProfile,
    user: { email: "learner@example.test", emailVerified: true },
    updateProfile: f.update,
    profileError: "",
    retryProfile: vi.fn(),
    authenticate: vi.fn(),
  }),
}));
const preferences = {
  enabled: true,
  practiceEmail: false,
  practicePush: false,
  systemEmail: false,
  systemPush: false,
  streakEmail: false,
  streakPush: false,
  weeklyEmail: false,
  weeklyPush: false,
  reminderHour: 18,
  reminderMinute: 0,
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  quietEnabled: false,
  quietStart: 1320,
  quietEnd: 420,
  timezone: "UTC",
};
beforeEach(() => {
  vi.resetAllMocks();
  f.methods.mockResolvedValue([
    { provider: "google", connected: true, available: true },
    { provider: "facebook", connected: false, available: true },
    { provider: "email", connected: false, available: true },
  ]);
  f.get.mockResolvedValue({
    preferences,
    config: { emailAvailable: true, pushAvailable: false },
  });
  f.update.mockResolvedValue(undefined);
});
it("keeps failed reminder edits including minute/day/master choices and retries the same input", async () => {
  f.save
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(async (input) => ({ ...input, timezone: "UTC" }));
  render(
    <MemoryRouter>
      <SettingsNotifications />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const email = await screen.findByRole("switch", {
    name: `${i18n.t("settingsLive.practiceTitle")} — ${i18n.t("settingsLive.emailChannel")}`,
  });
  await user.click(email);
  const time = screen.getByLabelText(i18n.t("settings.reminderHour"));
  fireEvent.change(time, { target: { value: "19:30" } });
  await user.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  expect(time).toHaveValue("19:30");
  expect(email).toHaveAttribute("aria-checked", "true");
  await user.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  await waitFor(() => expect(f.save).toHaveBeenCalledTimes(2));
  expect(f.save.mock.calls[0][0]).toEqual(f.save.mock.calls[1][0]);
  expect(f.save.mock.calls[1][0]).toMatchObject({
    reminderHour: 19,
    reminderMinute: 30,
    practiceEmail: true,
  });
  expect(f.update).not.toHaveBeenCalled();
});
it("retries an initial reminder load failure without exposing writable defaults", async () => {
  f.get.mockRejectedValueOnce(new Error("unavailable"));
  render(
    <MemoryRouter>
      <SettingsNotifications />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: i18n.t("common.tryAgain") }),
  );
  expect(
    await screen.findByRole("switch", {
      name: i18n.t("settingsLive.notificationsMaster"),
    }),
  ).toBeEnabled();
  expect(f.save).not.toHaveBeenCalled();
});
it("uploads and previews a photo, then includes it in the persistent profile save", async () => {
  const photo = "data:image/jpeg;base64,YWJj";
  f.avatar.mockResolvedValue(photo);
  render(<SettingsProfile />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: i18n.t("settingsDesign.change") }),
  );
  const input = document.querySelector('input[type="file"]')!;
  await user.upload(
    input as HTMLInputElement,
    new File(["image"], "avatar.jpg", { type: "image/jpeg" }),
  );
  expect(
    await screen.findByRole("img", { name: i18n.t("settingsDesign.avatar") }),
  ).toHaveAttribute("src", photo);
  fireEvent.keyDown(document, { key: "Escape" });
  await user.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  await waitFor(() =>
    expect(f.update).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarData: photo,
        displayName: seedProfile.name,
      }),
    ),
  );
});
it("saves interface preferences through the profile without writing notifications", async () => {
  render(<SettingsInterface />);
  await userEvent.click(
    screen.getByRole("switch", { name: i18n.t("settingsLive.highContrast") }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  await waitFor(() =>
    expect(f.update).toHaveBeenCalledWith({
      learningPreferences: expect.objectContaining({ highContrast: true }),
    }),
  );
  expect(f.save).not.toHaveBeenCalled();
});
