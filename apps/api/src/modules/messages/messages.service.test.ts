import type { EncryptedMessageEnvelope, MessageRecallPayload } from "@encrypted-chat/shared";
import { describe, expect, it, vi } from "vitest";
import { MessagesService } from "./messages.service";

describe("MessagesService", () => {
  it("stores an encrypted direct message for later sync", async () => {
    const prisma = {
      encryptedMessage: {
        upsert: vi.fn().mockResolvedValue(undefined)
      }
    };
    const service = new MessagesService(prisma as never);
    const message = directMessage();

    await service.store(message);

    expect(prisma.encryptedMessage.upsert).toHaveBeenCalledWith({
      where: { clientMessageId: "message-1" },
      update: {
        payload: message,
        sentAt: new Date("2026-06-08T10:00:00.000Z")
      },
      create: {
        clientMessageId: "message-1",
        conversationType: "direct",
        senderId: "sender-1",
        recipientId: "receiver-1",
        groupId: null,
        payload: message,
        sentAt: new Date("2026-06-08T10:00:00.000Z")
      }
    });
  });

  it("lists direct and group messages visible to the current user", async () => {
    const message = directMessage();
    const prisma = {
      encryptedMessage: {
        findMany: vi.fn().mockResolvedValue([{ payload: message }])
      }
    };
    const service = new MessagesService(prisma as never);

    await expect(service.listForUser("receiver-1")).resolves.toEqual([message]);

    expect(prisma.encryptedMessage.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            conversationType: "direct",
            OR: [{ senderId: "receiver-1" }, { recipientId: "receiver-1" }]
          },
          {
            conversationType: "group",
            group: {
              members: {
                some: { userId: "receiver-1" }
              }
            }
          }
        ]
      },
      orderBy: { sentAt: "asc" },
      select: { payload: true }
    });
  });

  it("removes a recalled message from offline sync", async () => {
    const prisma = {
      encryptedMessage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };
    const service = new MessagesService(prisma as never);
    const recall: MessageRecallPayload = {
      clientMessageId: "message-1",
      conversationType: "direct",
      toUserId: "receiver-1"
    };

    await service.removeRecalled("sender-1", recall);

    expect(prisma.encryptedMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        clientMessageId: "message-1",
        senderId: "sender-1",
        conversationType: "direct",
        recipientId: "receiver-1"
      }
    });
  });
});

function directMessage(): EncryptedMessageEnvelope {
  return {
    clientMessageId: "message-1",
    conversationType: "direct",
    fromUserId: "sender-1",
    toUserId: "receiver-1",
    messageType: "text",
    ciphertext: "ciphertext",
    iv: "iv",
    aad: "aad",
    sentAt: "2026-06-08T10:00:00.000Z"
  };
}
