import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../src/components/Modal";

describe("Modal", () => {
  it("renders its backdrop at the document root instead of inside transformed page content", () => {
    const { container } = render(
      <div className="page-enter">
        <Modal open onClose={vi.fn()} title="Pack words">
          <div>Word list</div>
        </Modal>
      </div>,
    );

    const dialog = screen.getByRole("dialog", { name: "Pack words" });

    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(dialog.parentElement).toBe(document.body.lastElementChild);
    expect(dialog.parentElement).toHaveClass("modal-backdrop");
  });
});
