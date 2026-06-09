import { fireEvent, render, waitFor } from "@testing-library/react";
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

    await waitFor(() => expect(jumpButton(container)?.textContent).toContain("3"));
    const divider = container.querySelector(".message-unread-divider") as HTMLDivElement;
    expect(divider).not.toBeNull();
    expect(divider.compareDocumentPosition(container.querySelector('[data-message-id="message-4"]') as Element)).toBeTruthy();

    fireEvent.click(jumpButton(container) as HTMLButtonElement);

    expect(onJumpToLatest).toHaveBeenCalled();
    expect(list.scrollTop).toBe(list.scrollHeight);
  });

  it("does not show the jump affordance when unread messages do not overflow the viewport", async () => {
    const { container } = render(<MessageList messages={messages(2)} unreadCount={1} />);
    const list = container.querySelector(".message-list") as HTMLDivElement;
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 200 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 300 });
    fireEvent.scroll(list);

    await waitFor(() => expect(jumpButton(container)).toBeNull());
  });

  it("reduces the unread badge as unread messages are scrolled past", async () => {
    const { container } = render(<MessageList messages={messages(6)} unreadCount={3} />);
    const list = container.querySelector(".message-list") as HTMLDivElement;
    makeScrollable(list);

    await waitFor(() => expect(jumpButton(container)?.textContent).toContain("3"));

    const unreadRows = Array.from(container.querySelectorAll("[data-unread-message='true']"));
    Object.defineProperty(list, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, bottom: 300 })
    });
    Object.defineProperty(unreadRows[0], "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: -80, bottom: -1 })
    });
    Object.defineProperty(unreadRows[1], "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 40, bottom: 120 })
    });
    Object.defineProperty(unreadRows[2], "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 140, bottom: 220 })
    });

    fireEvent.scroll(list);

    await waitFor(() => expect(jumpButton(container)?.textContent).toContain("2"));
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

function jumpButton(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector(".message-jump-latest");
}
