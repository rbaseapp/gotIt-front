import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { InterfacePreferences } from "../src/components/InterfacePreferences";
import { seedProfile } from "../src/data/seed";
import i18n from "../src/i18n";
const update = vi.hoisted(() => vi.fn());
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: seedProfile,
    updateProfile: update,
    profileError: "",
  }),
}));
beforeEach(() => update.mockReset());
it("saves all interface choices to the account and preserves them after a failed save", async () => {
  update
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  render(<InterfacePreferences onReminders={() => {}} />);
  const user = userEvent.setup();
  await user.selectOptions(
    screen.getByRole("combobox", { name: i18n.t("language.label") }),
    "ar",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: i18n.t("accountUi.textSize") }),
    "large",
  );
  await user.click(
    screen.getByRole("checkbox", { name: i18n.t("accountUi.reduceMotion") }),
  );
  await user.click(
    screen.getByRole("button", { name: i18n.t("accountUi.savePreferences") }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  expect(
    screen.getByRole("combobox", { name: i18n.t("accountUi.textSize") }),
  ).toHaveValue("large");
  await user.click(
    screen.getByRole("button", { name: i18n.t("accountUi.savePreferences") }),
  );
  await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  expect(update.mock.calls[0]).toEqual(update.mock.calls[1]);
  expect(update).toHaveBeenCalledWith({
    learningPreferences: expect.objectContaining({
      uiLocale: "ar",
      textScale: "large",
      reducedMotion: true,
      enabledSkills: expect.any(Array),
    }),
  });
});
