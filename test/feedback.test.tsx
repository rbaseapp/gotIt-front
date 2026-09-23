import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  FeedbackProvider,
  useFeedback,
} from "../src/components/Feedback";

function Harness() {
  const { confirm, toast } = useFeedback();
  const [result, setResult] = useState("");
  return (
    <>
      <button onClick={() => toast("הפעולה נשמרה", { tone: "success" })}>
        הצגת הודעה
      </button>
      <button
        onClick={() =>
          void confirm({
            title: "למחוק?",
            message: "לאחר האישור הפריט יימחק.",
            confirmLabel: "מחיקה",
            tone: "danger",
          }).then((approved) => setResult(approved ? "אושר" : "בוטל"))
        }
      >
        פתיחת אזהרה
      </button>
      <div data-testid="result">{result}</div>
    </>
  );
}

describe("FeedbackProvider", () => {
  it("shows dismissible toasts and resolves modal confirmations", async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider>
        <Harness />
      </FeedbackProvider>,
    );

    await user.click(screen.getByRole("button", { name: "הצגת הודעה" }));
    expect(screen.getByRole("status")).toHaveTextContent("הפעולה נשמרה");
    await user.click(screen.getByRole("button", { name: "סגירת ההודעה" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "פתיחת אזהרה" }));
    expect(screen.getByRole("dialog", { name: "למחוק?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ביטול" }));
    expect(screen.getByTestId("result")).toHaveTextContent("בוטל");

    await user.click(screen.getByRole("button", { name: "פתיחת אזהרה" }));
    await user.click(screen.getByRole("button", { name: "מחיקה" }));
    expect(screen.getByTestId("result")).toHaveTextContent("אושר");
  });
});
