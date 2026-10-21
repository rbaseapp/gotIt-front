import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProgramUnitMap } from "../src/components/ProgramUnitMap";
import { programMapModel } from "../src/lib/programMap";
import { programsDesignEnabled } from "../src/lib/programs";
import { fixtureHomework } from "./course-fixtures";
import i18n from "../src/i18n";
import { mapPack, mapPath } from "./program-map-fixtures";
import * as unitPathApi from "../src/lib/unitLearningPath";

function mount(overrides: Partial<Parameters<typeof ProgramUnitMap>[0]> = {}) {
  const props = {
    current: mapPack,
    packs: [mapPack],
    path: mapPath,
    pathLoading: false,
    pathError: "",
    onRetryPath: vi.fn(),
    onWords: vi.fn(),
    onAll: vi.fn(),
    onActivities: vi.fn(),
    onSelect: vi.fn(),
    stationUrl: (station: string) =>
      `/private-lesson?pack=${mapPack.id}&station=${station}`,
    completedActivities: 0,
    ...overrides,
  };
  render(
    <MemoryRouter>
      <ProgramUnitMap {...props} />
    </MemoryRouter>,
  );
  return props;
}
describe("dynamic DEV program map", () => {
  it("projects server word, meeting and preparation evidence without treating known words as mastery", () => {
    const model = programMapModel(mapPack, mapPath);
    expect(model.steps).toHaveLength(9);
    expect(model.completed).toBe(4);
    expect(model.percent).toBe(44);
    expect(model.active?.id).toBe("midpoint-meeting");
    expect(
      model.steps
        .filter((step) => step.kind === "words")
        .map((step) => [step.from, step.to]),
    ).toEqual([
      [1, 10],
      [11, 25],
      [26, 50],
    ]);
  });
  it("routes both continuation actions to the server-selected station and keeps future steps locked", () => {
    mount();
    expect(screen.getByRole("link", { name: "המשך לשלב 5" })).toHaveAttribute(
      "href",
      expect.stringContaining("station=midpoint"),
    );
    expect(
      document.querySelectorAll('.pm-step[aria-current="step"]'),
    ).toHaveLength(1);
    expect(document.querySelectorAll(".pm-step.is-future a")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /הצג עוד שלבים/ }));
    expect(document.querySelectorAll(".pm-step")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: /4 שלבים הושלמו/ }));
    expect(document.querySelectorAll(".pm-step")).toHaveLength(9);
  });
  it("opens words explicitly without creating a session or preparing homework on view", () => {
    const props = mount();
    fireEvent.click(screen.getByRole("button", { name: "you" }));
    expect(props.onWords).toHaveBeenCalledTimes(1);
  });
  it("routes pending homework to its existing id and safe return instead of marking it complete", () => {
    const path = structuredClone(mapPath);
    path.stations[1] = {
      ...path.stations[1],
      meetingCompleted: true,
      homework: {
        ...fixtureHomework,
        packId: mapPack.id,
        courseId: null,
        station: "midpoint",
        status: "pending",
        estimatedMinutes: null,
        tasks: [],
        taskCount: 0,
      },
    };
    path.nextAction = {
      kind: "homework",
      station: "midpoint",
      homeworkId: fixtureHomework.id,
    };
    mount({ path });
    const href = screen
      .getByRole("link", { name: "המשך לשלב 6" })
      .getAttribute("href")!;
    expect(href).toContain(`/homework/${fixtureHomework.id}`);
    expect(
      new URL(href, "https://example.test").searchParams.get("return"),
    ).toBe(`/english-learning?unit=${mapPack.id}`);
    expect(programMapModel(mapPack, path).completed).toBe(5);
    expect(
      document.querySelector(".pm-step.is-current .lucide-clock-3"),
    ).toBeNull();
  });
  it.each(["loading", "error"])(
    "withholds progress and actions for %s map responses",
    (state) => {
      const props = mount({
        pathLoading: state === "loading",
        pathError: state === "error" ? "Map unavailable" : "",
      });
      expect(
        screen.queryByRole("link", { name: /המשך/ }),
      ).not.toBeInTheDocument();
      expect(document.querySelector(".pm-progress")).not.toBeInTheDocument();
      expect(screen.queryByText(/common\./)).not.toBeInTheDocument();
      if (state === "error") {
        fireEvent.click(
          screen.getByRole("button", { name: i18n.t("common.tryAgain") }),
        );
        expect(props.onRetryPath).toHaveBeenCalledTimes(1);
      }
    },
  );
  it("keeps path choices inside the original map rows without a duplicate stage list", async () => {
    const choose = vi.fn().mockResolvedValue(undefined);
    const path = structuredClone(mapPath);
    path.steps = path.stations.flatMap((station) =>
      ["words", "meeting", "homework"].map((kind) => ({
        key: `${station.station}-${kind}`,
        kind: kind as "words" | "meeting" | "homework",
        station: station.station,
        complete: false,
        skipped: kind === "words",
        available: kind !== "homework",
        homeworkId: null,
      })),
    );
    mount({
      path,
      onPathChanged: vi.fn(),
      choices: { busy: false, onChoice: choose },
    });
    expect(document.querySelector(".path-choices")).toBeNull();
    expect(document.querySelectorAll(".pm-roadmap")).toHaveLength(1);
    const row = document.querySelector('.pm-step[aria-current="step"]')!;
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", {
        name: new RegExp(`^${i18n.t("pathChoices.skip")}:`),
      }),
    );
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", {
        name: i18n.t("pathChoices.skip"),
        exact: true,
      }),
    );
    expect(choose).toHaveBeenCalledWith(true, "midpoint-meeting");
    expect(document.querySelectorAll(".pm-step")).toHaveLength(5);
  });
  it("uses server navigation skips while preserving real completion counts", () => {
    const path = structuredClone(mapPath);
    path.steps = [
      {
        key: "midpoint-meeting",
        kind: "meeting",
        station: "midpoint",
        complete: false,
        skipped: true,
        available: true,
        homeworkId: null,
      },
    ];
    const model = programMapModel(mapPack, path);
    expect(
      model.steps.find((step) => step.id === "midpoint-meeting")?.skipped,
    ).toBe(true);
    expect(model.active?.id).not.toBe("midpoint-meeting");
    expect(model.completed).toBe(4);
    path.navigationComplete = true;
    expect(programMapModel(mapPack, path).active).toBeUndefined();
  });
  it("sends the canonical server step key from the original legacy map", async () => {
    const path = structuredClone(mapPath);
    path.navigationRevision = 7;
    path.steps = [
      {
        key: "midpoint:meeting",
        kind: "meeting",
        station: "midpoint",
        complete: false,
        skipped: false,
        available: true,
        homeworkId: null,
      },
    ];
    const choose = vi
      .spyOn(unitPathApi, "chooseUnitPath")
      .mockResolvedValue({ path });
    mount({ path, onPathChanged: vi.fn().mockResolvedValue(undefined) });
    const row = document.querySelector('.pm-step[aria-current="step"]')!;
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", {
        name: new RegExp(`^${i18n.t("pathChoices.skip")}:`),
      }),
    );
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", {
        name: i18n.t("pathChoices.skip"),
        exact: true,
      }),
    );
    expect(choose).toHaveBeenCalledWith(mapPack.id, {
      eventId: expect.any(String),
      revision: 7,
      step: "midpoint:meeting",
      skipped: true,
    });
  });
  it("uses authoritative prerequisites even when a station is next", () => {
    const path = structuredClone(mapPath);
    path.stations[1].available = false;
    path.stations[1].lockReason = "previous_preparation";
    mount({ path });
    expect(screen.getByRole("button", { name: "המשך לשלב 5" })).toBeDisabled();
  });
  it("handles the fully completed unit and an empty server path", () => {
    const path = structuredClone(mapPath);
    path.stations.forEach((station) => {
      station.meetingCompleted = true;
      station.preparationComplete = true;
    });
    const model = programMapModel(
      { ...mapPack, progress: { ...mapPack.progress, introduced: 50 } },
      path,
    );
    expect(model.percent).toBe(100);
    expect(model.active).toBeUndefined();
    expect(programMapModel(mapPack, { ...path, stations: [] }).percent).toBe(0);
  });
  it("keeps the shared design boundary on DEV and explicit loopback previews", () => {
    expect(programsDesignEnabled("gotit-dev.rbaseapp.com", false)).toBe(true);
    expect(programsDesignEnabled("localhost", true)).toBe(true);
    expect(programsDesignEnabled("gotit.rbaseapp.com", true)).toBe(false);
    expect(programsDesignEnabled("unknown.example", true)).toBe(false);
  });
});
