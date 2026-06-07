import type { EncryptedMessageEnvelope, FriendView } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { App, Empty, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatComposer } from "../components/ChatComposer";
import { MessageBubble, type RenderedMessage } from "../components/MessageBubble";
import { decryptImageBlob, encryptImageFile } from "../crypto/files";
import { decryptDirectMessage, encryptDirectMessage, type PlainMessage } from "../crypto/messages";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import { appendLocalMessage, getLocalMessages } from "../storage/localMessages";
import { displayUserName } from "../utils/displayName";

export function ChatPage() {
  const { friendId = "" } = useParams();
  const { apiClient, user, privateKey, socket } = useAuth();
  const { message } = App.useApp();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [envelopes, setEnvelopes] = useState<EncryptedMessageEnvelope[]>([]);
  const [rendered, setRendered] = useState<RenderedMessage[]>([]);

  const friend = friends.find((item) => item.id === friendId);
  const conversationKey = useMemo(() => `direct:${friendId}`, [friendId]);

  useEffect(() => {
    void api
      .listFriends(apiClient)
      .then(setFriends)
      .catch((error) => message.error(error instanceof Error ? error.message : "加载好友失败"));
  }, [apiClient, message]);

  useEffect(() => {
    setEnvelopes(getLocalMessages(conversationKey));
  }, [conversationKey]);

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const handleNewMessage = (envelope: EncryptedMessageEnvelope) => {
      const matches =
        envelope.conversationType === "direct" &&
        ((envelope.fromUserId === user.id && envelope.toUserId === friendId) ||
          (envelope.fromUserId === friendId && envelope.toUserId === user.id));

      if (!matches) {
        return;
      }

      appendLocalMessage(conversationKey, envelope);
      setEnvelopes((current) =>
        current.some((item) => item.clientMessageId === envelope.clientMessageId) ? current : [...current, envelope]
      );
    };

    socket.on(SocketEvents.MessageNew, handleNewMessage);
    return () => {
      socket.off(SocketEvents.MessageNew, handleNewMessage);
    };
  }, [conversationKey, friendId, socket, user]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function renderMessages() {
      if (!user || !friend) {
        setRendered([]);
        return;
      }

      const views = await Promise.all(
        envelopes.map(async (envelope): Promise<RenderedMessage> => {
          const own = envelope.fromUserId === user.id;
          const senderName = own ? "我" : displayUserName(friend);
          if (!privateKey) {
            return encryptedView(envelope, own, senderName);
          }

          try {
            const plaintext = await decryptDirectMessage(envelope, privateKey, user.id);
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
  }, [apiClient, envelopes, friend, privateKey, user]);

  const sendText = useCallback(
    async (text: string) => {
      if (!user || !friend || !socket) {
        return;
      }
      const envelope = await encryptDirectMessage({
        plaintext: { kind: "text", text },
        messageType: "text",
        fromUser: user,
        toUser: friend
      });
      socket.emit(SocketEvents.MessageSend, envelope);
    },
    [friend, socket, user]
  );

  const sendImage = useCallback(
    async (file: File) => {
      if (!user || !friend || !socket) {
        return;
      }
      const encryptedFile = await encryptImageFile(file);
      const uploaded = await api.uploadEncryptedFile(apiClient, encryptedFile.encryptedBlob, {
        scopeType: "direct",
        targetUserId: friend.id,
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
      const envelope = await encryptDirectMessage({
        plaintext,
        messageType: "image",
        fromUser: user,
        toUser: friend
      });
      envelope.attachment = {
        fileId: uploaded.id,
        size: uploaded.size,
        sha256: uploaded.sha256
      };
      socket.emit(SocketEvents.MessageSend, envelope);
    },
    [apiClient, friend, socket, user]
  );

  return (
    <section className="surface chat-shell">
      <div className="chat-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {friend ? displayUserName(friend) : "单聊"}
        </Typography.Title>
        <Typography.Text type="secondary">{friend ? `UID ${friend.uid}` : "好友不存在或尚未加载"}</Typography.Text>
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
        disabled={!friend || !socket}
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
