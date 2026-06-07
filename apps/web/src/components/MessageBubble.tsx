import { FileImageOutlined, LockOutlined } from "@ant-design/icons";
import { Image, Space, Typography } from "antd";

export interface RenderedMessage {
  clientMessageId: string;
  own: boolean;
  senderName: string;
  sentAt?: string;
  status: "decrypted" | "encrypted" | "failed";
  text?: string;
  imageUrl?: string;
  imageName?: string;
}

export function MessageBubble({ message }: { message: RenderedMessage }) {
  return (
    <div className={`message-row ${message.own ? "own" : ""}`}>
      <div className="message-bubble">
        <div className="message-meta">
          {message.senderName}
          {message.sentAt ? ` · ${new Date(message.sentAt).toLocaleString()}` : ""}
        </div>
        {message.status === "decrypted" && message.text && <Typography.Text>{message.text}</Typography.Text>}
        {message.status === "decrypted" && message.imageUrl && (
          <Space direction="vertical" size={6}>
            <Image className="message-image" src={message.imageUrl} alt={message.imageName ?? "encrypted image"} />
            <Typography.Text type="secondary">
              <FileImageOutlined /> {message.imageName}
            </Typography.Text>
          </Space>
        )}
        {message.status === "encrypted" && (
          <Typography.Text type="secondary">
            <LockOutlined /> 等待私钥解锁后解密
          </Typography.Text>
        )}
        {message.status === "failed" && (
          <Typography.Text type="danger">
            <LockOutlined /> 解密失败
          </Typography.Text>
        )}
      </div>
    </div>
  );
}
