import type { GroupView } from "@encrypted-chat/shared";

export function canManageGroupJoinRequests(group: GroupView | undefined, routeGroupId: string, userId?: string): boolean {
  if (!group || group.id !== routeGroupId || !userId) {
    return false;
  }
  const membership = group.members.find((member) => member.user.id === userId);
  return membership?.role === "owner" || membership?.role === "admin";
}
