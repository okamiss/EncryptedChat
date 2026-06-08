import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageBubble, type RenderedMessage } from "./MessageBubble";

const message: RenderedMessage = {
  clientMessageId: "message-1",
  own: false,
  senderName: "Alice",
  status: "decrypted",
  text: "hello"
};

describe("MessageBubble", () => {
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

  it("shows a recall action for own messages", () => {
    const ownMessage = { ...message, own: true };
    const onRecallMessage = vi.fn();

    render(<MessageBubble message={ownMessage} onRecallMessage={onRecallMessage} />);

    fireEvent.click(screen.getByLabelText("撤回当前消息"));

    expect(onRecallMessage).toHaveBeenCalledWith(ownMessage);
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
});
