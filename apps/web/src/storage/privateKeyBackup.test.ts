import { describe, expect, it } from "vitest";
import { createPrivateKeyBackup, parsePrivateKeyBackup } from "./privateKeyBackup";
import type { StoredPrivateKeyRecord } from "./privateKeyStore";

describe("private key backup", () => {
  it("round-trips an encrypted private key record", () => {
    const record = privateKeyRecord("user-1");

    const backup = createPrivateKeyBackup(record);

    expect(parsePrivateKeyBackup(backup, "user-1")).toEqual(record);
  });

  it("rejects backups for a different user", () => {
    const backup = createPrivateKeyBackup(privateKeyRecord("user-1"));

    expect(() => parsePrivateKeyBackup(backup, "user-2")).toThrow("备份文件不属于当前账号");
  });
});

function privateKeyRecord(userId: string): StoredPrivateKeyRecord {
  return {
    userId,
    publicKey: {
      kty: "RSA",
      e: "AQAB",
      n: "modulus"
    },
    createdAt: new Date(0).toISOString(),
    encryptedPrivateKey: "encrypted-private-key",
    salt: "salt",
    iv: "iv"
  };
}
