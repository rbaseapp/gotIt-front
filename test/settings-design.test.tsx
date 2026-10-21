import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { seedProfile } from "../src/data/seed";
import i18n from "../src/i18n";
import { SettingsProfile } from "../src/components/settings/SettingsProfile";
import { DevSettingsPage } from "../src/pages/DevSettingsPage";
import {
  profileTimezones,
  settingsDesignEnabled,
  settingsSection,
} from "../src/lib/settingsDesign";

vi.mock("../src/lib/accountSettings", () => ({
  signInMethods: vi.fn(async () => [
    { provider: "google", connected: true, available: true },
    { provider: "facebook", connected: false, available: true },
    { provider: "email", connected: true, available: true },
  ]),
  linkMethod: vi.fn(),
  prepareAvatar: vi.fn(async () => "data:image/jpeg;base64,YWJj"),
}));
const state = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  retryProfile: vi.fn(),
  profileError: "",
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: seedProfile,
    user: { email: "learner@example.com" },
    mode: "live",
    updateProfile: state.updateProfile,
    profileError: state.profileError,
    retryProfile: state.retryProfile,
  }),
}));
beforeEach(() => {
  state.updateProfile.mockReset();
  state.profileError = "";
});

it("keeps the rollout strictly on DEV or explicit loopback previews", () => {
  expect(settingsDesignEnabled("gotit-dev.rbaseapp.com", false)).toBe(true);
  expect(settingsDesignEnabled("gotit.rbaseapp.com", true)).toBe(false);
  expect(settingsDesignEnabled("example.com", true)).toBe(false);
  expect(settingsDesignEnabled("localhost", false)).toBe(false);
  expect(settingsDesignEnabled("localhost", true)).toBe(true);
  expect(settingsSection("#reminders")).toBe("notifications");
  expect(settingsSection("#unknown")).toBe("profile");
  expect(profileTimezones("Asia/Jerusalem")).toEqual(
    expect.arrayContaining(["UTC", "Asia/Jerusalem"]),
  );
});

it("preserves an edited timezone on a failed save and retries the same scoped patch", async () => {
  state.updateProfile
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  render(<SettingsProfile />);
  const user = userEvent.setup();
  const zone = screen.getByLabelText(i18n.t("settingsDesign.timezoneLabel"));
  expect(zone).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: i18n.t("settingsDesign.editTimezone") }),
  );
  expect(zone).toHaveFocus();
  const next = seedProfile.timezone === "UTC" ? "Asia/Jerusalem" : "UTC";
  await user.selectOptions(zone, next);
  await user.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  expect(zone).toHaveValue(next);
  await user.click(
    screen.getByRole("button", { name: i18n.t("settings.saveChanges") }),
  );
  await waitFor(() => expect(state.updateProfile).toHaveBeenCalledTimes(2));
  expect(state.updateProfile.mock.calls[0]).toEqual(
    state.updateProfile.mock.calls[1],
  );
  expect(state.updateProfile).toHaveBeenCalledWith({
    name: seedProfile.name,
    displayName: seedProfile.name,
    avatarData: null,
    timezone: next,
  });
});

it("uses Core method truth for Google, Facebook and email and explains the separate email-change boundary", async () => {
  render(<SettingsProfile />);
  const user = userEvent.setup();
  expect(screen.getByLabelText(i18n.t("settings.email"))).toHaveValue(
    "learner@example.com",
  );
  expect(
    await screen.findAllByText(i18n.t("settingsLive.connected")),
  ).toHaveLength(2);
  expect(screen.getByText("Facebook")).toBeInTheDocument();
  expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  expect(
    screen.getByText(i18n.t("settingsLive.notConnected")),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: i18n.t("settingsDesign.editEmail") }),
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(
    i18n.t("settingsDesign.emailUnavailable"),
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(state.updateProfile).not.toHaveBeenCalled();
});

it("blocks mutations when the authoritative profile failed to load", () => {
  state.profileError = "profile unavailable";
  render(<SettingsProfile />);
  expect(
    screen.getByRole("textbox", { name: i18n.t("settings.displayName") }),
  ).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("profile unavailable");
});

it("opens hash-linked settings with only the selected category and accessible current navigation", async () => {
  render(
    <MemoryRouter initialEntries={["/settings#interface"]}>
      <DevSettingsPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    i18n.t("settingsDesign.sections.interface"),
  );
  expect(
    screen.getByRole("link", {
      name: i18n.t("settingsDesign.sections.interface"),
    }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    screen.queryByLabelText(i18n.t("settings.email")),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("link", {
      name: i18n.t("settingsDesign.sections.profile"),
    }),
  );
  expect(screen.getByLabelText(i18n.t("settings.email"))).toHaveValue(
    "learner@example.com",
  );
});

it("has readable new content in every supported locale", () => {
  for (const locale of ["ar", "de", "en", "es", "fr", "he", "ru", "zh"]) {
    const copy = i18n.getResource(
      locale,
      "translation",
      "settingsDesign",
    ) as Record<string, unknown>;
    expect(copy).toBeTruthy();
    expect(JSON.stringify(copy)).not.toMatch(/\?{2,}/);
    expect(Object.keys(copy.sections as object)).toHaveLength(9);
  }
});
