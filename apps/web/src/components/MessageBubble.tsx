import { CommentOutlined, FileImageOutlined, LockOutlined, RollbackOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Image, Popconfirm, Space, Tooltip, Typography } from "antd";
import { formatMessageTime } from "../utils/messageTime";

export interface RenderedMessage {
  clientMessageId: string;
  own: boolean;
  senderName: string;
  sentAt?: string;
  status: "decrypted" | "encrypted" | "failed";
  text?: string;
  imageUrl?: string;
  imageName?: string;
  richParts?: Array<{ type: "text"; text: string } | { type: "image"; imageUrl: string; imageName: string }>;
}

interface MessageBubbleProps {
  message: RenderedMessage;
  compact?: boolean;
  onMentionSender?: (message: RenderedMessage) => void;
  onQuoteMessage?: (message: RenderedMessage) => void;
  onRecallMessage?: (message: RenderedMessage) => void;
}

export function MessageBubble({ message, compact, onMentionSender, onQuoteMessage, onRecallMessage }: MessageBubbleProps) {
  const canUseActions = !message.own;
  const canQuote = message.status === "decrypted" && Boolean(message.text || message.imageName || message.richParts);
  const peerActions =
    canUseActions && (onQuoteMessage || onMentionSender) ? (
      <div className="message-actions">
        {onQuoteMessage && (
          <Tooltip title={canQuote ? "引用这条消息" : "消息解密后可引用"}>
            <Button
              aria-label="引用这条消息"
              size="small"
              type="text"
              icon={<CommentOutlined />}
              disabled={!canQuote}
              onClick={() => onQuoteMessage(message)}
            />
          </Tooltip>
        )}
        {onMentionSender && (
          <Tooltip title="@这个人">
            <Button
              aria-label="@这个人"
              size="small"
              type="text"
              icon={<UserOutlined />}
              onClick={() => onMentionSender(message)}
            />
          </Tooltip>
        )}
      </div>
    ) : null;
  const ownActions =
    message.own && onRecallMessage ? (
      <div className="message-actions own-message-actions">
        <Popconfirm
          title="撤回消息"
          description="确认撤回这条消息？"
          okText="撤回"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => onRecallMessage(message)}
        >
          <Tooltip title="撤回当前消息">
            <Button aria-label="撤回当前消息" size="small" type="text" icon={<RollbackOutlined />} />
          </Tooltip>
        </Popconfirm>
      </div>
    ) : null;

  return (
    <div className={`message-row ${message.own ? "own" : ""}${compact ? " compact" : ""}`}>
      {ownActions}
      {!message.own && (
        <div className="message-avatar" aria-hidden="true">
          {compact ? "" : message.senderName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="message-bubble">
        {!compact && (
          <div className="message-meta">
            {message.senderName}
            {message.sentAt ? ` · ${formatMessageTime(message.sentAt)}` : ""}
          </div>
        )}
        {message.status === "decrypted" && !message.richParts && message.text && <Typography.Text>{message.text}</Typography.Text>}
        {message.status === "decrypted" && message.imageUrl && (
          <Space direction="vertical" size={6}>
            <Image className="message-image" src={message.imageUrl} alt={message.imageName ?? "encrypted image"} />
            <Typography.Text type="secondary">
              <FileImageOutlined /> {message.imageName}
            </Typography.Text>
          </Space>
        )}
        {message.status === "decrypted" && message.richParts && (
          <Space direction="vertical" size={8} className="message-rich-content">
            {message.richParts.map((part, index) =>
              part.type === "text" ? (
                <Typography.Text key={index}>{part.text}</Typography.Text>
              ) : (
                <Space key={index} direction="vertical" size={6}>
                  <Image className="message-image" src={part.imageUrl} alt={part.imageName} />
                  <Typography.Text type="secondary">
                    <FileImageOutlined /> {part.imageName}
                  </Typography.Text>
                </Space>
              )
            )}
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
      {peerActions}
    </div>
  );
}
