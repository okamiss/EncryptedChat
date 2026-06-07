import type { EncryptedMessageEnvelope, FriendView, GroupView } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { App, Button, Empty, Select, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatComposer } from "../components/ChatComposer";
import { MessageBubble, type RenderedMessage } from "../components/MessageBubble";
import { decryptImageBlob, encryptImageFile } from "../crypto/files";
import {
  decryptGroupMessage,
  encryptGroupMessage,
  type PlainMessage,
  unwrapGroupKey,
  wrapGroupKeyForUser
} from "../crypto/messages";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import { appendLocalMessage, getLocalMessages } from "../storage/localMessages";
import { displayUserName } from "../utils/displayName";

export function GroupChatPage() {
  const { groupId = "" } = useParams();
  const { apiClient, user, privateKey, socket } = useAuth();
  const { message } = App.useApp();
  const [group, setGroup] = useState<GroupView | undefined>();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [inviteeId, setInviteeId] = useState<string>();
  const [groupKey, setGroupKey] = useState<CryptoKey | undefined>();
  const [envelopes, setEnvelopes] = useState<EncryptedMessageEnvelope[]>([]);
  const [rendered, setRendered] = useState<RenderedMessage[]>([]);

  const conversationKey = useMemo(() => `group:${groupId}`, [groupId]);
  const myMembership = group?.members.find((member) => member.user.id === user?.id);
  const keyVersion = myMembership?.keyVersion ?? 1;

  const load = useCallback(async () => {
    const [nextGroup, nextFriends] = await Promise.all([api.getGroup(apiClient, groupId), api.listFriends(apiClient)]);
    setGroup(nextGroup);
    setFriends(nextFriends);
  }, [apiClient, groupId]);

  useEffect(() => {
    void load().catch((error) => message.error(error instanceof Error ? error.message : "加载群聊失败"));
  }, [load, message]);

  useEffect(() => {
    setEnvelopes(getLocalMessages(conversationKey));
  }, [conversationKey]);

  useEffect(() => {
    if (!privateKey || !myMembership) {
      setGroupKey(undefined);
      return;
    }
    void unwrapGroupKey(myMembership.encryptedGroupKey, privateKey)
      .then(setGroupKey)
      .catch(() => {
        setGroupKey(undefined);
        message.warning("群密钥解锁失败。");
      });
  }, [message, myMembership, privateKey]);

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const handleNewMessage = (envelope: EncryptedMessageEnvelope) => {
      if (envelope.conversationType !== "group" || envelope.groupId !== groupId) {
        return;
      }
      appendLocalMessage(conversationKey, envelope);
      setEnvelopes((current) =>
        current.some((item) => item.clientMessageId === envelope.clientMessageId) ? current : [...current, envelope]
      );
    };
    const handleGroupUpdated = () => {
      void load();
    };

    socket.on(SocketEvents.MessageNew, handleNewMessage);
    socket.on(SocketEvents.GroupUpdated, handleGroupUpdated);
    return () => {
      socket.off(SocketEvents.MessageNew, handleNewMessage);
      socket.off(SocketEvents.GroupUpdated, handleGroupUpdated);
    };
  }, [conversationKey, groupId, load, socket, user]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function renderMessages() {
      if (!user || !group) {
        setRendered([]);
        return;
      }

      const views = await Promise.all(
        envelopes.map(async (envelope): Promise<RenderedMessage> => {
          const own = envelope.fromUserId === user.id;
          const sender = group.members.find((member) => member.user.id === envelope.fromUserId)?.user;
          const senderName = own ? "我" : sender ? displayUserName(sender) : "群成员";
          if (!groupKey) {
            return encryptedView(envelope, own, senderName);
          }

          try {
            const plaintext = await decryptGroupMessage(envelope, groupKey);
            return await renderPlainMessage(envelope, plaintext, own, senderName, apiClient, objectUrls);
          } catch {
            return failedView(envelope, own, senderName);
          }
        })
      );

      if (!cancelled) {
        setRendered(views);
      }
    }

    void renderMessages();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [apiClient, envelopes, group, groupKey, user]);

  const sendText = useCallback(
    async (text: string) => {
      if (!groupKey || !socket) {
        return;
      }
      const envelope = await encryptGroupMessage({
        plaintext: { kind: "text", text },
        messageType: "text",
        groupId,
        groupKey,
        keyVersion
      });
      socket.emit(SocketEvents.MessageSend, envelope);
    },
    [groupId, groupKey, keyVersion, socket]
  );

  const sendImage = useCallback(
    async (file: File) => {
      if (!groupKey || !socket) {
        return;
      }
      const encryptedFile = await encryptImageFile(file);
      const uploaded = await api.uploadEncryptedFile(apiClient, encryptedFile.encryptedBlob, {
        scopeType: "group",
        groupId,
        sha256: encryptedFile.sha256
      });
      const plaintext: PlainMessage = {
        kind: "image",
        fileId: uploaded.id,
        fileKey: encryptedFile.fileKey,
        fileIv: encryptedFile.fileIv,
        mimeType: file.type || "image/png",
        name: file.name,
        size: file.size,
        sha256: uploaded.sha256
      };
      const envelope = await encryptGroupMessage({
        plaintext,
        messageType: "image",
        groupId,
        groupKey,
        keyVersion
      });
      envelope.attachment = {
        fileId: uploaded.id,
        size: uploaded.size,
        sha256: uploaded.sha256
      };
      socket.emit(SocketEvents.MessageSend, envelope);
    },
    [apiClient, groupId, groupKey, keyVersion, socket]
  );

  const inviteOptions = friends
    .filter((friend) => !group?.members.some((member) => member.user.id === friend.id))
    .map((friend) => ({ label: `${displayUserName(friend)} · ${friend.uid}`, value: friend.id }));

  return (
    <section className="surface chat-shell">
      <div className="chat-header">
        <Space style={{ justifyContent: "space-between", width: "100%" }} align="start">
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {group?.name ?? "群聊"}
            </Typography.Title>
            <Typography.Text type="secondary">{group ? `${group.members.length} 位成员` : "正在加载"}</Typography.Text>
          </div>
          <Space>
            <Select
              style={{ width: 240 }}
              placeholder="选择好友入群"
              options={inviteOptions}
              value={inviteeId}
              onChange={setInviteeId}
            />
            <Button
              type="primary"
              disabled={!inviteeId || !groupKey}
              onClick={async () => {
                const friend = friends.find((item) => item.id === inviteeId);
                if (!friend || !groupKey) {
                  return;
                }
                const encryptedGroupKey = await wrapGroupKeyForUser(groupKey, friend.publicKey);
                await api.createGroupInvite(apiClient, groupId, {
                  inviteeId: friend.id,
                  encryptedGroupKey,
                  keyVersion
                });
                setInviteeId(undefined);
                message.success("群邀请已发送");
              }}
            >
              邀请
            </Button>
          </Space>
        </Space>
      </div>
      <div className="message-list">
        {rendered.length === 0 ? (
          <Empty description="暂无消息" />
        ) : (
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            {rendered.map((item) => (
              <MessageBubble key={item.clientMessageId} message={item} />
            ))}
          </Space>
        )}
      </div>
      <ChatComposer
        disabled={!groupKey || !socket}
        onSendText={async (text) => {
          try {
            await sendText(text);
          } catch (error) {
            message.error(error instanceof Error ? error.message : "发送失败");
          }
        }}
        onSendImage={async (file) => {
          try {
            await sendImage(file);
          } catch (error) {
            message.error(error instanceof Error ? error.message : "发送失败");
          }
        }}
      />
    </section>
  );
}

