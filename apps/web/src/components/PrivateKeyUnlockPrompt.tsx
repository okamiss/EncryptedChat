import { KeyOutlined, LockOutlined } from "@ant-design/icons";
import { Alert, App as AntApp, Button, Form, Input, Modal, Space } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";

interface UnlockFormValues {
  password: string;
}

export function PrivateKeyUnlockPrompt() {
  const { privateKeyStatus, unlockPrivateKey } = useAuth();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<UnlockFormValues>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (privateKeyStatus === "ready") {
      setOpen(false);
      form.resetFields();
    }
  }, [form, privateKeyStatus]);

  if (privateKeyStatus === "ready") {
    return null;
  }

  const isMissing = privateKeyStatus === "missing";

  const handleUnlock = async (values: UnlockFormValues) => {
    setSubmitting(true);
    try {
      await unlockPrivateKey(values.password);
      form.resetFields();
      setOpen(false);
      message.success("私钥已解锁");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "私钥解锁失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Alert
        className="key-status-alert"
        type="warning"
        showIcon
        icon={<LockOutlined />}
        message={isMissing ? "当前浏览器没有私钥，无法解密消息。" : "私钥尚未解锁。"}
        description={isMissing ? "请到个人中心导入私钥备份后再继续。" : "点击快速解锁，输入登录密码后即可解密消息。"}
        action={
          !isMissing && (
            <Button
              size="small"
              type="primary"
              icon={<KeyOutlined />}
              aria-label="快速解锁"
              onClick={() => setOpen(true)}
            >
              快速解锁
            </Button>
          )
        }
      />
      <Modal
        title={
          <Space size={8}>
            <KeyOutlined />
            解锁私钥
          </Space>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleUnlock}>
          <Form.Item name="password" label="登录密码" rules={[{ required: true, message: "请输入登录密码" }]}>
            <Input.Password autoFocus placeholder="输入登录密码解锁私钥" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<KeyOutlined />}
            aria-label="解锁私钥"
            loading={submitting}
            block
          >
            解锁私钥
          </Button>
        </Form>
      </Modal>
    </>
  );
}
