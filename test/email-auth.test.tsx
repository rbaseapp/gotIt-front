import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { EmailAuthForm } from "../src/components/EmailAuthForm";
import { api, ApiError, clearTokens } from "../src/lib/api";
import { setUiLocale } from "../src/i18n";

beforeEach(async () => {
  clearTokens();
  await setUiLocale("en");
});
afterEach(async () => {
  vi.restoreAllMocks();
  await setUiLocale("he");
});
const fill = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name, exact: true }));
const accepted = { retryAfter: 60, expiresIn: 600 };

it("requires mailbox proof and matching password confirmation before returning to login", async () => {
  const authenticate = vi.fn();
  vi.spyOn(api, "registerEmail").mockResolvedValue(accepted);
  const complete = vi.spyOn(api, "completeEmailCode").mockResolvedValue();
  render(<EmailAuthForm authenticate={authenticate} onBusy={vi.fn()} />);
  click("Register");
  fill("Email address", "owner@example.com");
  fill("Password", "long-password-123");
  fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
  await screen.findByLabelText("Email verification code");
  expect(authenticate).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Resend in 60 seconds" }),
  ).toBeDisabled();
  fill("Email verification code", "123456");
  fill("Confirm password", "different-password");
  click("Verify email");
  await screen.findByRole("alert");
  expect(complete).not.toHaveBeenCalled();
  fill("Confirm password", "long-password-123");
  click("Verify email");
  await screen.findByText("Email verified. You can now sign in.");
  expect(complete).toHaveBeenCalledWith(
    "owner@example.com",
    "123456",
    "long-password-123",
    "verify",
  );
  expect(authenticate).not.toHaveBeenCalled();
});

it("handles forgot-password, an invalid code, retry and successful reset without auto-login", async () => {
  const authenticate = vi.fn();
  const requestCode = vi
    .spyOn(api, "requestEmailCode")
    .mockResolvedValue(accepted);
  const complete = vi
    .spyOn(api, "completeEmailCode")
    .mockRejectedValueOnce(
      new ApiError(400, "EMAIL_CODE_INVALID", "Invalid code"),
    )
    .mockResolvedValue();
  render(<EmailAuthForm authenticate={authenticate} onBusy={vi.fn()} />);
  click("Forgot password?");
  fill("Email address", "owner@example.com");
  click("Send code");
  await screen.findByLabelText("Email verification code");
  expect(requestCode).toHaveBeenCalledWith("owner@example.com", "reset");
  fill("Email verification code", "654321");
  fill("New password", "new-password-123");
  fill("Confirm password", "new-password-123");
  click("Save new password");
  await screen.findByText("Invalid code");
  expect(screen.getByLabelText("New password")).toHaveValue("new-password-123");
  click("Save new password");
  await screen.findByText("Password updated. Sign in with your new password.");
  expect(complete).toHaveBeenCalledWith(
    "owner@example.com",
    "654321",
    "new-password-123",
    "reset",
  );
  expect(authenticate).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Password")).toHaveValue("");
});

it("offers verification to existing unverified accounts and exposes send failure for retry", async () => {
  const authenticate = vi
    .fn()
    .mockRejectedValue(
      new ApiError(403, "EMAIL_VERIFICATION_REQUIRED", "Verify first"),
    );
  vi.spyOn(api, "requestEmailCode")
    .mockRejectedValueOnce(new Error("Delivery unavailable"))
    .mockResolvedValue(accepted);
  render(<EmailAuthForm authenticate={authenticate} onBusy={vi.fn()} />);
  fill("Email address", "legacy@example.com");
  fill("Password", "long-password-123");
  fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
  await screen.findByText("Delivery unavailable");
  fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
  await screen.findByLabelText("Email verification code");
  expect(screen.getByLabelText("New password")).toHaveValue("");
});

it("stores no auth token for a registration challenge and validates its response", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ status: "accepted", expiresIn: 600, retryAfter: 60 }),
        { status: 202 },
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await api.registerEmail("owner@example.com", "long-password-123");
  expect(localStorage.getItem("gotit.refresh")).toBeNull();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ status: "accepted", retryAfter: -1 })),
  );
  await expect(
    api.requestEmailCode("owner@example.com", "reset"),
  ).rejects.toThrow();
});
