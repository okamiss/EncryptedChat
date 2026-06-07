import type { SafeUser } from "@encrypted-chat/shared";

export function displayUserName(user: Pick<SafeUser, "username" | "displayName">): string {
  return user.displayName?.trim() || user.username;
}
