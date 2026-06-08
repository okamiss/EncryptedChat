import {
  ContactsOutlined,
  LogoutOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Avatar, Badge, Button, Popconfirm, Tooltip } from "antd";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SafeUser } from "@encrypted-chat/shared";
import { ThemeModeButton } from "./ThemeModeButton";

interface SidebarNavProps {
  user?: SafeUser;
  directUnreadCount: number;
  friendRequestCount: number;
  groupUnreadCount: number;
  groupNoticeCount: number;
  onLogout: () => void;
}

type NavItem = {
  path: string;
  label: string;
  icon: ReactNode;
  unread?: "direct" | "group";
};

const navItems: NavItem[] = [
  { path: "/friends", label: "好友", icon: <ContactsOutlined />, unread: "direct" },
  { path: "/add-friend", label: "添加好友", icon: <PlusOutlined /> },
  { path: "/groups", label: "群聊", icon: <TeamOutlined />, unread: "group" },
  { path: "/profile", label: "个人信息", icon: <UserOutlined /> }
] as const;

export function SidebarNav({
  user,
  directUnreadCount,
  friendRequestCount,
  groupUnreadCount,
  groupNoticeCount,
  onLogout
}: SidebarNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const directNavCount = directUnreadCount + friendRequestCount;
  const groupNavCount = groupUnreadCount + groupNoticeCount;

  return (
    <aside className="sidebar-nav" aria-label="主导航">
      <button type="button" className="brand-mark" onClick={() => navigate("/friends")} aria-label="EncryptedChat">
        EC
      </button>
      <nav className="sidebar-nav-items">
        {navItems.map((item) => {
          const active = selectedKey(location.pathname) === item.path;
          const unreadCount = item.unread === "direct" ? directNavCount : item.unread === "group" ? groupNavCount : 0;
          return (
            <Tooltip key={item.path} title={item.label} placement="right">
              <button
                type="button"
                className={`sidebar-nav-button${active ? " active" : ""}`}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
              >
                <Badge count={unreadCount} overflowCount={99} offset={[2, 1]}>
                  {item.icon}
                </Badge>
              </button>
            </Tooltip>
          );
        })}
      </nav>
      <div className="sidebar-nav-bottom">
        <ThemeModeButton />
        <Tooltip title={user?.username ?? "当前用户"} placement="right">
          <Avatar size={34} className="sidebar-avatar">
            {(user?.username ?? "U").slice(0, 1).toUpperCase()}
          </Avatar>
        </Tooltip>
        <Popconfirm
          title="退出登录"
          description="确认退出当前账号？"
          okText="退出"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={onLogout}
        >
          <Tooltip title="退出登录" placement="right">
            <Button aria-label="退出登录" type="text" icon={<LogoutOutlined />} />
          </Tooltip>
        </Popconfirm>
      </div>
    </aside>
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
