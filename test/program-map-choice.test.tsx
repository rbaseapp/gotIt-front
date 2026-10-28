import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProgramUnitMap } from "../src/components/ProgramUnitMap";
import type { ProgramActivityStep } from "../src/lib/programMap";
import { mapPack } from "./program-map-fixtures";
import i18n from "../src/i18n";

function mount() {
  const open = vi.fn(),
    choose = vi.fn().mockResolvedValue(undefined);
  const steps: ProgramActivityStep[] = [1, 2, 3].map((number) => ({
    kind: "activity",
    id: String(number),
    number,
    title: `Activity ${number}`,
    description: "Description",
    complete: false,
    available: number !== 2,
    lockReason: "Finish the lesson first",
    onOpen: () => open(number),
  }));
  render(
    <MemoryRouter>
      <ProgramUnitMap
        current={mapPack}
        packs={[mapPack]}
        pathLoading={false}
        pathError=""
        onRetryPath={vi.fn()}
        onWords={vi.fn()}
        onAll={vi.fn()}
        onActivities={vi.fn()}
        onSelect={vi.fn()}
        stationUrl={() => ""}
        completedActivities={0}
        choices={{ busy: false, onChoice: choose }}
        presentation={{
          model: {
            steps,
            active: steps[0],
            prefix: [],
            introduced: 0,
            completed: 0,
            percent: 0,
          },
          packs: [mapPack],
          words: [],
          canSelect: () => true,
        }}
      />
    </MemoryRouter>,
  );
  return { open, choose };
}
describe("program map action hierarchy", () => {
  it("reserves primary actions for continuation and explains locked steps without an entry button", () => {
    mount();
    expect(document.querySelectorAll(".pm-action")).toHaveLength(2);
    const locked = screen
      .getByRole("heading", { name: "Activity 2" })
      .closest("li")!;
    expect(locked).toHaveTextContent("Finish the lesson first");
    expect(locked.querySelector(".pm-start-here, .pm-action")).toBeNull();
  });
  it("cancels a different-step selection with no navigation or path mutation, then opens only after confirmation", async () => {
    const { open, choose } = mount(),
      user = userEvent.setup();
    const start = screen.getByRole("button", {
      name: `${i18n.t("mapChoice.startTitle", { count: 3 })}: Activity 3`,
    });
    await user.click(start);
    expect(open).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(i18n.t("mapChoice.startBody"));
    await user.click(
      within(dialog).getByRole("button", { name: i18n.t("feedback.cancel") }),
    );
    expect(start).toHaveFocus();
    expect(open).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
    await user.click(start);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: i18n.t("pathChoices.startHere"),
      }),
    );
    expect(open).toHaveBeenCalledExactlyOnceWith(3);
    expect(choose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers the same confirmation from the touch menu and restores focus on Escape", async () => {
    const { open } = mount(),
      user = userEvent.setup();
    const row = screen
      .getByRole("heading", { name: "Activity 3" })
      .closest("li")!;
    const trigger = within(row).getByRole("button", {
      name: `${i18n.t("pathChoices.skip")}: Activity 3`,
    });
    await user.click(trigger);
    await user.click(
      within(row).getByRole("button", {
        name: i18n.t("pathChoices.startHere"),
        exact: true,
      }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(open).not.toHaveBeenCalled();
  });
});
