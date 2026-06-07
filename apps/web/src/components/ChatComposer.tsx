import { PictureOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Input, Space, Upload } from "antd";
import { useState } from "react";

interface ChatComposerProps {
  disabled?: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendImage: (file: File) => Promise<void>;
}

export function ChatComposer({ disabled, onSendText, onSendImage }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

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
        <Upload
          accept="image/*"
          showUploadList={false}
          disabled={disabled || sending}
          beforeUpload={(file) => {
            void onSendImage(file as File);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<PictureOutlined />} disabled={disabled || sending} />
        </Upload>
        <Button type="primary" icon={<SendOutlined />} loading={sending} disabled={disabled} onClick={() => void sendText()} />
      </Space.Compact>
    </div>
  );
}
