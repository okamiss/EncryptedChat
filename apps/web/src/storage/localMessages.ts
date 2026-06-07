import type { EncryptedMessageEnvelope } from "@encrypted-chat/shared";

export function conversationKeyForEnvelope(envelope: EncryptedMessageEnvelope, currentUserId: string): string {
  if (envelope.conversationType === "group") {
    return `group:${envelope.groupId}`;
  }
  const otherUserId = envelope.fromUserId === currentUserId ? envelope.toUserId : envelope.fromUserId;
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

export function appendLocalMessage(conversationKey: string, envelope: EncryptedMessageEnvelope): EncryptedMessageEnvelope[] {
  const messages = getLocalMessages(conversationKey);
  if (!messages.some((message) => message.clientMessageId === envelope.clientMessageId)) {
    messages.push(envelope);
    localStorage.setItem(storageKey(conversationKey), JSON.stringify(messages));
  }
  return messages;
}

export function clearLocalMessages(conversationKey: string): void {
  localStorage.removeItem(storageKey(conversationKey));
}

function storageKey(conversationKey: string): string {
  return `encrypted-chat:messages:${conversationKey}`;
}
