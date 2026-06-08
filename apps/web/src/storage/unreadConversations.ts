export type UnreadConversationCounts = Record<string, number>;

export function getUnreadConversationCounts(userId: string): UnreadConversationCounts {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Object.fromEntries(
        parsed.filter((item): item is string => typeof item === "string").map((key) => [key, 1])
      );
    }
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number")
        .filter(([, count]) => count > 0)
    );
  } catch {
    return {};
  }
}

export function getUnreadConversations(userId: string): string[] {
  return Object.keys(getUnreadConversationCounts(userId));
}

export function addUnreadConversation(userId: string, conversationKey: string): UnreadConversationCounts {
  const counts = getUnreadConversationCounts(userId);
  counts[conversationKey] = (counts[conversationKey] ?? 0) + 1;
  localStorage.setItem(storageKey(userId), JSON.stringify(counts));
  return counts;
}

export function clearUnreadConversation(userId: string, conversationKey: string): UnreadConversationCounts {
  const counts = getUnreadConversationCounts(userId);
  delete counts[conversationKey];
  localStorage.setItem(storageKey(userId), JSON.stringify(counts));
  return counts;
}

function storageKey(userId: string): string {
  return `encrypted-chat:unread:${userId}`;
}
