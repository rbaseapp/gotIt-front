type Pending = {
  text: string;
  itemId: string;
  itemEventId: string;
  responseEventId: string;
  created: boolean;
  responseRequested: boolean;
  resolve?: (accepted: boolean) => void;
  timeout?: ReturnType<typeof setTimeout>;
};

/** Retain the same provider item across a failed response request. Only clear
 * the draft after the provider acknowledges starting its response. */
export class PrivateLessonText {
  private pending?: Pending;
  constructor(
    private readonly send: (event: Record<string, unknown>) => boolean,
    private readonly accepted: (text: string) => void,
    private readonly failed: () => void,
  ) {}

  submit(text: string): Promise<boolean> {
    text = text.trim();
    if (
      !text ||
      this.pending?.resolve ||
      (this.pending && this.pending.text !== text)
    )
      return Promise.resolve(false);
    const pending = (this.pending ??= {
      text,
      itemId: `item_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
      itemEventId: crypto.randomUUID(),
      responseEventId: crypto.randomUUID(),
      created: false,
      responseRequested: false,
    });
    return new Promise((resolve) => {
      pending.resolve = resolve;
      pending.timeout = setTimeout(() => this.settle(false), 8_000);
      if (pending.created) this.requestResponse();
      else if (
        !this.send({
          type: "conversation.item.create",
          event_id: pending.itemEventId,
          item: {
            id: pending.itemId,
            type: "message",
            role: "user",
            content: [{ type: "input_text", text }],
          },
        })
      )
        this.settle(false);
    });
  }

  observe(event: Record<string, unknown>) {
    const pending = this.pending;
    if (!pending) return;
    const item = event.item as { id?: string } | undefined;
    if (
      ["conversation.item.added", "conversation.item.created"].includes(
        String(event.type),
      ) &&
      item?.id === pending.itemId
    ) {
      if (!pending.created) this.accepted(pending.text);
      pending.created = true;
      if (pending.resolve) this.requestResponse();
    } else if (event.type === "response.created" && pending.responseRequested) {
      this.settle(true);
    } else if (event.type === "error") {
      const error = event.error as { event_id?: string } | undefined;
      if (
        [pending.itemEventId, pending.responseEventId].includes(
          error?.event_id ?? "",
        )
      )
        this.settle(false);
    }
  }

  close() {
    this.settle(false);
    this.pending = undefined;
  }

  private requestResponse() {
    const pending = this.pending!;
    if (pending.responseRequested) return;
    pending.responseRequested = true;
    if (
      !this.send({ type: "response.create", event_id: pending.responseEventId })
    )
      this.settle(false);
  }

  private settle(success: boolean) {
    const pending = this.pending;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pending.resolve?.(success);
    pending.resolve = undefined;
    pending.responseRequested = false;
    if (success) this.pending = undefined;
    else this.failed();
  }
}
