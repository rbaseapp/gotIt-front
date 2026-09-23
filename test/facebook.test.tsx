import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacebookSignIn } from "../src/components/FacebookSignIn";

describe("Facebook Login button", () => {
  it("initializes the official SDK and forwards only its access token", async () => {
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "123456789");
    const login = vi.fn((callback) =>
      callback({
        status: "connected",
        authResponse: { accessToken: "opaque-facebook-access-token" },
      }),
    );
    const sdk = { init: vi.fn(), login };
    vi.stubGlobal("FB", sdk);
    const credential = vi.fn();

    render(<FacebookSignIn onCredential={credential} disabled={false} />);
    await waitFor(() => expect(sdk.init).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: /Facebook/i }));

    await waitFor(() =>
      expect(credential).toHaveBeenCalledWith("opaque-facebook-access-token"),
    );
    expect(sdk.init).toHaveBeenCalledWith({
      appId: "123456789",
      cookie: false,
      xfbml: false,
      version: "v26.0",
    });
    expect(login).toHaveBeenCalledWith(expect.any(Function), {
      scope: "public_profile,email",
      return_scopes: true,
    });
  });

  it("does not render an active login button without an app ID", () => {
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "");
    render(<FacebookSignIn onCredential={vi.fn()} disabled={false} />);
    expect(screen.queryByRole("button", { name: /Facebook/i })).not.toBeInTheDocument();
    expect(document.querySelector(".auth-footnote")).toHaveTextContent(/Facebook/i);
  });
});
