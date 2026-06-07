import { PictureOutlined, SendOutlined, SmileOutlined } from "@ant-design/icons";
import { Button, Input, Popover, Space, Upload } from "antd";
import { useState } from "react";

interface ChatComposerProps {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendImage: (file: File) => Promise<void>;
}

const SYSTEM_EMOJIS = ["😊", "😂", "😍", "👍", "🙏", "🎉", "❤️", "🔥", "😎", "😭", "🤔", "👌"];

export function ChatComposer({ disabled, onSendText, onSendImage }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setSending(true);
    try {
      await onSendText(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  };

  return (
    <div className="composer">
      <Space.Compact style={{ width: "100%" }}>
        <Input.TextArea
          value={text}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={disabled || sending}
          placeholder="输入加密消息"
          onChange={(event) => setText(event.target.value)}
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
              {SYSTEM_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" className="emoji-option" onClick={() => insertEmoji(emoji)}>
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
            void onSendImage(file as File);
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
