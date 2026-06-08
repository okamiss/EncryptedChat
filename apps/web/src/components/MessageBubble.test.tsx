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

    render(
      <MessageBubble message={message} onQuoteMessage={onQuoteMessage} onMentionSender={onMentionSender} />
    );

    fireEvent.click(screen.getByLabelText("引用这条消息"));
    fireEvent.click(screen.getByLabelText("@这个人"));

    expect(onQuoteMessage).toHaveBeenCalledWith(message);
    expect(onMentionSender).toHaveBeenCalledWith(message);
  });

  it("does not show quote and mention actions for own messages", () => {
    render(
      <MessageBubble
        message={{ ...message, own: true }}
        onQuoteMessage={vi.fn()}
        onMentionSender={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("引用这条消息")).toBeNull();
    expect(screen.queryByLabelText("@这个人")).toBeNull();
  });

  it("asks for confirmation before recalling an own message", async () => {
    const ownMessage = { ...message, own: true };
    const onRecallMessage = vi.fn();

    render(<MessageBubble message={ownMessage} onRecallMessage={onRecallMessage} />);

    fireEvent.click(screen.getByLabelText("撤回当前消息"));

    expect(onRecallMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: (name) => name.replace(/\s/g, "") === "撤回" }));

    await waitFor(() => expect(onRecallMessage).toHaveBeenCalledWith(ownMessage));
    expect(screen.queryByLabelText("引用这条消息")).toBeNull();
    expect(screen.queryByLabelText("@这个人")).toBeNull();
  });

  it("allows mentioning encrypted left-side messages while quote is disabled", () => {
    const onMentionSender = vi.fn();

    render(
      <MessageBubble
        message={{ ...message, status: "encrypted", text: undefined }}
        onQuoteMessage={vi.fn()}
        onMentionSender={onMentionSender}
      />
    );

    expect((screen.getByLabelText("引用这条消息") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("@这个人"));

    expect(onMentionSender).toHaveBeenCalled();
  });

  it("shows today's sent time as hour and minute only", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-08T13:30:00" }} />);

    expect(screen.getByText("Alice · 13:30")).not.toBeNull();
  });

  it("shows yesterday's sent time with a yesterday prefix", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-07T10:20:00" }} />);

    expect(screen.getByText("Alice · 昨天10:20")).not.toBeNull();
  });

  it("shows current-year older messages as month-day hour and minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-08T22:51:00" }} />);

    expect(screen.getByText("Alice · 6-8 22:51")).not.toBeNull();
  });

  it("shows previous-year messages with full date and seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-06-08T23:00:00"));

    render(<MessageBubble message={{ ...message, sentAt: "2026-06-08T22:52:00" }} />);

    expect(screen.getByText("Alice · 2026-6-8 22:52:00")).not.toBeNull();
  });
});
