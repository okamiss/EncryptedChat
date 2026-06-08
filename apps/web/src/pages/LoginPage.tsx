import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Space, Typography, App } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ThemeModeButton } from "../components/ThemeModeButton";
import { useAuth } from "../state/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
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
              登录
            </Typography.Title>
            <Typography.Text type="secondary">输入账号密码后，本地私钥会在浏览器内解锁。</Typography.Text>
          </div>
          <Form
            layout="vertical"
            onFinish={async (values: { username: string; password: string }) => {
              try {
                await login(values.username, values.password);
                navigate("/friends", { replace: true });
              } catch (error) {
                message.error(error instanceof Error ? error.message : "登录失败");
              }
            }}
          >
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form>
          <Typography.Text>
            还没有账号？ <Link to="/register">注册</Link>
          </Typography.Text>
        </Space>
      </section>
    </main>
  );
}
