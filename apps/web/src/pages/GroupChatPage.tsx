import {
  CheckOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import type {
  EncryptedMessageEnvelope,
  FriendView,
  GroupJoinRequestView,
  GroupMemberRole,
  GroupView,
  MessageRecallPayload
} from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { App, Button, Empty, Input, List, Modal, Select, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatComposer, type ComposerInsertRequest } from "../components/ChatComposer";
import { MessageBubble, type RenderedMessage } from "../components/MessageBubble";
import { decryptImageBlob, encryptImageFile } from "../crypto/files";
import {
  decryptGroupMessage,
  encryptGroupMessage,
  type PlainMessage,
  unwrapGroupKey,
  wrapGroupKeyForUser
} from "../crypto/messages";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import * as api from "../services/api";
import { useAuth } from "../state/AuthContext";
import { appendLocalMessage, getLocalMessages, removeLocalMessage } from "../storage/localMessages";
import { displayUserName } from "../utils/displayName";
import { mentionedUserIdsInText } from "../utils/mentions";

export function GroupChatPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { apiClient, user, privateKey, socket, markConversationRead } = useAuth();
  const { message, modal } = App.useApp();
  const [group, setGroup] = useState<GroupView | undefined>();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [inviteeId, setInviteeId] = useState<string>();
  const [groupKey, setGroupKey] = useState<CryptoKey | undefined>();
  const [envelopes, setEnvelopes] = useState<EncryptedMessageEnvelope[]>([]);
  const [rendered, setRendered] = useState<RenderedMessage[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestView[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [composerInsert, setComposerInsert] = useState<ComposerInsertRequest>();
  const messageListRef = useAutoScrollToBottom(rendered);

  const conversationKey = useMemo(() => `group:${groupId}`, [groupId]);
  const myMembership = group?.members.find((member) => member.user.id === user?.id);
  const keyVersion = myMembership?.keyVersion ?? 1;
  const isOwner = group?.ownerId === user?.id;
  const canManageJoinRequests = myMembership?.role === "owner" || myMembership?.role === "admin";
  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);

  const load = useCallback(async () => {
    const [nextGroup, nextFriends] = await Promise.all([api.getGroup(apiClient, groupId), api.listFriends(apiClient)]);
    setGroup(nextGroup);
    setFriends(nextFriends);
  }, [apiClient, groupId]);

  const loadJoinRequests = useCallback(async () => {
    const requests = await api.listGroupJoinRequests(apiClient, groupId);
    setJoinRequests(requests);
  }, [apiClient, groupId]);

  useEffect(() => {
    void load().catch((error) => message.error(error instanceof Error ? error.message : "加载群聊失败"));
  }, [load, message]);

  useEffect(() => {
    if (canManageJoinRequests) {
      void loadJoinRequests().catch((error) =>
        message.error(error instanceof Error ? error.message : "加载入群申请失败")
      );
    } else {
      setJoinRequests([]);
    }
  }, [canManageJoinRequests, loadJoinRequests, message]);

  useEffect(() => {
    setEnvelopes(getLocalMessages(conversationKey));
    markConversationRead(conversationKey);
  }, [conversationKey, markConversationRead]);

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
      markConversationRead(conversationKey);
    };
    const handleMessageRecalled = (payload: MessageRecallPayload) => {
      if (payload.conversationType !== "group" || payload.groupId !== groupId) {
        return;
      }
      removeLocalMessage(conversationKey, payload.clientMessageId);
      setEnvelopes((current) => current.filter((item) => item.clientMessageId !== payload.clientMessageId));
    };
    const handleGroupUpdated = (payload?: { groupId?: string; action?: string }) => {
      if (payload?.groupId === groupId && (payload.action === "deleted" || payload.action === "removed")) {
        navigate("/groups");
        return;
      }
      void load();
      if (canManageJoinRequests) {
        void loadJoinRequests();
      }
    };

    socket.on(SocketEvents.MessageNew, handleNewMessage);
    socket.on(SocketEvents.MessageRecalled, handleMessageRecalled);
    socket.on(SocketEvents.GroupUpdated, handleGroupUpdated);
    return () => {
      socket.off(SocketEvents.MessageNew, handleNewMessage);
      socket.off(SocketEvents.MessageRecalled, handleMessageRecalled);
      socket.off(SocketEvents.GroupUpdated, handleGroupUpdated);
    };
  }, [canManageJoinRequests, conversationKey, groupId, load, loadJoinRequests, markConversationRead, navigate, socket, user]);

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
      const mentionedUserIds = group ? mentionedUserIdsInText(text, group.members) : [];
      if (mentionedUserIds.length > 0) {
        envelope.mentionedUserIds = mentionedUserIds;
      }
      socket.emit(SocketEvents.MessageSend, envelope);
    },
    [group, groupId, groupKey, keyVersion, socket]
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
      if (!socket) {
        return;
      }
      socket.emit(SocketEvents.MessageRecall, {
        clientMessageId: message.clientMessageId,
        conversationType: "group",
        groupId
      } satisfies MessageRecallPayload);
      removeLocalMessage(conversationKey, message.clientMessageId);
      setEnvelopes((current) => current.filter((item) => item.clientMessageId !== message.clientMessageId));
    },
    [conversationKey, groupId, socket]
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
            <Typography.Text type="secondary">
              {group ? `群号 ${group.code} · ${group.members.length} 位成员` : "正在加载"}
            </Typography.Text>
          </div>
          <Space>
            {isOwner && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setGroupNameDraft(group?.name ?? "");
                    setRenaming(true);
                  }}
                >
                  改名
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    if (!group) {
                      return;
                    }
                    modal.confirm({
                      title: "解散群聊",
                      content: `确认解散 ${group.name}？解散后所有成员都会失去该群聊。`,
                      okText: "解散",
                      okButtonProps: { danger: true },
                      cancelText: "取消",
                      onOk: async () => {
                        await api.deleteGroup(apiClient, group.id);
                        message.success("群聊已解散");
                        navigate("/groups");
                      }
                    });
                  }}
                >
                  解散
                </Button>
              </>
            )}
            <Button icon={<TeamOutlined />} onClick={() => setMembersOpen(true)}>
              成员
            </Button>
            {canManageJoinRequests && (
              <Button icon={<UserAddOutlined />} onClick={() => setJoinRequestsOpen(true)}>
                申请 {joinRequests.length}
              </Button>
            )}
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
      <div className="message-list" ref={messageListRef}>
        {rendered.length === 0 ? (
          <Empty description="暂无消息" />
        ) : (
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            {rendered.map((item) => (
              <MessageBubble
                key={item.clientMessageId}
                message={item}
                onMentionSender={mentionSender}
                onQuoteMessage={quoteMessage}
                onRecallMessage={recallMessage}
              />
            ))}
          </Space>
        )}
      </div>
      <ChatComposer
        disabled={!groupKey || !socket}
        insertRequest={composerInsert}
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
      <Modal
        title="修改群名称"
        open={renaming}
        okText="保存"
        cancelText="取消"
        onCancel={() => setRenaming(false)}
        onOk={async () => {
          if (!group) {
            return;
          }
          const nextGroup = await api.updateGroup(apiClient, group.id, { groupName: groupNameDraft });
          setGroup(nextGroup);
          setRenaming(false);
          message.success("群名称已更新");
        }}
      >
        <Input value={groupNameDraft} maxLength={80} onChange={(event) => setGroupNameDraft(event.target.value)} />
      </Modal>
      <Modal title="群成员" open={membersOpen} footer={null} onCancel={() => setMembersOpen(false)}>
        <List
          dataSource={group?.members ?? []}
          locale={{ emptyText: <Empty description="暂无成员" /> }}
          renderItem={(member) => {
            const canAddFriend = member.user.id !== user?.id && !friendIds.has(member.user.id);
            const isSelf = member.user.id === user?.id;
            const canChangeRole = isOwner && !isSelf && member.role !== "owner";
            const canRemove =
              !isSelf &&
              member.role !== "owner" &&
              (isOwner || (myMembership?.role === "admin" && member.role === "member"));
            const actions = [];
            if (canChangeRole) {
              actions.push(
                <Button
                  key="role"
                  icon={<CrownOutlined />}
                  onClick={async () => {
                    const nextRole = member.role === "admin" ? "member" : "admin";
                    const nextGroup = await api.updateGroupMemberRole(apiClient, groupId, member.user.id, {
                      role: nextRole
                    });
                    setGroup(nextGroup);
                    message.success(nextRole === "admin" ? "已设为管理员" : "已取消管理员");
                  }}
                >
                  {member.role === "admin" ? "取消管理员" : "设为管理员"}
                </Button>
              );
            }
            if (canRemove) {
              actions.push(
                <Button
                  key="remove"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    modal.confirm({
                      title: "移除成员",
                      content: `确认将 ${displayUserName(member.user)} 移出群聊？`,
                      okText: "移除",
                      okButtonProps: { danger: true },
                      cancelText: "取消",
                      onOk: async () => {
                        await api.removeGroupMember(apiClient, groupId, member.user.id);
                        message.success("成员已移除");
                        await load();
                      }
                    });
                  }}
                >
                  移除
                </Button>
              );
            }
            if (canAddFriend) {
              actions.push(
                <Button
                  key="add"
                  icon={<UserAddOutlined />}
                  onClick={async () => {
                    await api.createFriendRequest(apiClient, { addresseeUid: member.user.uid });
                    message.success("好友申请已发送");
                  }}
                >
                  加好友
                </Button>
              );
            }
            return (
              <List.Item actions={actions}>
                <List.Item.Meta
                  title={displayUserName(member.user)}
                  description={`${roleLabel(member.role)} · ${member.user.username} · UID ${member.user.uid}`}
                />
              </List.Item>
            );
          }}
        />
      </Modal>
      <Modal title="入群申请" open={joinRequestsOpen} footer={null} onCancel={() => setJoinRequestsOpen(false)}>
        <List
          dataSource={joinRequests}
          locale={{ emptyText: <Empty description="暂无入群申请" /> }}
          renderItem={(request) => (
            <List.Item
              actions={[
                <Button
                  key="approve"
                  type="primary"
                  icon={<CheckOutlined />}
                  disabled={!groupKey}
                  onClick={async () => {
                    if (!groupKey) {
                      return;
                    }
                    const encryptedGroupKey = await wrapGroupKeyForUser(groupKey, request.applicant.publicKey);
                    await api.approveGroupJoinRequest(apiClient, request.id, {
                      encryptedGroupKey,
                      keyVersion
                    });
                    message.success("已同意入群申请");
                    await Promise.all([load(), loadJoinRequests()]);
                  }}
                >
                  同意
                </Button>,
                <Button
                  key="reject"
                  danger
                  icon={<StopOutlined />}
                  onClick={async () => {
                    await api.rejectGroupJoinRequest(apiClient, request.id);
                    message.success("已拒绝入群申请");
                    await loadJoinRequests();
                  }}
                >
                  拒绝
                </Button>
              ]}
            >
              <List.Item.Meta
                title={displayUserName(request.applicant)}
                description={`${request.applicant.username} · UID ${request.applicant.uid}`}
              />
            </List.Item>
          )}
        />
      </Modal>
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

function quoteTextForMessage(message: RenderedMessage): string | undefined {
  return message.text ?? (message.imageName ? `[图片] ${message.imageName}` : undefined);
}

function roleLabel(role: GroupMemberRole): string {
  if (role === "owner") {
    return "群主";
  }
  if (role === "admin") {
    return "管理员";
  }
  return "成员";
}
