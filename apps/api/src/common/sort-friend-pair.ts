export function sortFriendPair(userId: string, otherUserId: string): [string, string] {
  return userId.localeCompare(otherUserId) < 0 ? [userId, otherUserId] : [otherUserId, userId];
}
