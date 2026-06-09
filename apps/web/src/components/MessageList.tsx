import { DownOutlined } from "@ant-design/icons";
import { Badge, Button, Empty, Space } from "antd";
import { forwardRef, useEffect, useMemo, useRef, useState, type ForwardedRef } from "react";
import { MessageBubble, type RenderedMessage } from "./MessageBubble";

interface MessageListProps {
  messages: RenderedMessage[];
  unreadCount?: number;
  onJumpToLatest?: () => void;
  onMentionSender?: (message: RenderedMessage) => void;
  onQuoteMessage?: (message: RenderedMessage) => void;
  onRecallMessage?: (message: RenderedMessage) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  { messages, unreadCount = 0, onJumpToLatest, onMentionSender, onQuoteMessage, onRecallMessage },
  ref
) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const unreadMarkerRef = useRef<HTMLDivElement | null>(null);
  const [showUnreadJump, setShowUnreadJump] = useState(false);
  const unreadStartIndex = useMemo(() => {
    if (unreadCount <= 0) {
      return -1;
    }
    return Math.max(0, messages.length - unreadCount);
  }, [messages.length, unreadCount]);

  const setListRef = (node: HTMLDivElement | null) => {
    listRef.current = node;
    setForwardedRef(ref, node);
  };

  const hasUnreadOverflow = () => {
    const list = listRef.current;
    return Boolean(list && unreadCount > 0 && list.scrollHeight > list.clientHeight + 8);
  };

  const jumpToLatest = () => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
    setShowUnreadJump(false);
    onJumpToLatest?.();
  };

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const shouldShow = hasUnreadOverflow();
      setShowUnreadJump(shouldShow);
      if (shouldShow && typeof unreadMarkerRef.current?.scrollIntoView === "function") {
        unreadMarkerRef.current.scrollIntoView({ block: "start" });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [messages, unreadCount]);

  useEffect(() => {
    if (!showUnreadJump || typeof unreadMarkerRef.current?.scrollIntoView !== "function") {
      return;
    }
    const frameId = requestAnimationFrame(() => unreadMarkerRef.current?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frameId);
  }, [showUnreadJump]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list || !hasUnreadOverflow()) {
      setShowUnreadJump(false);
      return;
    }
    const distanceToBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    setShowUnreadJump(distanceToBottom > 24);
  };

  return (
    <div className="message-list" ref={setListRef} onScroll={handleScroll}>
      {messages.length === 0 ? (
        <Empty description="鏆傛棤娑堟伅" />
      ) : (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          {messages.map((item, index) => {
            const previous = messages[index - 1];
            const compact = previous && previous.senderName === item.senderName && previous.own === item.own;
            return (
              <div key={item.clientMessageId}>
                {showUnreadJump && index === unreadStartIndex && (
                  <div ref={unreadMarkerRef} className="message-unread-divider">
                    以下为新消息
                  </div>
                )}
                <MessageBubble
                  message={item}
                  compact={Boolean(compact)}
                  onMentionSender={onMentionSender}
                  onQuoteMessage={onQuoteMessage}
                  onRecallMessage={onRecallMessage}
                />
              </div>
            );
          })}
        </Space>
      )}
      {showUnreadJump && (
        <Button
          aria-label="跳到最新消息"
          className="message-jump-latest"
          shape="circle"
          type="primary"
          icon={
            <Badge count={unreadCount} overflowCount={99} offset={[2, -2]}>
              <DownOutlined />
            </Badge>
          }
          onClick={jumpToLatest}
        >
          <span className="visually-hidden">{unreadCount} 条新消息</span>
        </Button>
      )}
    </div>
  );
});

function setForwardedRef(ref: ForwardedRef<HTMLDivElement>, value: HTMLDivElement | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) {
    ref.current = value;
  }
}
