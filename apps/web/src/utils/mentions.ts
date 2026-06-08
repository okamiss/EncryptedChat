import type { GroupMemberView } from "@encrypted-chat/shared";
import { displayUserName } from "./displayName";

export function mentionedUserIdsInText(text: string, members: GroupMemberView[]): string[] {
  const ids = new Set<string>();

  for (const member of members) {
    const names = [displayUserName(member.user), member.user.username, member.user.uid].filter(Boolean);
    if (names.some((name) => text.includes(`@${name}`))) {
      ids.add(member.user.id);
    }
  }

  return [...ids];
}
