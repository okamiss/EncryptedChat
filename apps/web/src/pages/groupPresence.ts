import type { GroupView } from "@encrypted-chat/shared";

export function countOnlineGroupMembers(group: GroupView | undefined, onlineUserIds: string[]): number {
  if (!group) {
    return 0;
  }
  const online = new Set(onlineUserIds);
  return group.members.filter((member) => online.has(member.user.id)).length;
}
