import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Logo } from "../src/components/Logo";

describe("GotIt logo", () => {
  it("returns to the home route when clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Logo />
        <Routes>
          <Route path="/" element={<h1>Home</h1>} />
          <Route path="/settings" element={<h1>Settings</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.setup().click(screen.getByRole("link", { name: "GotIt home" }));

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});
