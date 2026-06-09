import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageBubble, type RenderedMessage } from "./MessageBubble";

const message: RenderedMessage = {
  clientMessageId: "message-1",
  own: false,
  senderName: "Alice",
  status: "decrypted",
  text: "hello"
};

describe("MessageBubble", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows quote and mention actions for left-side decrypted messages", () => {
    const onQuoteMessage = vi.fn();
    const onMentionSender = vi.fn();

    const { container } = render(
      <MessageBubble message={message} onQuoteMessage={onQuoteMessage} onMentionSender={onMentionSender} />
    );

    const [quoteButton, mentionButton] = messageActionButtons(container);
    fireEvent.click(quoteButton);
    fireEvent.click(mentionButton);

    expect(onQuoteMessage).toHaveBeenCalledWith(message);
    expect(onMentionSender).toHaveBeenCalledWith(message);
  });

  it("does not show quote and mention actions for own messages", () => {
    const { container } = render(
      <MessageBubble message={{ ...message, own: true }} onQuoteMessage={vi.fn()} onMentionSender={vi.fn()} />
    );

    expect(messageActionButtons(container)).toHaveLength(0);
  });

  it("asks for confirmation before recalling an own message", async () => {
    const ownMessage = { ...message, own: true };
    const onRecallMessage = vi.fn();

    const { container } = render(<MessageBubble message={ownMessage} onRecallMessage={onRecallMessage} />);

    const [recallButton] = messageActionButtons(container);
    fireEvent.click(recallButton);

    expect(onRecallMessage).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector(".ant-popconfirm-buttons .ant-btn-primary") as HTMLButtonElement);

    await waitFor(() => expect(onRecallMessage).toHaveBeenCalledWith(ownMessage));
  });

  it("allows mentioning encrypted left-side messages while quote is disabled", () => {
    const onMentionSender = vi.fn();

    const { container } = render(
      <MessageBubble
        message={{ ...message, status: "encrypted", text: undefined }}
        onQuoteMessage={vi.fn()}
        onMentionSender={onMentionSender}
      />
    );

    const [quoteButton, mentionButton] = messageActionButtons(container);
    expect((quoteButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(mentionButton);

    expect(onMentionSender).toHaveBeenCalled();
  });

  it("shows today's sent time as hour and minute only", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-08T13:30:00" }} />);

    expect(messageMeta()).toContain("13:30");
  });

  it("shows yesterday's sent time with a yesterday prefix", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-07T10:20:00" }} />);

    expect(messageMeta()).toContain("10:20");
  });

  it("shows current-year older messages as month-day hour and minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-08T22:51:00" }} />);

    expect(messageMeta()).toContain("6-8 22:51");
  });

  it("shows previous-year messages with full date and seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-06-08T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-08T22:52:00" }} />);

    expect(messageMeta()).toContain("2026-6-8 22:52:00");
  });

  it("renders recalled messages as a centered timeline notice", () => {
    const { container } = render(
      <MessageBubble
        message={{
          clientMessageId: "recall-message-1",
          own: false,
          senderName: "Alice",
          sentAt: "2026-06-08T13:30:00",
          status: "system",
          text: "Alice recalled a message"
        }}
      />
    );

    expect(document.querySelector(".message-system-notice")?.textContent).toContain("Alice recalled a message");
    expect(container.querySelector(".message-row.system")).not.toBeNull();
    expect(messageActionButtons(container)).toHaveLength(0);
  });
});

function messageActionButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll(".message-actions button"));
}

function messageMeta(): string {
  return document.querySelector(".message-meta")?.textContent ?? "";
}
