import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Space, Typography, App } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ThemeModeButton } from "../components/ThemeModeButton";
import { useAuth } from "../state/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  return (
    <main className="auth-shell">
      <div className="auth-theme-toggle">
        <ThemeModeButton />
      </div>
      <section className="auth-panel">
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>
              注册
            </Typography.Title>
            <Typography.Text type="secondary">注册时会在本机生成端到端加密密钥对。</Typography.Text>
          </div>
          <Form
            layout="vertical"
            onFinish={async (values: { username: string; password: string }) => {
              try {
                await register(values.username, values.password);
                navigate("/friends", { replace: true });
              } catch (error) {
                message.error(error instanceof Error ? error.message : "注册失败");
              }
            }}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: "请输入用户名" },
                { min: 3, message: "至少 3 个字符" }
              ]}
            >
              <Input prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 8, message: "至少 8 个字符" }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              注册并生成密钥
            </Button>
          </Form>
          <Typography.Text>
            已有账号？ <Link to="/login">登录</Link>
          </Typography.Text>
        </Space>
      </section>
    </main>
  );
}
