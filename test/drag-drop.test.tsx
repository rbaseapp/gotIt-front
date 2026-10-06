import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveDragDropBoard } from "../src/components/LiveDragDropBoard";
import type { Exercise } from "../src/lib/product";

const choices = [
  { id: "a", text: "אחד" },
  { id: "b", text: "שניים" },
];
const exercises = choices.map((choice, i) => ({
  id: `row-${i}`,
  learningItemId: choice.id,
  exerciseType: "matching",
  kind: "multiple_choice",
  direction: "source_to_translation",
  expiresAt: "2030-01-01T00:00:00Z",
  prompt: { text: `word-${i}`, languageCode: "en", context: null, choices },
})) as Exercise[];

function setup() {
  // jsdom has no native pointer capture or hit testing.
  class Pointer extends MouseEvent {
    pointerId = 1;
    pointerType = "touch";
  }
  vi.stubGlobal("PointerEvent", Pointer);
  const submit = vi.fn();
  const { unmount } = render(
    <div style={{ transform: "translateY(80px)" }}>
      <LiveDragDropBoard
        exercises={exercises}
        busy={false}
        onSubmit={submit}
        onDone={vi.fn()}
      />
    </div>,
  );
  const card = screen.getByRole("button", { name: "גרירת הפירוש: אחד" });
  card.setPointerCapture = vi.fn();
  const slot = document.querySelector<HTMLButtonElement>(".drag-drop-slot")!;
  const hit = vi.fn(() => slot as Element | null);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: hit,
  });
  const start = () => {
    fireEvent.pointerDown(card, { clientX: 150, clientY: 200 });
    fireEvent.pointerMove(card, { clientX: 160, clientY: 220 });
  };
  return { card, slot, hit, start, submit, unmount };
}

describe("touch matching", () => {
  it("preserves tap selection when replacing a filled slot on touch", () => {
    const { card, slot } = setup();
    fireEvent.click(card);
    fireEvent.click(slot);
    fireEvent.click(
      screen.getByRole("button", { name: "גרירת הפירוש: שניים" }),
    );
    slot.setPointerCapture = vi.fn();
    fireEvent.pointerDown(slot, { clientX: 150, clientY: 200 });
    fireEvent.pointerUp(slot, { clientX: 150, clientY: 200 });
    fireEvent.click(slot);
    expect(slot).toHaveTextContent("שניים");
  });
  it("renders the moving card at viewport coordinates outside transformed ancestors", () => {
    const { card, slot, start, submit } = setup();
    start();
    const ghost = document.querySelector<HTMLElement>(".meaning-drag-ghost")!;
    expect(ghost.parentElement).toBe(document.body);
    expect(ghost).toHaveStyle({ left: "160px", top: "220px" });
    fireEvent.pointerMove(card, { clientX: 195, clientY: 325 });
    expect(ghost).toHaveStyle({ left: "195px", top: "325px" });
    fireEvent.pointerUp(card, { clientX: 195, clientY: 325 });
    expect(slot).toHaveTextContent("אחד");
    expect(document.querySelector(".meaning-drag-ghost")).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it.each(["pointerCancel", "lostPointerCapture"] as const)(
    "%s never places the last hovered card",
    (event) => {
      const { card, slot, start } = setup();
      start();
      fireEvent[event](card, { clientX: 160, clientY: 220 });
      expect(slot).not.toHaveClass("has-card");
      expect(document.querySelector(".meaning-drag-ghost")).toBeNull();
    },
  );

  it("does not drop onto a stale target when released outside, and permits a later tap", () => {
    const { card, slot, start, hit } = setup();
    start();
    hit.mockReturnValue(null);
    fireEvent.pointerUp(card, { clientX: 5, clientY: 5 });
    expect(slot).not.toHaveClass("has-card");
    fireEvent.pointerDown(card, { clientX: 150, clientY: 200 });
    fireEvent.pointerUp(card, { clientX: 150, clientY: 200 });
    fireEvent.click(card);
    fireEvent.click(slot);
    expect(slot).toHaveTextContent("אחד");
  });
});
