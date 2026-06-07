import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./ChatComposer";

describe("ChatComposer", () => {
  it("inserts a system emoji into the message before sending", async () => {
    const onSendText = vi.fn().mockResolvedValue(undefined);

    render(<ChatComposer onSendText={onSendText} onSendImage={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("输入加密消息"), { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("插入表情"));
    fireEvent.click(screen.getByText("😊"));
    fireEvent.click(screen.getByLabelText("发送"));

    await waitFor(() => expect(onSendText).toHaveBeenCalledWith("hello😊"));
  });
});
