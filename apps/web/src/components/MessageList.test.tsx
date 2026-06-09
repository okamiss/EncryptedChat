import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageList } from "./MessageList";
import type { RenderedMessage } from "./MessageBubble";

describe("MessageList", () => {
  it("marks the first unread message and can jump to the latest message when the list overflows", async () => {
    const onJumpToLatest = vi.fn();

    const { container } = render(
      <MessageList messages={messages(6)} unreadCount={3} onJumpToLatest={onJumpToLatest} />
    );
    const list = container.querySelector(".message-list") as HTMLDivElement;
    makeScrollable(list);
    fireEvent.scroll(list);

    await waitFor(() => expect(screen.getByText("3 条新消息")).not.toBeNull());
    const divider = screen.getByText("以下为新消息");
    expect(divider.compareDocumentPosition(screen.getByText("message 4")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByLabelText("跳到最新消息"));

    expect(onJumpToLatest).toHaveBeenCalled();
    expect(list.scrollTop).toBe(list.scrollHeight);
  });

  it("does not show the jump affordance when unread messages do not overflow the viewport", async () => {
    const { container } = render(<MessageList messages={messages(2)} unreadCount={1} />);
    const list = container.querySelector(".message-list") as HTMLDivElement;
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 200 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 300 });
    fireEvent.scroll(list);

    await waitFor(() => expect(screen.queryByLabelText("跳到最新消息")).toBeNull());
  });
});

function messages(count: number): RenderedMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    clientMessageId: `message-${index + 1}`,
    own: false,
    senderName: "Alice",
    status: "decrypted",
    text: `message ${index + 1}`,
    sentAt: `2026-06-09T08:0${index}:00.000Z`
  }));
}

function makeScrollable(element: HTMLDivElement) {
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: 1000 });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 300 });
  element.scrollTop = 0;
}
