import type { EncryptedMessageEnvelope, MessageType, SafeUser, WrappedMessageKey } from "@encrypted-chat/shared";
import { asBufferSource, base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from "./base64";
import { unwrapRawKeyForUser, wrapRawKeyForUser } from "./keys";

export type PlainMessage =
  | { kind: "text"; text: string }
  | {
      kind: "image";
      fileId: string;
      fileKey: string;
      fileIv: string;
      mimeType: string;
      name: string;
      size: number;
      sha256: string;
    };

interface DirectEncryptOptions {
  plaintext: PlainMessage;
  messageType: MessageType;
  fromUser: SafeUser;
  toUser: SafeUser;
}

interface GroupEncryptOptions {
  plaintext: PlainMessage;
  messageType: MessageType;
  groupId: string;
  groupKey: CryptoKey;
  keyVersion: number;
}

export async function encryptDirectMessage(options: DirectEncryptOptions): Promise<EncryptedMessageEnvelope> {
  const messageKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawMessageKey = new Uint8Array(await crypto.subtle.exportKey("raw", messageKey));
  const aad = createAad({
    conversationType: "direct",
    toUserId: options.toUser.id,
    messageType: options.messageType
  });

  const encrypted = await encryptJson(options.plaintext, messageKey, aad);
  const wrappedKeys: WrappedMessageKey[] = await Promise.all(
    [options.fromUser, options.toUser].map(async (user) => ({
      userId: user.id,
      wrappedKey: await wrapRawKeyForUser(rawMessageKey, user.publicKey)
    }))
  );

  return {
    clientMessageId: crypto.randomUUID(),
    conversationType: "direct",
    toUserId: options.toUser.id,
    messageType: options.messageType,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    aad,
    wrappedKeys
  };
}

export async function decryptDirectMessage(
  envelope: EncryptedMessageEnvelope,
  privateKey: CryptoKey,
  currentUserId: string
): Promise<PlainMessage> {
  const wrapped = envelope.wrappedKeys?.find((item) => item.userId === currentUserId);
  if (!wrapped) {
    throw new Error("No wrapped message key for this user");
  }
  const rawKey = await unwrapRawKeyForUser(wrapped.wrappedKey, privateKey);
  const messageKey = await crypto.subtle.importKey("raw", asBufferSource(rawKey), { name: "AES-GCM" }, false, [
    "decrypt"
  ]);
  return decryptJson(envelope, messageKey);
}

export async function generateGroupKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function wrapGroupKeyForUser(groupKey: CryptoKey, publicJwk: JsonWebKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", groupKey));
  return wrapRawKeyForUser(raw, publicJwk);
}

export async function unwrapGroupKey(encryptedGroupKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const raw = await unwrapRawKeyForUser(encryptedGroupKey, privateKey);
  return crypto.subtle.importKey("raw", asBufferSource(raw), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function encryptGroupMessage(options: GroupEncryptOptions): Promise<EncryptedMessageEnvelope> {
  const aad = createAad({
    conversationType: "group",
    groupId: options.groupId,
    messageType: options.messageType,
    keyVersion: options.keyVersion
  });
  const encrypted = await encryptJson(options.plaintext, options.groupKey, aad);
  return {
    clientMessageId: crypto.randomUUID(),
    conversationType: "group",
    groupId: options.groupId,
    messageType: options.messageType,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    aad,
    groupKeyVersion: options.keyVersion
  };
}

export async function decryptGroupMessage(envelope: EncryptedMessageEnvelope, groupKey: CryptoKey): Promise<PlainMessage> {
  return decryptJson(envelope, groupKey);
}

function createAad(value: Record<string, unknown>): string {
  return bytesToBase64(utf8ToBytes(JSON.stringify(value)));
}

async function encryptJson(value: unknown, key: CryptoKey, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv), additionalData: asBufferSource(utf8ToBytes(aad)) },
    key,
    asBufferSource(utf8ToBytes(JSON.stringify(value)))
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv)
  };
}

async function decryptJson<T>(envelope: EncryptedMessageEnvelope, key: CryptoKey): Promise<T> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: asBufferSource(base64ToBytes(envelope.iv)),
      additionalData: asBufferSource(utf8ToBytes(envelope.aad))
    },
    key,
    asBufferSource(base64ToBytes(envelope.ciphertext))
  );
  return JSON.parse(bytesToUtf8(decrypted)) as T;
}
