import { CheckOutlined, MessageOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { App, Button, Empty, List, Space, Tabs, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GroupInviteView, GroupView } from "@encrypted-chat/shared";
import { useAuth } from "../state/AuthContext";
import * as api from "../services/api";

export function GroupsPage() {
  const { apiClient } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [invites, setInvites] = useState<GroupInviteView[]>([]);

  const load = useCallback(async () => {
    const [groupList, groupInvites] = await Promise.all([api.listGroups(apiClient), api.listGroupInvites(apiClient)]);
    setGroups(groupList);
    setInvites(groupInvites);
  }, [apiClient]);

  useEffect(() => {
    void load().catch((error) => message.error(error instanceof Error ? error.message : "加载群聊失败"));
  }, [load, message]);

  return (
    <section className="surface">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            群聊
          </Typography.Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/groups/new")}>
              创建群聊
            </Button>
          </Space>
        </Space>
        <Tabs
          items={[
            {
              key: "groups",
              label: `我的群聊 ${groups.length}`,
              children: (
                <List
                  locale={{ emptyText: <Empty description="暂无群聊" /> }}
                  dataSource={groups}
                  renderItem={(group) => (
                    <List.Item
                      actions={[
                        <Button
                          key="chat"
                          type="primary"
                          icon={<MessageOutlined />}
                          onClick={() => navigate(`/groups/${group.id}`)}
                        >
                          进入
                        </Button>
                      ]}
                    >
                      <List.Item.Meta title={group.name} description={`${group.members.length} 位成员`} />
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: "invites",
              label: `群邀请 ${invites.length}`,
              children: (
                <List
                  locale={{ emptyText: <Empty description="暂无群邀请" /> }}
                  dataSource={invites}
                  renderItem={(invite) => (
                    <List.Item
                      actions={[
                        <Button
                          key="accept"
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={async () => {
                            await api.acceptGroupInvite(apiClient, invite.id);
                            message.success("已加入群聊");
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
                            await api.rejectGroupInvite(apiClient, invite.id);
                            message.success("已拒绝群邀请");
                            await load();
                          }}
                        >
                          拒绝
                        </Button>
                      ]}
                    >
                      <List.Item.Meta title={invite.group.name} description={`邀请人：${invite.inviter.username}`} />
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
