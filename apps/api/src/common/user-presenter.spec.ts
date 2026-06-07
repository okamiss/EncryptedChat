import { describe, expect, it } from "vitest";
import { presentUser } from "./user-presenter";

describe("presentUser", () => {
  it("includes the optional display name", () => {
    const user = presentUser({
      id: "user-1",
      uid: "1000000001",
      username: "alice",
      displayName: "Cipher",
      publicKey: { kty: "EC" },
      createdAt: new Date("2026-06-08T00:00:00.000Z")
    });

    expect(user.displayName).toBe("Cipher");
  });
});
