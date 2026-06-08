import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./ChatComposer";

describe("ChatComposer", () => {
  it("inserts a system emoji into the message before sending", async () => {
    const onSendText = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendText={onSendText} onSendImage={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("插入表情"));
    fireEvent.click(screen.getByText("😊"));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendText).toHaveBeenCalledWith("hello😊"));
  });

  it("offers additional emojis in the emoji picker", async () => {
    const onSendText = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendText={onSendText} onSendImage={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("插入表情"));
    fireEvent.click(screen.getByText("🤣"));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendText).toHaveBeenCalledWith("hello🤣"));
  });

  it("sends pasted images through the image sender", async () => {
    const onSendImage = vi.fn().mockResolvedValue(undefined);
    const file = new File(["image"], "pasted.png", { type: "image/png" });

    render(<ChatComposer onSendText={vi.fn()} onSendImage={onSendImage} />);

    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => file
          }
        ]
      }
    });

    await waitFor(() => expect(onSendImage).toHaveBeenCalledWith(file));
  });

  it("inserts a requested sender mention before sending", async () => {
    const onSendText = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatComposer
        onSendText={onSendText}
        onSendImage={vi.fn()}
        insertRequest={{ id: "mention-1", type: "mention", label: "Alice" }}
      />
    );

    await waitFor(() => expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("@Alice "));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendText).toHaveBeenCalledWith("@Alice"));
  });

  it("keeps focus in the composer after sending", async () => {
    const onSendText = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendText={onSendText} onSendImage={vi.fn()} />);

    const composer = screen.getByRole("textbox");
    fireEvent.change(composer, { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendText).toHaveBeenCalledWith("hello"));
    await waitFor(() => expect(document.activeElement).toBe(composer));
  });

  it("inserts a requested quoted message into the composer", async () => {
    render(
      <ChatComposer
        onSendText={vi.fn()}
        onSendImage={vi.fn()}
        insertRequest={{ id: "quote-1", type: "quote", senderName: "Alice", text: "hello from before" }}
      />
    );

    await waitFor(() =>
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("> Alice: hello from before\n\n")
    );
  });
});
