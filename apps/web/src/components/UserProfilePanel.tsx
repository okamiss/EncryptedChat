import { LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
import type { ReactNode } from "react";

interface ProfileMetaItem {
  label: string;
  value: ReactNode;
}

interface UserProfilePanelProps {
  title: string;
  subtitle?: string;
  meta: ProfileMetaItem[];
  children?: ReactNode;
}

export function UserProfilePanel({ title, subtitle, meta, children }: UserProfilePanelProps) {
  return (
    <aside className="profile-panel">
      <div className="profile-panel-hero">
        <div className="profile-panel-avatar">{title.slice(0, 1).toUpperCase()}</div>
        <Typography.Title level={4}>{title}</Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      <div className="profile-security">
        <SafetyCertificateOutlined />
        <span>端到端加密</span>
        <LockOutlined />
      </div>
      <Space direction="vertical" size={10} className="profile-meta">
        {meta.map((item) => (
          <div key={item.label} className="profile-meta-row">
            <Typography.Text type="secondary">{item.label}</Typography.Text>
            <Typography.Text>{item.value}</Typography.Text>
          </div>
        ))}
      </Space>
      {children && <div className="profile-panel-extra">{children}</div>}
    </aside>
  );
}
