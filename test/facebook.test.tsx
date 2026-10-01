import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacebookSignIn } from "../src/components/FacebookSignIn";

describe("Facebook Login button", () => {
  afterEach(() => vi.useRealTimers());

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

  it("uses the public GotIt Meta app ID when no build override is supplied", async () => {
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "");
    const sdk = { init: vi.fn(), login: vi.fn() };
    vi.stubGlobal("FB", sdk);
    render(<FacebookSignIn onCredential={vi.fn()} disabled={false} />);
    await waitFor(() =>
      expect(sdk.init).toHaveBeenCalledWith(
        expect.objectContaining({ appId: "2207127606520765" }),
      ),
    );
    expect(screen.getByRole("button", { name: /Facebook/i })).toBeEnabled();
  });

  it("ends an unanswered SDK login and ignores its late callback", async () => {
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "123456789");
    let callback: ((response: { status: string; authResponse: { accessToken: string } }) => void) | undefined;
    const sdk = {
      init: vi.fn(),
      login: vi.fn((onResponse) => { callback = onResponse; }),
    };
    vi.stubGlobal("FB", sdk);
    const credential = vi.fn();

    render(<FacebookSignIn onCredential={credential} disabled={false} />);
    await waitFor(() => expect(sdk.init).toHaveBeenCalled());
    const button = screen.getByRole("button", { name: /Facebook/i });
    vi.useFakeTimers();
    fireEvent.click(button);
    expect(button).toBeDisabled();

    act(() => vi.advanceTimersByTime(60_000));
    expect(button).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("כניסת Facebook ארכה זמן רב");
    act(() => callback?.({
      status: "connected",
      authResponse: { accessToken: "late-token" },
    }));
    expect(credential).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(sdk.login).toHaveBeenCalledTimes(2);
  });
});
