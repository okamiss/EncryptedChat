import type { GroupMemberView } from "@encrypted-chat/shared";
import { describe, expect, it } from "vitest";
import { mentionedUserIdsInText } from "./mentions";

const members = [
  member("user-1", "alice", "100001", "Alice"),
  member("user-2", "bob", "100002", null)
];

describe("mentionedUserIdsInText", () => {
  it("matches group members by display name, username, or uid", () => {
    expect(mentionedUserIdsInText("hi @Alice and @bob and @100002", members)).toEqual(["user-1", "user-2"]);
  });

  it("does not duplicate repeated mentions", () => {
    expect(mentionedUserIdsInText("@bob @100002", members)).toEqual(["user-2"]);
  });
});

function member(id: string, username: string, uid: string, displayName: string | null): GroupMemberView {
  return {
    user: {
      id,
      username,
      uid,
      displayName,
      publicKey: {},
      createdAt: "2026-06-08T00:00:00.000Z"
    },
    role: "member",
    encryptedGroupKey: "",
    keyVersion: 1,
    joinedAt: "2026-06-08T00:00:00.000Z"
  };
}
