import { asBufferSource, base64ToBytes, bytesToBase64 } from "./base64";

export interface EncryptedImageFile {
  encryptedBlob: Blob;
  fileKey: string;
  fileIv: string;
  sha256: string;
}

export async function encryptImageFile(file: File): Promise<EncryptedImageFile> {
  const fileKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", fileKey));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    fileKey,
    await file.arrayBuffer()
  );
  const encryptedBytes = new Uint8Array(encrypted);

  return {
    encryptedBlob: new Blob([encryptedBytes], { type: "application/octet-stream" }),
    fileKey: bytesToBase64(rawKey),
    fileIv: bytesToBase64(iv),
    sha256: await sha256Hex(encryptedBytes)
  };
}

export async function decryptImageBlob(
  encryptedBlob: Blob,
  fileKey: string,
  fileIv: string,
  mimeType: string
): Promise<Blob> {
  const key = await crypto.subtle.importKey("raw", asBufferSource(base64ToBytes(fileKey)), { name: "AES-GCM" }, false, [
    "decrypt"
  ]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(base64ToBytes(fileIv)) },
    key,
    await encryptedBlob.arrayBuffer()
  );
  return new Blob([decrypted], { type: mimeType });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", asBufferSource(bytes));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
