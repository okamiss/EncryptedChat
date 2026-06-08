export function getUnreadConversations(userId: string): string[] {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function addUnreadConversation(userId: string, conversationKey: string): string[] {
  const keys = getUnreadConversations(userId);
  if (!keys.includes(conversationKey)) {
    keys.push(conversationKey);
    localStorage.setItem(storageKey(userId), JSON.stringify(keys));
  }
  return keys;
}

export function clearUnreadConversation(userId: string, conversationKey: string): string[] {
  const keys = getUnreadConversations(userId).filter((key) => key !== conversationKey);
  localStorage.setItem(storageKey(userId), JSON.stringify(keys));
  return keys;
}

function storageKey(userId: string): string {
  return `encrypted-chat:unread:${userId}`;
}
