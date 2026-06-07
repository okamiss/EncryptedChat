import { describe, expect, it } from "vitest";
import { decryptDirectMessage, encryptDirectMessage } from "./messages";
import { exportPublicKey, generateIdentityKeyPair } from "./keys";
import type { SafeUser } from "@encrypted-chat/shared";

describe("direct message encryption", () => {
  it("encrypts for both sender and recipient", async () => {
    const aliceKeys = await generateIdentityKeyPair();
    const bobKeys = await generateIdentityKeyPair();
    const alice = user("alice", await exportPublicKey(aliceKeys.publicKey));
    const bob = user("bob", await exportPublicKey(bobKeys.publicKey));

    const envelope = await encryptDirectMessage({
      plaintext: { kind: "text", text: "hello" },
      messageType: "text",
      fromUser: alice,
      toUser: bob
    });

    await expect(decryptDirectMessage(envelope, aliceKeys.privateKey, alice.id)).resolves.toEqual({
      kind: "text",
      text: "hello"
    });
    await expect(decryptDirectMessage(envelope, bobKeys.privateKey, bob.id)).resolves.toEqual({
      kind: "text",
      text: "hello"
    });
  });
});

function user(id: string, publicKey: JsonWebKey): SafeUser {
  return {
    id,
    uid: id.toUpperCase().padEnd(10, "1"),
    username: id,
    publicKey,
    createdAt: new Date(0).toISOString()
  };
}
