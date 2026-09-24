import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LetterBoxesInput } from "../src/components/LetterBoxesInput";

function MultiWordInput() {
  const [value, setValue] = useState("");
  return (
    <LetterBoxesInput
      label="Answer"
      value={value}
      length={9}
      wordLengths={[3, 5]}
      onChange={setValue}
    />
  );
}

describe("LetterBoxesInput", () => {
  it("groups a phrase by words and inserts its spaces while typing", async () => {
    const user = userEvent.setup();
    const { container } = render(<MultiWordInput />);

    const groups = container.querySelectorAll(".letter-box-word");
    expect(groups).toHaveLength(2);
    expect(groups[0].querySelectorAll(".letter-box")).toHaveLength(3);
    expect(groups[1].querySelectorAll(".letter-box")).toHaveLength(5);
    expect(container.querySelectorAll(".letter-box")).toHaveLength(8);

    const input = screen.getByRole("textbox", { name: "Answer" });
    await user.type(input, "icecream");

    expect(input).toHaveValue("ice cream");
  });
});
