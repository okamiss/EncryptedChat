import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatComposer, type ComposerMessagePart } from "./ChatComposer";

describe("ChatComposer", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:preview")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn()
    });
  });

  it("inserts a system emoji into the message before sending", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendMessage={onSendMessage} />);

    typeIntoComposer("hello");
    fireEvent.click(screen.getByLabelText("插入表情"));
    fireEvent.click(screen.getByText("😊"));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() =>
      expect(onSendMessage).toHaveBeenCalledWith([{ type: "text", text: "hello😊" } satisfies ComposerMessagePart])
    );
  });

  it("inserts a system emoji at the remembered caret when the picker has focus", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendMessage={onSendMessage} />);

    typeIntoComposer("hello");
    placeCaretInComposerText(2);
    clickEmojiPickerButton();
    const emoji = document.querySelector(".emoji-option") as HTMLButtonElement;
    const emojiText = emoji.textContent ?? "";
    moveSelectionOutsideComposer(emoji);
    fireEvent.click(emoji);
    clickSendButton();

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith([{ type: "text", text: `he${emojiText}llo` }]));
  });

  it("offers additional emojis in the emoji picker", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendMessage={onSendMessage} />);

    typeIntoComposer("hello");
    fireEvent.click(screen.getByLabelText("插入表情"));
    fireEvent.click(screen.getByText("🤣"));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith([{ type: "text", text: "hello🤣" }]));
  });

  it("keeps pasted images in the draft until sending", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    const file = new File(["image"], "pasted.png", { type: "image/png" });

    render(<ChatComposer onSendMessage={onSendMessage} />);

    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: {
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }]
      }
    });

    expect(onSendMessage).not.toHaveBeenCalled();
    expect(screen.getByText("pasted.png")).not.toBeNull();

    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith([{ type: "image", file }]));
  });

  it("places the caret in an editable text node after inserting an image", () => {
    const file = new File(["image"], "ime.png", { type: "image/png" });

    render(<ChatComposer onSendMessage={vi.fn()} />);

    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: {
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }]
      }
    });

    const selection = window.getSelection();
    expect(selection?.anchorNode?.nodeType).toBe(Node.TEXT_NODE);
    expect(screen.getByRole("textbox").contains(selection?.anchorNode ?? null)).toBe(true);
  });

  it("sends Chinese text typed immediately after an inserted image", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    const file = new File(["image"], "ime.png", { type: "image/png" });

    render(<ChatComposer onSendMessage={onSendMessage} />);

    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: {
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }]
      }
    });
    typeAtCurrentSelection("你好");
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() =>
      expect(onSendMessage).toHaveBeenCalledWith([
        { type: "image", file },
        { type: "text", text: "你好" }
      ])
    );
  });

  it("sends text and draft images as one ordered message", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    const file = new File(["image"], "mixed.png", { type: "image/png" });

    render(<ChatComposer onSendMessage={onSendMessage} />);

    typeIntoComposer("before ");
    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: {
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }]
      }
    });
    typeIntoComposer(" after");
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() =>
      expect(onSendMessage).toHaveBeenCalledWith([
        { type: "text", text: "before " },
        { type: "image", file },
        { type: "text", text: " after" }
      ])
    );
  });

  it("inserts a requested sender mention before sending", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatComposer
        onSendMessage={onSendMessage}
        insertRequest={{ id: "mention-1", type: "mention", label: "Alice" }}
      />
    );

    await waitFor(() => expect(screen.getByRole("textbox").textContent).toContain("@Alice "));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith([{ type: "text", text: "@Alice" }]));
  });

  it("keeps focus in the composer after sending", async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendMessage={onSendMessage} />);

    const composer = screen.getByRole("textbox");
    typeIntoComposer("hello");
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith([{ type: "text", text: "hello" }]));
    await waitFor(() => expect(document.activeElement).toBe(composer));
  });

  it("inserts a requested quoted message into the composer", async () => {
    render(
      <ChatComposer
        onSendMessage={vi.fn()}
        insertRequest={{ id: "quote-1", type: "quote", senderName: "Alice", text: "hello from before" }}
      />
    );

    await waitFor(() => expect(screen.getByRole("textbox").textContent).toContain("> Alice: hello from before"));
  });
});

function typeIntoComposer(text: string) {
  const composer = screen.getByRole("textbox");
  composer.append(document.createTextNode(text));
  const range = document.createRange();
  range.selectNodeContents(composer);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.input(composer);
}

function typeAtCurrentSelection(text: string) {
  const composer = screen.getByRole("textbox");
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : document.createRange();
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.input(composer);
}

function clickSendButton() {
  const sendButton = document.querySelector(".composer-actions button");
  if (!sendButton) {
    throw new Error("Send button not found");
  }
  fireEvent.click(sendButton);
}

function clickEmojiPickerButton() {
  const emojiButton = document.querySelector(".composer-toolbar button");
  if (!emojiButton) {
    throw new Error("Emoji button not found");
  }
  fireEvent.click(emojiButton);
}

function placeCaretInComposerText(offset: number) {
  const composer = screen.getByRole("textbox");
  const textNode = composer.firstChild;
  if (!textNode) {
    throw new Error("Composer has no text node");
  }
  const range = document.createRange();
  range.setStart(textNode, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.keyUp(composer);
}

function moveSelectionOutsideComposer(node: Node) {
  const range = document.createRange();
  range.selectNode(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
