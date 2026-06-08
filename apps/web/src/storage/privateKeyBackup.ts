import type { StoredPrivateKeyRecord } from "./privateKeyStore";

const BACKUP_TYPE = "encrypted-chat.private-key-backup";
const BACKUP_VERSION = 1;

interface PrivateKeyBackupFile extends StoredPrivateKeyRecord {
  type: typeof BACKUP_TYPE;
  version: typeof BACKUP_VERSION;
}

export function createPrivateKeyBackup(record: StoredPrivateKeyRecord): string {
  return JSON.stringify(
    {
      type: BACKUP_TYPE,
      version: BACKUP_VERSION,
      userId: record.userId,
      publicKey: record.publicKey,
      createdAt: record.createdAt,
      encryptedPrivateKey: record.encryptedPrivateKey,
      salt: record.salt,
      iv: record.iv
    } satisfies PrivateKeyBackupFile,
    null,
    2
  );
}

export function parsePrivateKeyBackup(text: string, expectedUserId?: string): StoredPrivateKeyRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("备份文件不是有效的 JSON");
  }

  if (!isBackupFile(parsed)) {
    throw new Error("备份文件格式不正确");
  }

  if (expectedUserId && parsed.userId !== expectedUserId) {
    throw new Error("备份文件不属于当前账号");
  }

  return {
    userId: parsed.userId,
    publicKey: parsed.publicKey,
    createdAt: parsed.createdAt,
    encryptedPrivateKey: parsed.encryptedPrivateKey,
    salt: parsed.salt,
    iv: parsed.iv
  };
}

function isBackupFile(value: unknown): value is PrivateKeyBackupFile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const backup = value as Partial<PrivateKeyBackupFile>;
  return (
    backup.type === BACKUP_TYPE &&
    backup.version === BACKUP_VERSION &&
    typeof backup.userId === "string" &&
    typeof backup.createdAt === "string" &&
    typeof backup.encryptedPrivateKey === "string" &&
    typeof backup.salt === "string" &&
    typeof backup.iv === "string" &&
    Boolean(backup.publicKey) &&
    typeof backup.publicKey === "object"
  );
}
