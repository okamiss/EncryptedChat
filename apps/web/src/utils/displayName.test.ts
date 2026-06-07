import type { SafeUser } from "@encrypted-chat/shared";
import { describe, expect, it } from "vitest";
import { displayUserName } from "./displayName";

const baseUser: SafeUser = {
  id: "user-1",
  uid: "1000000001",
  username: "alice",
  publicKey: { kty: "EC" },
  createdAt: "2026-06-08T00:00:00.000Z"
};

describe("displayUserName", () => {
  it("uses display name before username", () => {
    expect(displayUserName({ ...baseUser, displayName: "Cipher" })).toBe("Cipher");
  });

  it("falls back to username when display name is blank", () => {
    expect(displayUserName({ ...baseUser, displayName: "   " })).toBe("alice");
  });
});
