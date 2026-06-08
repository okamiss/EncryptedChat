import { ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Avatar, Button, Drawer, Space, Typography } from "antd";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatarText?: string;
  backTo: string;
  actions?: ReactNode;
  profileTitle?: string;
  profilePanel?: ReactNode;
}

export function ChatHeader({ title, subtitle, avatarText, backTo, actions, profileTitle, profilePanel }: ChatHeaderProps) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="chat-header">
      <div className="chat-header-identity">
        <Button
          className="mobile-back-button"
          aria-label="返回会话列表"
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backTo)}
        />
        <Avatar className="chat-header-avatar">{(avatarText || title || "C").slice(0, 1).toUpperCase()}</Avatar>
        <div>
          <Typography.Title level={4}>{title}</Typography.Title>
          {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
        </div>
      </div>
      <Space className="chat-header-actions" wrap>
        {actions}
        {profilePanel && (
          <Button
            className="profile-drawer-button"
            aria-label="查看资料"
            type="text"
            icon={<InfoCircleOutlined />}
            onClick={() => setProfileOpen(true)}
          />
        )}
      </Space>
      {profilePanel && (
        <Drawer
          title={profileTitle ?? title}
          open={profileOpen}
          width={340}
          onClose={() => setProfileOpen(false)}
          className="profile-drawer"
        >
          {profilePanel}
        </Drawer>
      )}
    </div>
  );
}
