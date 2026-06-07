import { TeamOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { generateGroupKey, wrapGroupKeyForUser } from "../crypto/messages";
import { useAuth } from "../state/AuthContext";
import * as api from "../services/api";

export function CreateGroupPage() {
  const { apiClient, user } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  return (
    <section className="surface">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          创建群聊
        </Typography.Title>
        <Form
          layout="vertical"
          style={{ maxWidth: 520 }}
          onFinish={async (values: { groupName: string }) => {
            if (!user) {
              return;
            }
            try {
              const groupKey = await generateGroupKey();
              const encryptedGroupKey = await wrapGroupKeyForUser(groupKey, user.publicKey);
              const group = await api.createGroup(apiClient, {
                groupName: values.groupName,
                encryptedGroupKey,
                keyVersion: 1
              });
              message.success("群聊已创建");
              navigate(`/groups/${group.id}`);
            } catch (error) {
              message.error(error instanceof Error ? error.message : "创建群聊失败");
            }
          }}
        >
          <Form.Item name="groupName" label="群名称" rules={[{ required: true, message: "请输入群名称" }]}>
            <Input maxLength={80} />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<TeamOutlined />}>
            创建
          </Button>
        </Form>
      </Space>
    </section>
  );
}
