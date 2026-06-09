import { DownloadOutlined, IdcardOutlined, KeyOutlined, ReloadOutlined, UploadOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Descriptions, Form, Input, Space, Typography, App } from "antd";
import { useEffect, useRef, useState } from "react";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import { displayUserName } from "../utils/displayName";

export function ProfilePage() {
  const {
    apiClient,
    user,
    privateKeyStatus,
    unlockPrivateKey,
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
    <section className="surface">
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            个人信息
          </Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={() => void refreshMe()}>
            刷新
          </Button>
        </Space>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="用户 ID">{user?.id}</Descriptions.Item>
          <Descriptions.Item label="UID">{user?.uid}</Descriptions.Item>
          <Descriptions.Item label="用户名">
            <Space>
              <UserOutlined />
              {user?.username}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="显示名称">
            <Space>
              <IdcardOutlined />
              {user ? displayUserName(user) : "-"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="公钥状态">
            <Space>
              <KeyOutlined />
              {publicKeyKid ? `kid: ${publicKeyKid}` : "已上传"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="本地私钥">{privateKeyStatus === "ready" ? "已解锁" : "未解锁"}</Descriptions.Item>
        </Descriptions>
        <Form
          form={displayNameForm}
          layout="inline"
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
        <Form
          form={passwordForm}
          className="profile-password-form"
          layout="inline"
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
          <Form.Item name="currentPassword" rules={[{ required: true, message: "请输入当前密码" }]}>
            <Input.Password placeholder="当前密码" name="currentPassword" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "新密码至少 8 位" }
            ]}
          >
            <Input.Password placeholder="新密码" name="newPassword" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
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
        {privateKeyStatus !== "ready" && (
          <Form
            layout="inline"
            onFinish={async (values: { password: string }) => {
              try {
                await unlockPrivateKey(values.password);
                message.success("私钥已解锁");
              } catch (error) {
                message.error(error instanceof Error ? error.message : "私钥解锁失败");
              }
            }}
          >
            <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password placeholder="输入登录密码解锁私钥" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<KeyOutlined />}>
              解锁
            </Button>
          </Form>
        )}
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            私钥备份
          </Typography.Title>
          <Space wrap>
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
          </Space>
          <Form form={backupForm} layout="inline" onFinish={handleImportBackup}>
            <Form.Item name="password" rules={[{ required: true, message: "请输入登录密码" }]}>
              <Input.Password placeholder="输入登录密码导入私钥" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<KeyOutlined />} disabled={!backupFile}>
              导入并解锁
            </Button>
          </Form>
        </Space>
      </Space>
    </section>
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
