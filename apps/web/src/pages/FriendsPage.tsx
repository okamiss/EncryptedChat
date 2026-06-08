import { CheckOutlined, MessageOutlined, ReloadOutlined, StopOutlined, UserAddOutlined } from "@ant-design/icons";
import { App, Badge, Button, Empty, List, Space, Tabs, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequestView, FriendView } from "@encrypted-chat/shared";
import { useAuth } from "../state/AuthContext";
import * as api from "../services/api";
import { displayUserName } from "../utils/displayName";

export function FriendsPage() {
  const { apiClient, unreadConversationKeys } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestView[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestView[]>([]);

  const load = useCallback(async () => {
    const [friendList, incomingRequests, outgoingRequests] = await Promise.all([
      api.listFriends(apiClient),
      api.listIncomingFriendRequests(apiClient),
      api.listOutgoingFriendRequests(apiClient)
    ]);
    setFriends(friendList);
    setIncoming(incomingRequests);
    setOutgoing(outgoingRequests);
  }, [apiClient]);

  useEffect(() => {
    void load().catch((error) => message.error(error instanceof Error ? error.message : "加载好友失败"));
  }, [load, message]);

  return (
    <section className="surface">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            好友
          </Typography.Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              刷新
            </Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate("/add-friend")}>
              添加好友
            </Button>
          </Space>
        </Space>
        <Tabs
          items={[
            {
              key: "friends",
              label: <Badge dot={unreadConversationKeys.some((key) => key.startsWith("direct:"))}>好友列表 {friends.length}</Badge>,
              children: (
                <List
                  locale={{ emptyText: <Empty description="暂无好友" /> }}
                  dataSource={friends}
                  renderItem={(friend) => (
                    <List.Item
                      actions={[
                        <Button
                          key="chat"
                          type="primary"
                          icon={<MessageOutlined />}
                          onClick={() => navigate(`/chats/${friend.id}`)}
                        >
                          聊天
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Badge dot={unreadConversationKeys.includes(`direct:${friend.id}`)}>
                            {displayUserName(friend)}
                          </Badge>
                        }
                        description={`用户名 ${friend.username} · UID ${friend.uid}`}
                      />
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: "incoming",
              label: `收到申请 ${incoming.length}`,
              children: (
                <List
                  locale={{ emptyText: <Empty description="暂无收到的申请" /> }}
                  dataSource={incoming}
                  renderItem={(request) => (
                    <List.Item
                      actions={[
                        <Button
                          key="accept"
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={async () => {
                            await api.acceptFriendRequest(apiClient, request.id);
                            message.success("已同意好友申请");
                            await load();
                          }}
                        >
                          同意
                        </Button>,
                        <Button
                          key="reject"
                          danger
                          icon={<StopOutlined />}
                          onClick={async () => {
                            await api.rejectFriendRequest(apiClient, request.id);
                            message.success("已拒绝好友申请");
                            await load();
                          }}
                        >
                          拒绝
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={displayUserName(request.requester)}
                        description={`用户名 ${request.requester.username} · UID ${request.requester.uid}`}
                      />
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: "outgoing",
              label: `发出申请 ${outgoing.length}`,
              children: (
                <List
                  locale={{ emptyText: <Empty description="暂无发出的申请" /> }}
                  dataSource={outgoing}
                  renderItem={(request) => (
                    <List.Item>
                      <List.Item.Meta
                        title={displayUserName(request.addressee)}
                        description={`用户名 ${request.addressee.username} · UID ${request.addressee.uid}`}
                      />
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Space>
    </section>
  );
}
