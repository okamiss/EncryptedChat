import { describe, expect, it } from "vitest";
import type { GroupView } from "@encrypted-chat/shared";
import { canManageGroupJoinRequests } from "./groupPermissions";

describe("groupPermissions", () => {
  it("does not reuse a stale managed group when the route has already switched", () => {
    const previousAdminGroup = group("group-1", "user-1", "admin");

    expect(canManageGroupJoinRequests(previousAdminGroup, "group-2", "user-1")).toBe(false);
  });

  it("allows the current group owner and admins to manage join requests", () => {
    expect(canManageGroupJoinRequests(group("group-1", "user-1", "owner"), "group-1", "user-1")).toBe(true);
    expect(canManageGroupJoinRequests(group("group-1", "user-1", "admin"), "group-1", "user-1")).toBe(true);
  });

  it("does not allow ordinary members to manage join requests", () => {
    expect(canManageGroupJoinRequests(group("group-1", "user-1", "member"), "group-1", "user-1")).toBe(false);
  });
});

function group(id: string, userId: string, role: "owner" | "admin" | "member"): GroupView {
  return {
    id,
    code: "1234567890",
    name: "Test group",
    ownerId: role === "owner" ? userId : "owner-1",
    createdAt: new Date(0).toISOString(),
    members: [
      {
        user: {
          id: userId,
          uid: "USER111111",
          username: "alice",
          publicKey: {},
          createdAt: new Date(0).toISOString()
        },
        role,
        encryptedGroupKey: "encrypted-key",
        keyVersion: 1,
        joinedAt: new Date(0).toISOString()
      }
    ]
  };
}
