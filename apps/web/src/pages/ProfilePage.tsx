import { IdcardOutlined, KeyOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Descriptions, Form, Input, Space, Typography, App } from "antd";
import { useEffect } from "react";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import { displayUserName } from "../utils/displayName";

export function ProfilePage() {
  const { apiClient, user, privateKeyStatus, unlockPrivateKey, refreshMe } = useAuth();
  const { message } = App.useApp();
  const [displayNameForm] = Form.useForm<{ displayName?: string }>();
  const publicKeyKid = (user?.publicKey as { kid?: string } | undefined)?.kid;

  useEffect(() => {
    displayNameForm.setFieldsValue({ displayName: user?.displayName ?? "" });
  }, [displayNameForm, user?.displayName]);

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
      </Space>
    </section>
  );
}
