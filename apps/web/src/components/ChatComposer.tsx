import { PictureOutlined, SendOutlined, SmileOutlined } from "@ant-design/icons";
import { Button, Popover, Space, Upload } from "antd";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

export type ComposerInsertRequest =
  | { id: string; type: "quote"; senderName: string; text: string }
  | { id: string; type: "mention"; label: string };

export type ComposerMessagePart = { type: "text"; text: string } | { type: "image"; file: File };

interface DraftImage {
  file: File;
  previewUrl: string;
}

interface ChatComposerProps {
  disabled?: boolean;
  insertRequest?: ComposerInsertRequest;
  onSendMessage: (parts: ComposerMessagePart[]) => Promise<void>;
}

const SYSTEM_EMOJIS = [
  "😊",
  "😂",
  "🤣",
  "😍",
  "🤗",
  "😝",
  "😎",
  "🤔",
  "😢",
  "😨",
  "👍",
  "👎",
  "👏",
  "🙏",
  "👌",
  "💪",
  "🎀",
  "🔥",
  "❤️",
  "💃",
  "✅",
  "⭐",
  "🌮",
  "🍒",
  "☕",
  "🍃",
  "😄",
  "😾",
  "🙮"
];

export function ChatComposer({ disabled, insertRequest, onSendMessage }: ChatComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageIdRef = useRef(0);
  const imagesRef = useRef(new Map<string, DraftImage>());
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);

  const focusEditor = () => {
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };

  const markDraftChanged = () => setDraftVersion((current) => current + 1);

  const sendDraft = async () => {
    const parts = serializeDraft(editorRef.current, imagesRef.current);
    if (parts.length === 0) {
      focusEditor();
      return;
    }

    setSending(true);
    try {
      await onSendMessage(parts);
      clearDraft(editorRef.current, imagesRef.current);
      markDraftChanged();
    } finally {
      setSending(false);
      focusEditor();
    }
  };

  const insertText = (text: string) => {
    insertNodeAtCursor(document.createTextNode(text), editorRef.current);
    markDraftChanged();
    focusEditor();
  };

  const insertEmoji = (emoji: string) => {
    insertText(emoji);
    setEmojiOpen(false);
  };

  const insertDraftImage = (file: File) => {
    const id = `draft-image-${imageIdRef.current}`;
    imageIdRef.current += 1;
    const previewUrl = URL.createObjectURL(file);
    imagesRef.current.set(id, { file, previewUrl });
    insertNodeAtCursor(createImageChip(id, file, previewUrl, () => removeDraftImage(id)), editorRef.current);
    markDraftChanged();
    focusEditor();
  };

  const removeDraftImage = (id: string) => {
    const image = imagesRef.current.get(id);
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
    }
    imagesRef.current.delete(id);
    editorRef.current?.querySelector(`[data-draft-image-id="${CSS.escape(id)}"]`)?.remove();
    markDraftChanged();
    focusEditor();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled || sending) {
      return;
    }
    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/")
    );
    const file = imageItem?.getAsFile();
    if (!file) {
      return;
    }
    event.preventDefault();
    insertDraftImage(file);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void sendDraft();
  };

  useEffect(() => {
    if (!insertRequest) {
      return;
    }
    if (insertRequest.type === "mention") {
      insertText(`@${insertRequest.label} `);
      return;
    }
    const quoteText = insertRequest.text.replace(/\s+/g, " ").slice(0, 160);
    insertText(`> ${insertRequest.senderName}: ${quoteText}\n\n`);
  }, [insertRequest]);

  useEffect(
    () => () => {
      for (const image of imagesRef.current.values()) {
        URL.revokeObjectURL(image.previewUrl);
      }
    },
    []
  );

  const hasDraft = draftVersion > 0 && serializeDraft(editorRef.current, imagesRef.current).length > 0;

  return (
    <div className="composer">
      <div className="composer-toolbar" aria-label="消息工具栏">
        <Popover
          trigger="click"
          open={emojiOpen}
          onOpenChange={setEmojiOpen}
          content={
            <div className="emoji-grid">
              {SYSTEM_EMOJIS.map((emoji, index) => (
                <button key={`${emoji}-${index}`} type="button" className="emoji-option" onClick={() => insertEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          }
        >
          <Button aria-label="插入表情" type="text" icon={<SmileOutlined />} disabled={disabled || sending} />
        </Popover>
        <Upload
          accept="image/*"
          showUploadList={false}
          disabled={disabled || sending}
          beforeUpload={(file) => {
            insertDraftImage(file as File);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button aria-label="添加图片" type="text" icon={<PictureOutlined />} disabled={disabled || sending} />
        </Upload>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="输入加密消息"
        className={`composer-editor${hasDraft ? "" : " is-empty"}`}
        contentEditable={!disabled && !sending}
        data-placeholder="输入加密消息"
        suppressContentEditableWarning
        onInput={markDraftChanged}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <Space className="composer-actions">
        <Button
          aria-label="发送"
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          disabled={disabled || !hasDraft}
          onClick={() => void sendDraft()}
        >
          发送
        </Button>
      </Space>
    </div>
  );
}

function createImageChip(id: string, file: File, previewUrl: string, onRemove: () => void) {
  const chip = document.createElement("span");
  chip.className = "composer-image-chip";
  chip.contentEditable = "false";
  chip.dataset.draftImageId = id;

  const image = document.createElement("img");
  image.src = previewUrl;
  image.alt = file.name || "draft image";

  const label = document.createElement("span");
  label.className = "composer-image-name";
  label.textContent = file.name || "图片";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "composer-image-remove";
  remove.setAttribute("aria-label", "移除图片");
  remove.textContent = "×";
  remove.addEventListener("click", onRemove);

  chip.append(image, label, remove);
  return chip;
}

function insertNodeAtCursor(node: Node, editor: HTMLDivElement | null) {
  if (!editor) {
    return;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
    editor.append(node);
    placeCursorAfter(node);
    editor.focus();
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  placeCursorAfter(node);
  editor.focus();
}

function placeCursorAfter(node: Node) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function serializeDraft(
  editor: HTMLDivElement | null,
  images: Map<string, DraftImage>
): ComposerMessagePart[] {
  if (!editor) {
    return [];
  }

  const parts: ComposerMessagePart[] = [];
  const appendText = (text: string) => {
    if (!text) {
      return;
    }
    const previous = parts[parts.length - 1];
    if (previous?.type === "text") {
      previous.text += text;
    } else {
      parts.push({ type: "text", text });
    }
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement)) {
      return;
    }
    if (node.tagName === "BR") {
      appendText("\n");
      return;
    }
    const imageId = node.dataset.draftImageId;
    if (imageId) {
      const image = images.get(imageId);
      if (image) {
        parts.push({ type: "image", file: image.file });
      }
      return;
    }
    node.childNodes.forEach(walk);
  };

  editor.childNodes.forEach(walk);
  if (parts.length === 1 && parts[0].type === "text") {
    const trimmed = parts[0].text.trim();
    return trimmed ? [{ type: "text", text: trimmed }] : [];
  }
  return parts.filter((part) => part.type === "image" || part.text.length > 0);
}

function clearDraft(editor: HTMLDivElement | null, images: Map<string, DraftImage>) {
  if (editor) {
    editor.textContent = "";
  }
  for (const image of images.values()) {
    URL.revokeObjectURL(image.previewUrl);
  }
  images.clear();
}
