import {
  ContactsOutlined,
  MessageOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Layout, Menu, Space, Typography, Button, Alert } from "antd";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
  const { user, privateKeyStatus, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout className="app-layout">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" width={236} className="app-sider">
        <div className="brand">EncryptedChat</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey(location.pathname)]}
          onClick={({ key }) => navigate(String(key))}
          items={[
            { key: "/friends", icon: <ContactsOutlined />, label: "好友" },
            { key: "/add-friend", icon: <PlusOutlined />, label: "添加好友" },
            { key: "/groups", icon: <TeamOutlined />, label: "群聊" },
            { key: "/profile", icon: <UserOutlined />, label: "个人信息" }
          ]}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: "#fff", borderBottom: "1px solid #dbe3ef", paddingInline: 20 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space>
              <MessageOutlined />
              <Typography.Text strong>{user?.username}</Typography.Text>
              <Typography.Text type="secondary">UID {user?.uid}</Typography.Text>
            </Space>
            <Button onClick={logout}>退出</Button>
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
