import {
  ContactsOutlined,
  MessageOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import type { FriendView, GroupView } from "@encrypted-chat/shared";
import { Alert, Badge, Button, Layout, Menu, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import * as api from "./services/api";
import { useAuth } from "./state/AuthContext";
import { AddFriendPage } from "./pages/AddFriendPage";
import { ChatPage } from "./pages/ChatPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import { FriendsPage } from "./pages/FriendsPage";
import { GroupChatPage } from "./pages/GroupChatPage";
import { GroupsPage } from "./pages/GroupsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ThemeModeButton } from "./components/ThemeModeButton";
import { displayUserName } from "./utils/displayName";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/friends" replace />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/add-friend" element={<AddFriendPage />} />
          <Route path="/chats/:friendId" element={<ChatPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/groups/:groupId" element={<GroupChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/friends" replace />} />
    </Routes>
  );
}

function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AppLayout() {
  const { apiClient, user, privateKeyStatus, logout, unreadConversationKeys } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [quickFriends, setQuickFriends] = useState<FriendView[]>([]);
  const [quickGroups, setQuickGroups] = useState<GroupView[]>([]);
  const hasDirectUnread = unreadConversationKeys.some((key) => key.startsWith("direct:"));
  const hasGroupUnread = unreadConversationKeys.some((key) => key.startsWith("group:"));

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.listFriends(apiClient), api.listGroups(apiClient)])
      .then(([friends, groups]) => {
        if (cancelled) {
          return;
        }
        setQuickFriends(friends.slice(0, 3));
        setQuickGroups(groups.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) {
          setQuickFriends([]);
          setQuickGroups([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  return (
    <Layout className="app-layout">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" width={236} className="app-sider">
        <div className="brand">EncryptedChat</div>
        {(quickFriends.length > 0 || quickGroups.length > 0) && (
          <div className="side-quick">
            <Typography.Text className="side-quick-title">快捷入口</Typography.Text>
            <div className="side-quick-list">
              {quickFriends.map((friend) => {
                const key = `direct:${friend.id}`;
                const active = location.pathname === `/chats/${friend.id}`;
                return (
                  <button
                    key={friend.id}
                    type="button"
                    className={`side-quick-item${active ? " active" : ""}`}
                    onClick={() => navigate(`/chats/${friend.id}`)}
                  >
                    <MessageOutlined />
                    <span>{displayUserName(friend)}</span>
                    <Badge dot={unreadConversationKeys.includes(key)} />
                  </button>
                );
              })}
              {quickGroups.map((group) => {
                const key = `group:${group.id}`;
                const active = location.pathname === `/groups/${group.id}`;
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`side-quick-item${active ? " active" : ""}`}
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <TeamOutlined />
                    <span>{group.name}</span>
                    <Badge dot={unreadConversationKeys.includes(key)} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey(location.pathname)]}
          onClick={({ key }) => navigate(String(key))}
          items={[
            { key: "/friends", icon: <ContactsOutlined />, label: <Badge dot={hasDirectUnread}>好友</Badge> },
            { key: "/add-friend", icon: <PlusOutlined />, label: "添加好友" },
            { key: "/groups", icon: <TeamOutlined />, label: <Badge dot={hasGroupUnread}>群聊</Badge> },
            { key: "/profile", icon: <UserOutlined />, label: "个人信息" }
          ]}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-header">
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space>
              <MessageOutlined />
              <Typography.Text strong>{user?.username}</Typography.Text>
              <Typography.Text type="secondary">UID {user?.uid}</Typography.Text>
            </Space>
            <Space>
              <ThemeModeButton />
              <Button onClick={logout}>退出</Button>
            </Space>
          </Space>
        </Layout.Header>
        <Layout.Content className="app-content">
          {privateKeyStatus !== "ready" && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={privateKeyStatus === "missing" ? "当前浏览器没有私钥，无法解密消息。" : "私钥尚未解锁。"}
            />
          )}
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

function selectedKey(pathname: string) {
  if (pathname.startsWith("/groups")) {
    return "/groups";
  }
  if (pathname.startsWith("/chats")) {
    return "/friends";
  }
  return pathname;
}
