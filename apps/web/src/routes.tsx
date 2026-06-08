import { LockOutlined } from "@ant-design/icons";
import { SocketEvents } from "@encrypted-chat/shared";
import type { FriendView, GroupView } from "@encrypted-chat/shared";
import { Alert } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AddFriendPage } from "./pages/AddFriendPage";
import { ChatPage } from "./pages/ChatPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import { FriendsPage } from "./pages/FriendsPage";
import { GroupChatPage } from "./pages/GroupChatPage";
import { GroupsPage } from "./pages/GroupsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import * as api from "./services/api";
import { useAuth } from "./state/AuthContext";
import { ConversationList } from "./components/ConversationList";
import { SidebarNav } from "./components/SidebarNav";

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
  const { apiClient, user, privateKeyStatus, logout, socket, unreadConversationKeys } = useAuth();
  const location = useLocation();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [groups, setGroups] = useState<GroupView[]>([]);
  const hasDirectUnread = unreadConversationKeys.some((key) => key.startsWith("direct:"));
  const hasGroupUnread = unreadConversationKeys.some((key) => key.startsWith("group:"));
  const isChatRoute = location.pathname.startsWith("/chats/") || location.pathname.startsWith("/groups/");
  const isListRoute = location.pathname === "/friends" || location.pathname === "/groups";
  const shellClassName = [
    "app-shell",
    isChatRoute ? "chat-route-active" : "",
    !isChatRoute && !isListRoute ? "utility-route-active" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const loadConversations = useCallback(async () => {
    try {
      const [nextFriends, nextGroups] = await Promise.all([api.listFriends(apiClient), api.listGroups(apiClient)]);
      setFriends(nextFriends);
      setGroups(nextGroups);
    } catch {
      setFriends([]);
      setGroups([]);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const reload = () => {
      void loadConversations();
    };
    socket.on(SocketEvents.FriendUpdated, reload);
    socket.on(SocketEvents.GroupUpdated, reload);
    return () => {
      socket.off(SocketEvents.FriendUpdated, reload);
      socket.off(SocketEvents.GroupUpdated, reload);
    };
  }, [loadConversations, socket]);

  return (
    <div className={shellClassName}>
      <SidebarNav
        user={user}
        hasDirectUnread={hasDirectUnread}
        hasGroupUnread={hasGroupUnread}
        onLogout={logout}
      />
      <ConversationList friends={friends} groups={groups} unreadConversationKeys={unreadConversationKeys} />
      <main className="app-content">
        {privateKeyStatus !== "ready" && (
          <Alert
            className="key-status-alert"
            type="warning"
            showIcon
            icon={<LockOutlined />}
            message={privateKeyStatus === "missing" ? "当前浏览器没有私钥，无法解密消息。" : "私钥尚未解锁。"}
          />
        )}
        <Outlet />
      </main>
    </div>
  );
}
