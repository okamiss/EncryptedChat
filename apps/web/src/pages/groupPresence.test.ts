import { describe, expect, it } from "vitest";
import type { GroupView } from "@encrypted-chat/shared";
import { countOnlineGroupMembers } from "./groupPresence";

describe("groupPresence", () => {
  it("counts only online users that are members of the group", () => {
    expect(countOnlineGroupMembers(group(["user-1", "user-2", "user-3"]), ["user-2", "user-4"])).toBe(1);
  });
});

function group(memberIds: string[]): GroupView {
  return {
    id: "group-1",
    code: "1234567890",
    name: "Group",
    ownerId: memberIds[0],
    createdAt: new Date(0).toISOString(),
    members: memberIds.map((id) => ({
      user: {
        id,
        uid: id.toUpperCase().padEnd(10, "1"),
        username: id,
        publicKey: {},
        createdAt: new Date(0).toISOString()
      },
      role: id === memberIds[0] ? "owner" : "member",
      encryptedGroupKey: "key",
      keyVersion: 1,
      joinedAt: new Date(0).toISOString()
    }))
  };
}
