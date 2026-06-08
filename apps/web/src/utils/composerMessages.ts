import type { MessageType, UploadEncryptedFileResponse, EncryptedAttachmentRef } from "@encrypted-chat/shared";
import type { ComposerMessagePart } from "../components/ChatComposer";
import type { PlainMessage } from "../crypto/messages";

type UploadedImagePart = Extract<PlainMessage, { kind: "image" }>;

interface PreparedComposerMessage {
  plaintext: PlainMessage;
  messageType: MessageType;
  attachment?: EncryptedAttachmentRef;
}

export async function prepareComposerMessage(
  parts: ComposerMessagePart[],
  uploadImage: (file: File) => Promise<UploadedImagePart>
): Promise<PreparedComposerMessage> {
  if (parts.length === 1 && parts[0].type === "text") {
    return {
      plaintext: { kind: "text", text: parts[0].text },
      messageType: "text"
    };
  }

  if (parts.length === 1 && parts[0].type === "image") {
    const image = await uploadImage(parts[0].file);
    return {
      plaintext: image,
      messageType: "image",
      attachment: imageAttachment(image)
    };
  }

  const richParts: Extract<PlainMessage, { kind: "rich" }>["parts"] = [];
  for (const part of parts) {
    if (part.type === "text") {
      richParts.push(part);
      continue;
    }
    const image = await uploadImage(part.file);
    richParts.push({ type: "image", ...image });
  }

  return {
    plaintext: { kind: "rich", parts: richParts },
    messageType: "rich"
  };
}

export function uploadedImageMessage(
  file: File,
  encryptedFile: { fileKey: string; fileIv: string },
  uploaded: UploadEncryptedFileResponse
): UploadedImagePart {
  return {
    kind: "image",
    fileId: uploaded.id,
    fileKey: encryptedFile.fileKey,
    fileIv: encryptedFile.fileIv,
    mimeType: file.type || "image/png",
    name: file.name,
    size: file.size,
    sha256: uploaded.sha256
  };
}

export function plainMessageText(message: PlainMessage): string {
  if (message.kind === "text") {
    return message.text;
  }
  if (message.kind === "image") {
    return `[图片] ${message.name}`;
  }
  return message.parts
    .map((part) => (part.type === "text" ? part.text : `[图片] ${part.name}`))
    .join("");
}

function imageAttachment(image: UploadedImagePart): EncryptedAttachmentRef {
  return {
    fileId: image.fileId,
    size: image.size,
    sha256: image.sha256
  };
}
