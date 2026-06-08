import { beforeEach, describe, expect, it } from "vitest";
import {
  addUnreadConversation,
  clearUnreadConversation,
  getUnreadConversations
} from "./unreadConversations";

const userId = "user-1";

describe("unreadConversations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps unique unread conversation keys per user", () => {
    addUnreadConversation(userId, "direct:user-2");
    addUnreadConversation(userId, "direct:user-2");
    addUnreadConversation(userId, "group:group-1");

    expect(getUnreadConversations(userId)).toEqual(["direct:user-2", "group:group-1"]);
  });

  it("clears a read conversation without touching the rest", () => {
    addUnreadConversation(userId, "direct:user-2");
    addUnreadConversation(userId, "group:group-1");

    clearUnreadConversation(userId, "direct:user-2");

    expect(getUnreadConversations(userId)).toEqual(["group:group-1"]);
  });
});
