import { Empty, Space } from "antd";
import { forwardRef } from "react";
import { MessageBubble, type RenderedMessage } from "./MessageBubble";

interface MessageListProps {
  messages: RenderedMessage[];
  onMentionSender?: (message: RenderedMessage) => void;
  onQuoteMessage?: (message: RenderedMessage) => void;
  onRecallMessage?: (message: RenderedMessage) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  { messages, onMentionSender, onQuoteMessage, onRecallMessage },
  ref
) {
  return (
    <div className="message-list" ref={ref}>
      {messages.length === 0 ? (
        <Empty description="暂无消息" />
      ) : (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          {messages.map((item, index) => {
            const previous = messages[index - 1];
            const compact = previous && previous.senderName === item.senderName && previous.own === item.own;
            return (
              <MessageBubble
                key={item.clientMessageId}
                message={item}
                compact={Boolean(compact)}
                onMentionSender={onMentionSender}
                onQuoteMessage={onQuoteMessage}
                onRecallMessage={onRecallMessage}
              />
            );
          })}
        </Space>
      )}
    </div>
  );
});
