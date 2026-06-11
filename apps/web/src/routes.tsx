import { SocketEvents } from "@encrypted-chat/shared";
import type { FriendView, GroupView } from "@encrypted-chat/shared";
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
import { PrivateKeyUnlockPrompt } from "./components/PrivateKeyUnlockPrompt";
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
  const { apiClient, user, logout, socket, unreadConversationCounts } = useAuth();
  const location = useLocation();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [groupInviteCount, setGroupInviteCount] = useState(0);
  const directUnreadCount = countUnreadByPrefix(unreadConversationCounts, "direct:");
  const groupUnreadCount = countUnreadByPrefix(unreadConversationCounts, "group:");
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
      const [nextFriends, nextGroups, incomingRequests, groupInvites] = await Promise.all([
        api.listFriends(apiClient),
        api.listGroups(apiClient),
        api.listIncomingFriendRequests(apiClient),
        api.listGroupInvites(apiClient)
      ]);
      setFriends(nextFriends);
      setGroups(nextGroups);
      setFriendRequestCount(incomingRequests.length);
      setGroupInviteCount(groupInvites.length);
    } catch {
      setFriends([]);
      setGroups([]);
      setFriendRequestCount(0);
      setGroupInviteCount(0);
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
    socket.on(SocketEvents.FriendRequest, reload);
    socket.on(SocketEvents.FriendUpdated, reload);
    socket.on(SocketEvents.GroupInvite, reload);
    socket.on(SocketEvents.GroupUpdated, reload);
    return () => {
      socket.off(SocketEvents.FriendRequest, reload);
      socket.off(SocketEvents.FriendUpdated, reload);
      socket.off(SocketEvents.GroupInvite, reload);
      socket.off(SocketEvents.GroupUpdated, reload);
    };
  }, [loadConversations, socket]);

  return (
    <div className={shellClassName}>
      <SidebarNav
        user={user}
        directUnreadCount={directUnreadCount}
        friendRequestCount={friendRequestCount}
        groupUnreadCount={groupUnreadCount}
        groupNoticeCount={groupInviteCount}
        onLogout={logout}
      />
      <ConversationList friends={friends} groups={groups} unreadConversationCounts={unreadConversationCounts} />
      <main className="app-content">
        <PrivateKeyUnlockPrompt />
        <Outlet />
      </main>
    </div>
  );
}

function countUnreadByPrefix(counts: Record<string, number>, prefix: string): number {
  return Object.entries(counts)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((total, [, count]) => total + count, 0);
}
