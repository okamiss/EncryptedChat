import { MessageOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from "@ant-design/icons";
import type { FriendView, GroupView } from "@encrypted-chat/shared";
import { Avatar, Badge, Button, Empty, Input, Typography } from "antd";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { displayUserName } from "../utils/displayName";

interface ConversationListProps {
  friends: FriendView[];
  groups: GroupView[];
  unreadConversationKeys: string[];
}

export function ConversationList({ friends, groups, unreadConversationKeys }: ConversationListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const items = useMemo(() => {
    const directItems = friends.map((friend) => ({
      key: `direct:${friend.id}`,
      type: "direct" as const,
      title: displayUserName(friend),
      description: `${friend.username} · UID ${friend.uid}`,
      searchable: `${displayUserName(friend)} ${friend.username} ${friend.uid}`.toLowerCase(),
      path: `/chats/${friend.id}`
    }));
    const groupItems = groups.map((group) => ({
      key: `group:${group.id}`,
      type: "group" as const,
      title: group.name,
      description: `群号 ${group.code} · ${group.members.length} 位成员`,
      searchable: `${group.name} ${group.code}`.toLowerCase(),
      path: `/groups/${group.id}`
    }));
    return [...directItems, ...groupItems].filter((item) => !normalizedQuery || item.searchable.includes(normalizedQuery));
  }, [friends, groups, normalizedQuery]);

  return (
    <aside className="conversation-panel" aria-label="会话列表">
      <div className="conversation-panel-header">
        <div>
          <Typography.Title level={4}>会话</Typography.Title>
          <Typography.Text type="secondary">{friends.length + groups.length} 个加密连接</Typography.Text>
        </div>
        <Button aria-label="添加好友" type="text" icon={<PlusOutlined />} onClick={() => navigate("/add-friend")} />
      </div>
      <Input
        className="conversation-search"
        prefix={<SearchOutlined />}
        placeholder="搜索好友、群聊或 UID"
        allowClear
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="conversation-items">
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />
        ) : (
          items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`conversation-item${location.pathname === item.path ? " active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <Avatar className={`conversation-avatar ${item.type}`}>
                {item.type === "direct" ? <MessageOutlined /> : <TeamOutlined />}
              </Avatar>
              <span className="conversation-copy">
                <span className="conversation-title">{item.title}</span>
                <span className="conversation-description">{item.description}</span>
              </span>
              <Badge dot={unreadConversationKeys.includes(item.key)} />
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
