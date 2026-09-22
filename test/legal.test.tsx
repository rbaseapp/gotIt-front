import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { AppProvider } from "../src/context/AppContext";
import { clearTokens } from "../src/lib/api";

function mount(path: string) {
  clearTokens();
  localStorage.clear();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe("public legal policies", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it.each([
    ["/terms-of-service", "Terms of Service"],
    ["/privacy-policy", "Privacy Policy"],
    ["/refund-policy", "Refund Policy"],
  ])("renders %s without requiring an account", (path, title) => {
    mount(path);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Effective date: September 22, 2026")).toBeInTheDocument();
  });

  it("links all policies together", async () => {
    mount("/terms-of-service");
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Privacy" }));
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Refunds" }));
    expect(screen.getByRole("heading", { level: 1, name: "Refund Policy" })).toBeInTheDocument();
  });
});
