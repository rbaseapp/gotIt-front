import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LetterBoxesInput } from "../src/components/LetterBoxesInput";
import { letterKeyboard } from "../src/lib/letterKeyboard";

function Answer({
  language = "en",
  length = 4,
  wordLengths,
  disabled = false,
}: {
  language?: string;
  length?: number;
  wordLengths?: number[];
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <LetterBoxesInput
      value={value}
      onChange={setValue}
      length={length}
      wordLengths={wordLengths}
      language={language}
      showLetters
      label="Answer"
      disabled={disabled}
    />
  );
}

describe("writing with letter tiles", () => {
  it("appends repeated letters, stops at capacity and supports delete and clear", async () => {
    render(<Answer />);
    const user = userEvent.setup();
    const e = screen.getByRole("button", { name: "e", exact: true });
    await user.click(e);
    await user.click(e);
    await user.click(screen.getByRole("button", { name: "l", exact: true }));
    await user.click(screen.getByRole("button", { name: "s", exact: true }));
    expect(screen.getByRole("textbox", { name: "Answer" })).toHaveValue("eels");
    expect(e).toBeDisabled();
    expect(document.querySelectorAll(".letter-box.filled")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "מחיקת אות" }));
    expect(screen.getByRole("textbox")).toHaveValue("eel");
    expect(e).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "ניקוי התשובה" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
  it("inserts spaces at the server-provided word boundaries and deletes across them", async () => {
    render(<Answer length={5} wordLengths={[2, 2]} />);
    const user = userEvent.setup();
    for (const letter of ["g", "o", "o", "n"])
      await user.click(
        screen.getByRole("button", { name: letter, exact: true }),
      );
    expect(screen.getByRole("textbox")).toHaveValue("go on");
    await user.click(screen.getByRole("button", { name: "מחיקת אות" }));
    await user.click(screen.getByRole("button", { name: "מחיקת אות" }));
    expect(screen.getByRole("textbox")).toHaveValue("go");
    await user.click(screen.getByRole("button", { name: "i", exact: true }));
    expect(screen.getByRole("textbox")).toHaveValue("go i");
  });
  it("uses the answer language and keeps regular input available for IME languages", async () => {
    const { unmount } = render(<Answer language="he-IL" length={3} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "ש", exact: true }));
    expect(screen.getByRole("textbox")).toHaveValue("ש");
    expect(screen.getByRole("textbox")).toHaveAttribute("dir", "rtl");
    expect(
      screen.queryByRole("button", { name: "a", exact: true }),
    ).not.toBeInTheDocument();
    unmount();
    render(<Answer language="ja" length={4} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "こんにちは" },
    });
    expect(screen.getByRole("textbox")).toHaveValue("こんにち");
  });
  it("prevents mutations while an attempt is pending", () => {
    render(<Answer disabled />);
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
  it("provides a full reusable alphabet rather than letters from a hidden answer", () => {
    expect(letterKeyboard("en")).toEqual(
      Array.from("abcdefghijklmnopqrstuvwxyz"),
    );
    expect(letterKeyboard("tr")).toContain("ı");
    expect(letterKeyboard("ar")).toContain("ا");
    expect(letterKeyboard("unknown")).toEqual([]);
  });
});
