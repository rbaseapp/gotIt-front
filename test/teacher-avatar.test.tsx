import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherAvatar } from "../src/components/TeacherAvatar";

describe("TeacherAvatar", () => {
  it("maps listening, thinking, and audio levels to distinct animation states", () => {
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
    ).toHaveLength(5);

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
      "speaking-soft",
    );

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
      "speaking-strong",
    );

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
  });
});