async function renderPlainMessage(
  envelope: EncryptedMessageEnvelope,
  plaintext: PlainMessage,
  own: boolean,
  senderName: string,
  apiClient: api.ApiClient,
  objectUrls: string[]
): Promise<RenderedMessage> {
  if (plaintext.kind === "text") {
    return {
      clientMessageId: envelope.clientMessageId,
      own,
      senderName,
      sentAt: envelope.sentAt,
      status: "decrypted",
      text: plaintext.text
    };
  }

  const encryptedBlob = await api.downloadEncryptedFile(apiClient, plaintext.fileId);
  const imageBlob = await decryptImageBlob(encryptedBlob, plaintext.fileKey, plaintext.fileIv, plaintext.mimeType);
  const imageUrl = URL.createObjectURL(imageBlob);
  objectUrls.push(imageUrl);
  return {
    clientMessageId: envelope.clientMessageId,
    own,
    senderName,
    sentAt: envelope.sentAt,
    status: "decrypted",
    imageUrl,
    imageName: plaintext.name
  };
}

function encryptedView(envelope: EncryptedMessageEnvelope, own: boolean, senderName: string): RenderedMessage {
  return {
    clientMessageId: envelope.clientMessageId,
    own,
    senderName,
    sentAt: envelope.sentAt,
    status: "encrypted"
  };
}

function failedView(envelope: EncryptedMessageEnvelope, own: boolean, senderName: string): RenderedMessage {
  return {
    clientMessageId: envelope.clientMessageId,
    own,
    senderName,
    sentAt: envelope.sentAt,
    status: "failed"
  };
}
