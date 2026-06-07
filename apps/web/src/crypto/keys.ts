import { asBufferSource, base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from "./base64";

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
};

export interface EncryptedPrivateKeyPayload {
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
}

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_PARAMS, true, ["encrypt", "decrypt"]);
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", publicKey);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", privateKey);
}

export async function importPublicKey(publicJwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", publicJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

export async function importPrivateKey(privateJwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", privateJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
}

export async function encryptPrivateKeyForStorage(
  privateJwk: JsonWebKey,
  password: string
): Promise<EncryptedPrivateKeyPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const storageKey = await deriveStorageKey(password, salt);
  const plaintext = utf8ToBytes(JSON.stringify(privateJwk));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    storageKey,
    asBufferSource(plaintext)
  );

  return {
    encryptedPrivateKey: bytesToBase64(new Uint8Array(encrypted)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv)
  };
}

export async function decryptPrivateKeyFromStorage(
  payload: EncryptedPrivateKeyPayload,
  password: string
): Promise<CryptoKey> {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const storageKey = await deriveStorageKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    storageKey,
    asBufferSource(base64ToBytes(payload.encryptedPrivateKey))
  );
  const privateJwk = JSON.parse(bytesToUtf8(decrypted)) as JsonWebKey;
  return importPrivateKey(privateJwk);
}

export async function wrapRawKeyForUser(rawKey: Uint8Array, publicJwk: JsonWebKey): Promise<string> {
  const publicKey = await importPublicKey(publicJwk);
  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, asBufferSource(rawKey));
  return bytesToBase64(new Uint8Array(wrapped));
}

export async function unwrapRawKeyForUser(wrappedKey: string, privateKey: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, asBufferSource(base64ToBytes(wrappedKey)));
  return new Uint8Array(raw);
}

async function deriveStorageKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey("raw", asBufferSource(utf8ToBytes(password)), "PBKDF2", false, [
    "deriveKey"
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBufferSource(salt),
      iterations: 250000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
