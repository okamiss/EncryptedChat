import { PictureOutlined, SendOutlined, SmileOutlined } from "@ant-design/icons";
import { Button, Input, Popover, Space, Upload, type InputRef } from "antd";
import { useEffect, useRef, useState, type ClipboardEvent } from "react";

export type ComposerInsertRequest =
  | { id: string; type: "quote"; senderName: string; text: string }
  | { id: string; type: "mention"; label: string };

interface ChatComposerProps {
  disabled?: boolean;
  insertRequest?: ComposerInsertRequest;
  onSendText: (text: string) => Promise<void>;
  onSendImage: (file: File) => Promise<void>;
}

const SYSTEM_EMOJIS = [
  "😊",
  "😂",
  "🤣",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤔",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "👌",
  "💪",
  "🎉",
  "🔥",
  "❤️",
  "💔",
  "✨",
  "⭐",
  "🌹",
  "🍻",
  "☕",
  "🍰",
  "😂",
  "😅",
  "😴",
  "🙄"
];

export function ChatComposer({ disabled, insertRequest, onSendText, onSendImage }: ChatComposerProps) {
  const inputRef = useRef<InputRef>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const focusInput = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      focusInput();
      return;
    }
    setSending(true);
    try {
      await onSendText(trimmed);
      setText("");
    } finally {
      setSending(false);
      focusInput();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((current) => `${current}${emoji}`);
    setEmojiOpen(false);
    focusInput();
  };

  const sendImageFile = (file: File) => {
    void onSendImage(file).finally(focusInput);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || sending) {
      return;
    }
    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/")
    );
    const file = imageItem?.getAsFile();
    if (!file) {
      return;
    }
    event.preventDefault();
    sendImageFile(file);
  };

  useEffect(() => {
    if (!insertRequest) {
      return;
    }
    if (insertRequest.type === "mention") {
      setText((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}@${insertRequest.label} `);
      focusInput();
      return;
    }
    const quoteText = insertRequest.text.replace(/\s+/g, " ").slice(0, 160);
    setText((current) => `${current}${current.trim().length > 0 ? "\n" : ""}> ${insertRequest.senderName}: ${quoteText}\n\n`);
    focusInput();
  }, [insertRequest]);

  return (
    <div className="composer">
      <Space.Compact style={{ width: "100%" }}>
        <Input.TextArea
          ref={inputRef}
          value={text}
          autoSize={{ minRows: 3, maxRows: 3 }}
          disabled={disabled || sending}
          placeholder="输入加密消息"
          onChange={(event) => setText(event.target.value)}
          onPaste={handlePaste}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              void sendText();
            }
          }}
        />
        <Popover
          trigger="click"
          open={emojiOpen}
          onOpenChange={setEmojiOpen}
          content={
            <div className="emoji-grid">
              {SYSTEM_EMOJIS.map((emoji, index) => (
                <button key={`${emoji}-${index}`} type="button" className="emoji-option" onClick={() => insertEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          }
        >
          <Button aria-label="插入表情" icon={<SmileOutlined />} disabled={disabled || sending} />
        </Popover>
        <Upload
          accept="image/*"
          showUploadList={false}
          disabled={disabled || sending}
          beforeUpload={(file) => {
            sendImageFile(file as File);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button aria-label="发送图片" icon={<PictureOutlined />} disabled={disabled || sending} />
        </Upload>
        <Button
          aria-label="发送"
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          disabled={disabled}
          onClick={() => void sendText()}
        />
      </Space.Compact>
    </div>
  );
}
