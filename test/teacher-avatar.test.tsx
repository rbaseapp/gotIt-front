import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherAvatar } from "../src/components/TeacherAvatar";

describe("TeacherAvatar", () => {
  it("blends mouth frames with audio while preserving idle states", () => {
    const { container, rerender } = render(
      <TeacherAvatar
        activity="listening"
        active
        audioLevel={0}
        label="Listening"
        variant="female"
      />,
    );

    expect(screen.getByRole("img", { name: "Listening" })).toHaveClass(
      "female",
      "listening",
    );
    expect(
      container.querySelectorAll(".teacher-avatar-portrait img"),
    ).toHaveLength(6);

    rerender(
      <TeacherAvatar
        activity="thinking"
        active
        audioLevel={0.3}
        label="Speaking softly"
        variant="female"
      />,
    );
    expect(screen.getByRole("img", { name: "Speaking softly" })).toHaveClass(
      "speaking",
    );
    const avatar = screen.getByRole("img", { name: "Speaking softly" });
    const soft = Number(avatar.style.getPropertyValue("--tutor-mouth-soft"));
    const wide = Number(avatar.style.getPropertyValue("--tutor-mouth-wide"));
    expect(soft).toBeGreaterThan(0);
    expect(wide).toBe(0);
    expect(
      Number(avatar.style.getPropertyValue("--tutor-mouth-rounded")),
    ).toBeGreaterThan(0);

    rerender(
      <TeacherAvatar
        activity="thinking"
        active
        audioLevel={0.8}
        label="Speaking"
        variant="male"
      />,
    );
    expect(screen.getByRole("img", { name: "Speaking" })).toHaveClass(
      "male",
      "speaking",
    );
    expect(
      Number(
        screen
          .getByRole("img", { name: "Speaking" })
          .style.getPropertyValue("--tutor-mouth-wide"),
      ),
    ).toBe(1);

    rerender(
      <TeacherAvatar
        activity="thinking"
        active={false}
        audioLevel={0.8}
        label="Thinking"
        variant="male"
      />,
    );
    expect(screen.getByRole("img", { name: "Thinking" })).toHaveClass(
      "thinking",
    );
    expect(
      Number(
        screen
          .getByRole("img", { name: "Thinking" })
          .style.getPropertyValue("--tutor-mouth-soft"),
      ),
    ).toBe(0);
    expect(
      Number(
        screen
          .getByRole("img", { name: "Thinking" })
          .style.getPropertyValue("--tutor-mouth-wide"),
      ),
    ).toBe(0);
  });

  it("keeps quiet audio at rest and increases the mouth opening continuously", () => {
    const { rerender } = render(
      <TeacherAvatar
        activity="listening"
        active
        audioLevel={0.02}
        label="Teacher"
        variant="male"
      />,
    );
    const avatar = screen.getByRole("img", { name: "Teacher" });
    expect(avatar).toHaveClass("listening");
    expect(Number(avatar.style.getPropertyValue("--tutor-mouth-soft"))).toBe(0);

    const openings = [0.05, 0.09, 0.13].map((audioLevel) => {
      rerender(
        <TeacherAvatar
          activity="listening"
          active
          audioLevel={audioLevel}
          label="Teacher"
          variant="male"
        />,
      );
      expect(avatar).toHaveClass("speaking");
      return Number(avatar.style.getPropertyValue("--tutor-mouth-soft"));
    });
    expect(openings[0]).toBeGreaterThan(0);
    expect(openings[1]).toBeGreaterThan(openings[0]);
    expect(openings[2]).toBeGreaterThan(openings[1]);

    rerender(
      <TeacherAvatar
        activity="listening"
        active={false}
        audioLevel={1}
        label="Teacher"
        variant="male"
      />,
    );
    expect(avatar).toHaveClass("listening");
    expect(Number(avatar.style.getPropertyValue("--tutor-mouth-wide"))).toBe(0);
  });

  it.each(["male", "female"] as const)(
    "loads the %s rounded speech pose and closes it on silence or invalid audio",
    (variant) => {
      const { container, rerender } = render(
        <TeacherAvatar
          activity="listening"
          active
          audioLevel={0.34}
          label="Teacher"
          variant={variant}
        />,
      );
      const avatar = screen.getByRole("img", { name: "Teacher" });
      const frame = container.querySelector(".teacher-avatar-speaking-rounded");
      expect(frame?.getAttribute("src")).toContain(
        variant === "female"
          ? "tutor-female-speaking-rounded"
          : "tutor-speaking-rounded",
      );
      expect(avatar.style.getPropertyValue("--tutor-mouth-rounded")).toBe("1");
      for (const audioLevel of [0, NaN, Infinity, -1]) {
        rerender(
          <TeacherAvatar
            activity="listening"
            active
            audioLevel={audioLevel}
            label="Teacher"
            variant={variant}
          />,
        );
        expect(avatar).toHaveClass("listening");
        for (const pose of ["soft", "rounded", "wide"]) {
          expect(avatar.style.getPropertyValue(`--tutor-mouth-${pose}`)).toBe(
            "0",
          );
        }
      }
      rerender(
        <TeacherAvatar
          activity="idle"
          active={false}
          audioLevel={0.34}
          label="Teacher"
          variant={variant}
        />,
      );
      expect(avatar.style.getPropertyValue("--tutor-mouth-rounded")).toBe("0");
    },
  );
});
