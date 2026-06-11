import {
  DownloadOutlined,
  IdcardOutlined,
  KeyOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  UserOutlined
} from "@ant-design/icons";
import { App, Button, Form, Input, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import { displayUserName } from "../utils/displayName";

export function ProfilePage() {
  const {
    apiClient,
    user,
    privateKeyStatus,
    updatePassword,
    exportPrivateKeyBackup,
    importPrivateKeyBackup,
    refreshMe
  } = useAuth();
  const { message } = App.useApp();
  const [displayNameForm] = Form.useForm<{ displayName?: string }>();
  const [passwordForm] = Form.useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const [backupForm] = Form.useForm<{ password: string }>();
  const [backupFile, setBackupFile] = useState<File>();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const publicKeyKid = (user?.publicKey as { kid?: string } | undefined)?.kid;
  const profileDisplayName = user ? displayUserName(user) : "-";

  useEffect(() => {
    displayNameForm.setFieldsValue({ displayName: user?.displayName ?? "" });
  }, [displayNameForm, user?.displayName]);

  const handleExportBackup = async () => {
    try {
      const backupText = await exportPrivateKeyBackup();
      downloadTextFile(`${safeFileName(user?.username ?? "encrypted-chat")}-private-key-backup.json`, backupText);
      message.success("私钥备份已导出");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "私钥备份导出失败");
    }
  };

  const handleImportBackup = async (values: { password: string }) => {
    if (!backupFile) {
      message.error("请选择私钥备份文件");
      return;
    }
    try {
      await importPrivateKeyBackup(await backupFile.text(), values.password);
      backupForm.resetFields();
      setBackupFile(undefined);
      message.success("私钥备份已导入并解锁");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "私钥备份导入失败");
    }
  };

  return (
    <section className="surface profile-page">
      <div className="profile-page-header">
        <div>
          <Typography.Title level={3}>个人中心</Typography.Title>
          <Typography.Text type="secondary">管理身份资料、本地密钥备份和账户密码。</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refreshMe()}>
          刷新
        </Button>
      </div>

      <div className="profile-overview">
        <div className="profile-overview-avatar">{profileDisplayName.slice(0, 1).toUpperCase()}</div>
        <div className="profile-overview-copy">
          <Typography.Title level={4}>{profileDisplayName}</Typography.Title>
          <Space size={8} wrap>
            <Typography.Text type="secondary">@{user?.username ?? "-"}</Typography.Text>
            <Tag color={privateKeyStatus === "ready" ? "success" : "warning"}>
              {privateKeyStatus === "ready" ? "私钥已解锁" : "私钥未解锁"}
            </Tag>
          </Space>
        </div>
      </div>

      <div className="profile-info-grid">
        <ProfileInfoItem icon={<UserOutlined />} label="用户 ID" value={user?.id ?? "-"} />
        <ProfileInfoItem icon={<IdcardOutlined />} label="UID" value={user?.uid ?? "-"} />
        <ProfileInfoItem icon={<IdcardOutlined />} label="显示名称" value={profileDisplayName} />
        <ProfileInfoItem icon={<KeyOutlined />} label="公钥状态" value={publicKeyKid ? `kid: ${publicKeyKid}` : "已上传"} />
        <ProfileInfoItem
          icon={<SafetyCertificateOutlined />}
          label="本地私钥"
          value={privateKeyStatus === "ready" ? "已解锁" : "未解锁"}
        />
      </div>

      <div className="profile-action-grid">
        <section className="profile-action-section">
          <div className="profile-section-heading">
            <IdcardOutlined />
            <Typography.Title level={5}>显示名称</Typography.Title>
          </div>
          <Form
            form={displayNameForm}
            layout="vertical"
            onFinish={async (values: { displayName?: string }) => {
              try {
                await api.updateDisplayName(apiClient, values.displayName);
                await refreshMe();
                message.success("显示名称已更新");
              } catch (error) {
                message.error(error instanceof Error ? error.message : "显示名称更新失败");
              }
            }}
          >
            <Form.Item name="displayName" label="花名/代号">
              <Input maxLength={64} allowClear placeholder="留空则显示用户名" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<IdcardOutlined />} disabled={!user}>
              保存显示名称
            </Button>
          </Form>
        </section>

        <section className="profile-action-section">
          <div className="profile-section-heading">
            <KeyOutlined />
            <Typography.Title level={5}>账户密码</Typography.Title>
          </div>
          <Form
            form={passwordForm}
            className="profile-password-form"
            layout="vertical"
            onFinish={async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
              try {
                await updatePassword(values.currentPassword, values.newPassword);
                passwordForm.resetFields();
                message.success("密码已更新，私钥仍可使用");
              } catch (error) {
                message.error(error instanceof Error ? error.message : "密码更新失败");
              }
            }}
          >
            <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
              <Input.Password placeholder="当前密码" name="currentPassword" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: "请输入新密码" },
                { min: 8, message: "新密码至少 8 位" }
              ]}
            >
              <Input.Password placeholder="新密码" name="newPassword" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "请再次输入新密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("两次输入的新密码不一致"));
                  }
                })
              ]}
            >
              <Input.Password placeholder="确认新密码" name="confirmPassword" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<KeyOutlined />} disabled={!user}>
              更新密码
            </Button>
          </Form>
        </section>
      </div>

      <section className="profile-action-section profile-backup-section">
        <div className="profile-section-heading">
          <SafetyCertificateOutlined />
          <Typography.Title level={5}>私钥备份</Typography.Title>
        </div>
        <div className="profile-backup-toolbar">
          <Button icon={<DownloadOutlined />} onClick={() => void handleExportBackup()} disabled={!user}>
            导出私钥备份
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              setBackupFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <Button icon={<UploadOutlined />} onClick={() => backupInputRef.current?.click()} disabled={!user}>
            选择备份文件
          </Button>
          <Typography.Text type="secondary">{backupFile?.name ?? "未选择文件"}</Typography.Text>
        </div>
        <Form form={backupForm} layout="vertical" className="profile-backup-import" onFinish={handleImportBackup}>
          <Form.Item name="password" label="导入密码" rules={[{ required: true, message: "请输入登录密码" }]}>
            <Input.Password placeholder="输入登录密码导入私钥" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<KeyOutlined />} disabled={!backupFile}>
            导入并解锁
          </Button>
        </Form>
      </section>
    </section>
  );
}

function ProfileInfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="profile-info-item">
      <span className="profile-info-icon">{icon}</span>
      <div>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <Typography.Text>{value}</Typography.Text>
      </div>
    </div>
  );
}

function downloadTextFile(fileName: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "encrypted-chat";
}
