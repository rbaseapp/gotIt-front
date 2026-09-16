import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoogleSignIn } from "../src/components/GoogleSignIn";

describe("Google Identity button", () => {
  it("renders the official button and forwards only its opaque credential", async () => {
    vi.stubEnv(
      "VITE_GOOGLE_CLIENT_ID",
      "public-client.apps.googleusercontent.com",
    );
    let callback: ((response: { credential: string }) => void) | undefined;
    const identity = {
      initialize: vi.fn((options) => {
        expect(options.client_id).toBe(
          "public-client.apps.googleusercontent.com",
        );
        expect(options.auto_select).toBe(false);
        callback = options.callback;
      }),
      renderButton: vi.fn((element: HTMLElement) => {
        const button = document.createElement("button");
        button.textContent = "Official Google button";
        element.append(button);
      }),
      disableAutoSelect: vi.fn(),
    };
    vi.stubGlobal("google", { accounts: { id: identity } });
    const credential = vi.fn();
    render(<GoogleSignIn onCredential={credential} disabled={false} />);
    expect(
      await screen.findByRole("button", { name: "Official Google button" }),
    ).toBeInTheDocument();
    await act(() => callback?.({ credential: "opaque-google-id-token" }));
    expect(credential).toHaveBeenCalledWith("opaque-google-id-token");
    expect(identity.renderButton).toHaveBeenCalledOnce();
  });
});
