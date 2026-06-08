import type { EncryptedMessageEnvelope } from "@encrypted-chat/shared";
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendLocalMessage,
  conversationKeyForRecall,
  getLocalMessages,
  hasLocalMessage,
  removeLocalMessage
} from "./localMessages";

function message(clientMessageId: string): EncryptedMessageEnvelope {
  return {
    clientMessageId,
    conversationType: "group",
    groupId: "group-1",
    messageType: "text",
    ciphertext: "ciphertext",
    iv: "iv",
    aad: "aad"
  };
}

describe("localMessages", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes only the selected message from a conversation", () => {
    appendLocalMessage("group:group-1", message("message-1"));
    appendLocalMessage("group:group-1", message("message-2"));

    removeLocalMessage("group:group-1", "message-1");

    expect(getLocalMessages("group:group-1").map((item) => item.clientMessageId)).toEqual(["message-2"]);
  });

  it("reports whether a local conversation already has a message", () => {
    appendLocalMessage("group:group-1", message("message-1"));

    expect(hasLocalMessage("group:group-1", "message-1")).toBe(true);
    expect(hasLocalMessage("group:group-1", "message-2")).toBe(false);
  });

  it("builds the group conversation key for a recalled group message", () => {
    expect(
      conversationKeyForRecall(
        {
          clientMessageId: "message-1",
          conversationType: "group",
          groupId: "group-1"
        },
        "user-1"
      )
    ).toBe("group:group-1");
  });

  it("builds the direct conversation key for a recalled direct message", () => {
    expect(
      conversationKeyForRecall(
        {
          clientMessageId: "message-1",
          conversationType: "direct",
          fromUserId: "user-1",
          toUserId: "user-2"
        },
        "user-2"
      )
    ).toBe("direct:user-1");
  });
});
