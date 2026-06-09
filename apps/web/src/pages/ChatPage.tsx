import type { EncryptedMessageEnvelope, FriendView, MessageRecallPayload } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { App } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatHeader } from "../components/ChatHeader";
import { ChatComposer, type ComposerInsertRequest, type ComposerMessagePart } from "../components/ChatComposer";
import { MessageList } from "../components/MessageList";
import type { RenderedMessage } from "../components/MessageBubble";
import { UserProfilePanel } from "../components/UserProfilePanel";
import { decryptImageBlob, encryptImageFile } from "../crypto/files";
import { decryptDirectMessage, encryptDirectMessage, type PlainMessage } from "../crypto/messages";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import {
  appendLocalMessage,
  appendLocalRecallNotice,
  getLocalMessages,
  getLocalRecallNotices,
  type LocalRecallNotice,
  removeLocalMessage
} from "../storage/localMessages";
import { plainMessageText, prepareComposerMessage, uploadedImageMessage } from "../utils/composerMessages";
import { displayUserName } from "../utils/displayName";

export function ChatPage() {
  const { friendId = "" } = useParams();
  const { apiClient, user, privateKey, socket, unreadConversationCounts, markConversationRead } = useAuth();
  const { message } = App.useApp();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [envelopes, setEnvelopes] = useState<EncryptedMessageEnvelope[]>([]);
  const [recallNotices, setRecallNotices] = useState<LocalRecallNotice[]>([]);
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);
  const [rendered, setRendered] = useState<RenderedMessage[]>([]);
  const [composerInsert, setComposerInsert] = useState<ComposerInsertRequest>();
  const messageListRef = useAutoScrollToBottom(rendered, { disabled: initialUnreadCount > 0 });

  const friend = friends.find((item) => item.id === friendId);
  const conversationKey = useMemo(() => `direct:${friendId}`, [friendId]);

  useEffect(() => {
    void api
      .listFriends(apiClient)
      .then(setFriends)
      .catch((error) => message.error(error instanceof Error ? error.message : "加载好友失败"));
  }, [apiClient, message]);

  useEffect(() => {
    setInitialUnreadCount(unreadConversationCounts[conversationKey] ?? 0);
    setEnvelopes(getLocalMessages(conversationKey));
    setRecallNotices(getLocalRecallNotices(conversationKey));
    markConversationRead(conversationKey);
  }, [conversationKey, markConversationRead]);

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
      markConversationRead(conversationKey);
    };
    const handleMessageRecalled = (payload: MessageRecallPayload) => {
      const matches =
        payload.conversationType === "direct" &&
        ((payload.fromUserId === user.id && payload.toUserId === friendId) ||
          (payload.fromUserId === friendId && payload.toUserId === user.id));

      if (!matches) {
        return;
      }

      const originalSentAt = getLocalMessages(conversationKey).find(
        (item) => item.clientMessageId === payload.clientMessageId
      )?.sentAt;
      removeLocalMessage(conversationKey, payload.clientMessageId);
      appendLocalRecallNotice(conversationKey, payload, originalSentAt);
      setEnvelopes((current) => current.filter((item) => item.clientMessageId !== payload.clientMessageId));
      setRecallNotices((current) =>
        current.some((item) => item.clientMessageId === payload.clientMessageId)
          ? current
          : [...current, originalSentAt ? { ...payload, anchorSentAt: originalSentAt } : payload]
      );
    };

    socket.on(SocketEvents.MessageNew, handleNewMessage);
    socket.on(SocketEvents.MessageRecalled, handleMessageRecalled);
    return () => {
      socket.off(SocketEvents.MessageNew, handleNewMessage);
      socket.off(SocketEvents.MessageRecalled, handleMessageRecalled);
    };
  }, [conversationKey, friendId, markConversationRead, socket, user]);

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
      const recallViews = recallNotices.map((notice): RenderedMessage => {
        const ownRecall = notice.fromUserId === user.id;
        return recalledView(notice, ownRecall ? "\u6211" : displayUserName(friend));
      });

      if (!cancelled) {
        setRendered([...views, ...recallViews].sort(compareRenderedMessages));
      }
    }

    void renderMessages();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [apiClient, envelopes, friend, privateKey, recallNotices, user]);

  const sendMessage = useCallback(
    async (parts: ComposerMessagePart[]) => {
      if (!user || !friend || !socket) {
        return;
      }
      const prepared = await prepareComposerMessage(parts, async (file) => {
        const encryptedFile = await encryptImageFile(file);
        const uploaded = await api.uploadEncryptedFile(apiClient, encryptedFile.encryptedBlob, {
          scopeType: "direct",
          targetUserId: friend.id,
          sha256: encryptedFile.sha256
        });
        return uploadedImageMessage(file, encryptedFile, uploaded);
      });
      const envelope = await encryptDirectMessage({
        plaintext: prepared.plaintext,
        messageType: prepared.messageType,
        fromUser: user,
        toUser: friend
      });
      if (prepared.attachment) {
        envelope.attachment = prepared.attachment;
      }
      socket.emit(SocketEvents.MessageSend, envelope);
    },
    [apiClient, friend, socket, user]
  );

  const quoteMessage = useCallback((message: RenderedMessage) => {
    const text = quoteTextForMessage(message);
    if (!text) {
      return;
    }
    setComposerInsert({
      id: `${message.clientMessageId}:quote:${Date.now()}`,
      type: "quote",
      senderName: message.senderName,
      text
    });
  }, []);

  const mentionSender = useCallback((message: RenderedMessage) => {
    setComposerInsert({
      id: `${message.clientMessageId}:mention:${Date.now()}`,
      type: "mention",
      label: message.senderName
    });
  }, []);

  const recallMessage = useCallback(
    (message: RenderedMessage) => {
      if (!friend || !socket) {
        return;
      }
      socket.emit(SocketEvents.MessageRecall, {
        clientMessageId: message.clientMessageId,
        conversationType: "direct",
        toUserId: friend.id
      } satisfies MessageRecallPayload);
      const localNotice: MessageRecallPayload = {
        clientMessageId: message.clientMessageId,
        conversationType: "direct",
        fromUserId: user?.id,
        toUserId: friend.id,
        recalledAt: new Date().toISOString()
      };
      removeLocalMessage(conversationKey, message.clientMessageId);
      appendLocalRecallNotice(conversationKey, localNotice, message.sentAt);
      setEnvelopes((current) => current.filter((item) => item.clientMessageId !== message.clientMessageId));
      setRecallNotices((current) =>
        current.some((item) => item.clientMessageId === localNotice.clientMessageId)
          ? current
          : [...current, message.sentAt ? { ...localNotice, anchorSentAt: message.sentAt } : localNotice]
      );
    },
    [conversationKey, friend, socket, user?.id]
  );

  const friendName = friend ? displayUserName(friend) : "单聊";
  const profilePanel = (
    <UserProfilePanel
      title={friendName}
      subtitle={friend ? `UID ${friend.uid}` : "好友不存在或尚未加载"}
      meta={[
        { label: "用户名", value: friend?.username ?? "-" },
        { label: "UID", value: friend?.uid ?? "-" },
        { label: "会话类型", value: "单聊" },
        { label: "连接状态", value: socket ? "实时连接" : "未连接" },
        { label: "解密状态", value: privateKey ? "私钥已就绪" : "等待私钥" }
      ]}
    />
  );

  return (
    <section className="chat-workspace">
      <div className="surface chat-main chat-shell">
        <ChatHeader
          title={friendName}
          subtitle={friend ? `UID ${friend.uid}` : "好友不存在或尚未加载"}
          avatarText={friendName}
          backTo="/friends"
          profileTitle="好友资料"
          profilePanel={profilePanel}
        />
        <MessageList
          ref={messageListRef}
          messages={rendered}
          unreadCount={initialUnreadCount}
          onJumpToLatest={() => setInitialUnreadCount(0)}
          onMentionSender={mentionSender}
          onQuoteMessage={quoteMessage}
          onRecallMessage={recallMessage}
        />
        <ChatComposer
          disabled={!friend || !socket}
          insertRequest={composerInsert}
          onSendMessage={async (parts) => {
            try {
              await sendMessage(parts);
            } catch (error) {
              message.error(error instanceof Error ? error.message : "发送失败");
            }
          }}
        />
      </div>
      {profilePanel}
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

  if (plaintext.kind === "rich") {
    const richParts = await Promise.all(
      plaintext.parts.map(async (part) => {
        if (part.type === "text") {
          return part;
        }
        const encryptedBlob = await api.downloadEncryptedFile(apiClient, part.fileId);
        const imageBlob = await decryptImageBlob(encryptedBlob, part.fileKey, part.fileIv, part.mimeType);
        const imageUrl = URL.createObjectURL(imageBlob);
        objectUrls.push(imageUrl);
        return {
          type: "image" as const,
          imageUrl,
          imageName: part.name
        };
      })
    );
    return {
      clientMessageId: envelope.clientMessageId,
      own,
      senderName,
      sentAt: envelope.sentAt,
      status: "decrypted",
      text: plainMessageText(plaintext),
      richParts
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

function recalledView(payload: MessageRecallPayload, senderName: string): RenderedMessage {
  return {
    clientMessageId: `recall:${payload.clientMessageId}`,
    own: false,
    senderName,
    sentAt: "anchorSentAt" in payload && typeof payload.anchorSentAt === "string" ? payload.anchorSentAt : payload.recalledAt,
    status: "system",
    text: `${senderName}撤回了一条消息`
  };
}

function compareRenderedMessages(a: RenderedMessage, b: RenderedMessage): number {
  return new Date(a.sentAt ?? 0).getTime() - new Date(b.sentAt ?? 0).getTime();
}

function quoteTextForMessage(message: RenderedMessage): string | undefined {
  return message.text ?? (message.imageName ? `[图片] ${message.imageName}` : undefined);
}
