import { SearchOutlined, SendOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Result, Space, Typography } from "antd";
import { useState } from "react";
import type { SafeUser } from "@encrypted-chat/shared";
import { useAuth } from "../state/AuthContext";
import * as api from "../services/api";

export function AddFriendPage() {
  const { apiClient, user } = useAuth();
  const { message } = App.useApp();
  const [found, setFound] = useState<SafeUser | undefined>();

  return (
    <section className="surface">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          添加好友
        </Typography.Title>
        <Form
          layout="inline"
          onFinish={async (values: { uid: string }) => {
            try {
              const nextUser = await api.findUserByUid(apiClient, values.uid.trim().toUpperCase());
              setFound(nextUser);
            } catch (error) {
              setFound(undefined);
              message.error(error instanceof Error ? error.message : "未找到用户");
            }
          }}
        >
          <Form.Item name="uid" rules={[{ required: true, message: "请输入 UID" }]}>
            <Input placeholder="输入 10 位 UID" maxLength={10} />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            搜索
          </Button>
        </Form>
        {found && (
          <Result
            status={found.id === user?.id ? "info" : "success"}
            title={found.username}
            subTitle={`UID ${found.uid}`}
            extra={
              found.id !== user?.id && (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={async () => {
                    await api.createFriendRequest(apiClient, { addresseeUid: found.uid });
                    message.success("好友申请已发送");
                  }}
                >
                  发送申请
                </Button>
              )
            }
          />
        )}
      </Space>
    </section>
  );
}
