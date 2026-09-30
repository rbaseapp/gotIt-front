import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { LanguageCombobox } from "../src/components/LanguageCombobox";

function Fixture({ initial = "en" }: { initial?: string }) {
  const [code, setCode] = useState(initial);
  return <div dir="rtl"><label>Language <LanguageCombobox value={code} onChange={setCode} /></label><output>{code}</output></div>;
}

describe("LanguageCombobox", () => {
  it("searches English and native names, selects by keyboard, and keeps the code", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const input = screen.getByRole("combobox", { name: "Language" });
    expect(input).toHaveValue("English");
    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "Englishen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Hebrew — עבריתhe" })).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "עברית");
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByText("he", { selector: "output" })).toBeInTheDocument();
    expect(input).toHaveValue("Hebrew — עברית");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("dir", "auto");
  });

  it("preserves an existing regional code and cancels uncommitted text", async () => {
    const user = userEvent.setup();
    render(<Fixture initial="en-US" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("en-US");
    await user.click(input);
    expect(screen.getByRole("option", { name: /en-US/ })).toHaveAttribute("aria-selected", "true");
    await user.clear(input);
    await user.type(input, "unknown{Escape}");
    expect(screen.getByText("en-US", { selector: "output" })).toBeInTheDocument();
    expect(input).toHaveValue("en-US");
  });
});
