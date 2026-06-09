import type { EncryptedMessageEnvelope, MessageRecallPayload } from "@encrypted-chat/shared";

export interface LocalRecallNotice extends MessageRecallPayload {
  anchorSentAt?: string;
}

export function conversationKeyForEnvelope(envelope: EncryptedMessageEnvelope, currentUserId: string): string {
  if (envelope.conversationType === "group") {
    return `group:${envelope.groupId}`;
  }
  const otherUserId = envelope.fromUserId === currentUserId ? envelope.toUserId : envelope.fromUserId;
  return `direct:${otherUserId}`;
}

export function conversationKeyForRecall(payload: MessageRecallPayload, currentUserId: string): string {
  if (payload.conversationType === "group") {
    return `group:${payload.groupId}`;
  }
  const otherUserId = payload.fromUserId === currentUserId ? payload.toUserId : payload.fromUserId;
  return `direct:${otherUserId}`;
}

export function getLocalMessages(conversationKey: string): EncryptedMessageEnvelope[] {
  const raw = localStorage.getItem(storageKey(conversationKey));
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as EncryptedMessageEnvelope[];
  } catch {
    return [];
  }
}

export function getLocalRecallNotices(conversationKey: string): LocalRecallNotice[] {
  const raw = localStorage.getItem(recallStorageKey(conversationKey));
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as LocalRecallNotice[];
  } catch {
    return [];
  }
}

export function appendLocalMessage(conversationKey: string, envelope: EncryptedMessageEnvelope): EncryptedMessageEnvelope[] {
  const messages = getLocalMessages(conversationKey);
  if (!messages.some((message) => message.clientMessageId === envelope.clientMessageId)) {
    messages.push(envelope);
    localStorage.setItem(storageKey(conversationKey), JSON.stringify(messages));
  }
  return messages;
}

export function hasLocalMessage(conversationKey: string, clientMessageId: string): boolean {
  return getLocalMessages(conversationKey).some((message) => message.clientMessageId === clientMessageId);
}

export function removeLocalMessage(conversationKey: string, clientMessageId: string): EncryptedMessageEnvelope[] {
  const messages = getLocalMessages(conversationKey).filter((message) => message.clientMessageId !== clientMessageId);
  localStorage.setItem(storageKey(conversationKey), JSON.stringify(messages));
  return messages;
}

export function appendLocalRecallNotice(
  conversationKey: string,
  payload: MessageRecallPayload,
  anchorSentAt?: string
): LocalRecallNotice[] {
  const notices = getLocalRecallNotices(conversationKey);
  if (!notices.some((notice) => notice.clientMessageId === payload.clientMessageId)) {
    notices.push(anchorSentAt ? { ...payload, anchorSentAt } : payload);
    localStorage.setItem(recallStorageKey(conversationKey), JSON.stringify(notices));
  }
  return notices;
}

export function clearLocalMessages(conversationKey: string): void {
  localStorage.removeItem(storageKey(conversationKey));
}

function storageKey(conversationKey: string): string {
  return `encrypted-chat:messages:${conversationKey}`;
}

function recallStorageKey(conversationKey: string): string {
  return `encrypted-chat:recalls:${conversationKey}`;
}
