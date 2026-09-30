import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HelpPage } from "../src/pages/HelpPage";
import { LegalPage } from "../src/pages/LegalPage";
import { setUiLocale } from "../src/i18n";

describe("help contact", () => {
  beforeEach(async () => {
    await setUiLocale("en");
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await setUiLocale("he");
  });

  it("offers the support mailbox and WhatsApp number", () => {
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>,
    );

    const email = screen.getByRole("link", { name: "Send an email" });
    expect(email).toHaveAttribute(
      "href",
      "mailto:support@rbaseapp.com?subject=GotIt%20support%20request",
    );

    const whatsapp = screen.getByRole("link", { name: "Chat on WhatsApp" });
    expect(whatsapp).toHaveAttribute(
      "href",
      "https://wa.me/972502153466?text=Hi%2C%20I%20need%20help%20with%20GotIt.",
    );
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("localizes the prepared message without changing the support destination", async () => {
    await setUiLocale("he");
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "שליחת אימייל" })).toHaveAttribute(
      "href",
      `mailto:support@rbaseapp.com?subject=${encodeURIComponent("פנייה לתמיכה של GotIt")}`,
    );
    expect(
      screen.getByRole("link", { name: "שיחה ב־WhatsApp" }),
    ).toHaveAttribute(
      "href",
      `https://wa.me/972502153466?text=${encodeURIComponent("שלום, אשמח לעזרה עם GotIt.")}`,
    );
  });

  it("uses the same support mailbox in the legal contact link", () => {
    vi.stubGlobal("scrollTo", vi.fn());
    render(
      <MemoryRouter>
        <LegalPage kind="terms" />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByRole("link", { name: "support@rbaseapp.com" })[0],
    ).toHaveAttribute("href", "mailto:support@rbaseapp.com");
  });
});
