import { afterEach, expect, it, vi } from "vitest";
import { PrivateLessonText } from "../src/lib/privateLessonText";

afterEach(() => vi.useRealTimers());
function fixture() {
  const send = vi.fn(() => true),
    accepted = vi.fn(),
    failed = vi.fn();
  const text = new PrivateLessonText(send, accepted, failed);
  const acknowledge = () =>
    text.observe({
      type: "conversation.item.added",
      item: { id: (send.mock.calls[0][0] as { item: { id: string } }).item.id },
    });
  return { text, send, accepted, failed, acknowledge };
}

it("keeps the draft pending until both its item and the teacher response are acknowledged", async () => {
  const { text, send, accepted, acknowledge } = fixture();
  const result = text.submit(" Tea, please. ");
  expect(send).toHaveBeenCalledOnce();
  expect(accepted).not.toHaveBeenCalled();
  text.observe({
    type: "conversation.item.added",
    item: { id: "another-item" },
  });
  expect(send).toHaveBeenCalledOnce();
  acknowledge();
  acknowledge();
  expect(send).toHaveBeenCalledTimes(2);
  text.observe({ type: "response.created" });
  await expect(result).resolves.toBe(true);
  expect(accepted).toHaveBeenCalledExactlyOnceWith("Tea, please.");
});

it("retries only the response after an accepted item, without duplicating the learner message", async () => {
  const { text, send, acknowledge } = fixture();
  const first = text.submit("Tea, please.");
  send.mockReturnValueOnce(false);
  acknowledge();
  await expect(first).resolves.toBe(false);
  await expect(text.submit("A different draft")).resolves.toBe(false);
  const retry = text.submit("Tea, please.");
  expect(
    send.mock.calls.map(([event]) => (event as { type: string }).type),
  ).toEqual(["conversation.item.create", "response.create", "response.create"]);
  text.observe({ type: "response.created" });
  await expect(retry).resolves.toBe(true);
});

it("rejects duplicate submissions and unrelated errors, and releases on disconnect", async () => {
  const { text, send } = fixture();
  const first = text.submit("Tea, please.");
  await expect(text.submit("Tea, please.")).resolves.toBe(false);
  text.observe({ type: "error", error: { event_id: "unrelated" } });
  expect(send).toHaveBeenCalledOnce();
  text.close();
  await expect(first).resolves.toBe(false);
});

it("preserves the same item when acknowledgment times out or creation is rejected", async () => {
  vi.useFakeTimers();
  const { text, send } = fixture();
  const first = text.submit("Tea, please.");
  await vi.advanceTimersByTimeAsync(8_000);
  await expect(first).resolves.toBe(false);
  const retry = text.submit("Tea, please.");
  expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
  text.observe({
    type: "error",
    error: {
      event_id: (send.mock.calls[0][0] as { event_id: string }).event_id,
    },
  });
  await expect(retry).resolves.toBe(false);
});
