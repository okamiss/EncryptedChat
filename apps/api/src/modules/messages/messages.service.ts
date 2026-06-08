import { Injectable } from "@nestjs/common";
import type { EncryptedMessageEnvelope, MessageRecallPayload } from "@encrypted-chat/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async store(message: EncryptedMessageEnvelope): Promise<void> {
    if (!message.fromUserId || !message.sentAt) {
      throw new Error("Stored message requires fromUserId and sentAt");
    }
    const payload = toJson(message);

    await this.prisma.encryptedMessage.upsert({
      where: { clientMessageId: message.clientMessageId },
      update: {
        payload,
        sentAt: new Date(message.sentAt)
      },
      create: {
        clientMessageId: message.clientMessageId,
        conversationType: message.conversationType,
        senderId: message.fromUserId,
        recipientId: message.conversationType === "direct" ? message.toUserId : null,
        groupId: message.conversationType === "group" ? message.groupId : null,
        payload,
        sentAt: new Date(message.sentAt)
      }
    });
  }

  async listForUser(userId: string): Promise<EncryptedMessageEnvelope[]> {
    const messages = await this.prisma.encryptedMessage.findMany({
      where: {
        OR: [
          {
            conversationType: "direct",
            OR: [{ senderId: userId }, { recipientId: userId }]
          },
          {
            conversationType: "group",
            group: {
              members: {
                some: { userId }
              }
            }
          }
        ]
      },
      orderBy: { sentAt: "asc" },
      select: { payload: true }
    });
    return messages.map((message) => message.payload as unknown as EncryptedMessageEnvelope);
  }

  async removeRecalled(senderId: string, payload: MessageRecallPayload): Promise<void> {
    await this.prisma.encryptedMessage.deleteMany({
      where: {
        clientMessageId: payload.clientMessageId,
        senderId,
        conversationType: payload.conversationType,
        ...(payload.conversationType === "direct" ? { recipientId: payload.toUserId } : { groupId: payload.groupId })
      }
    });
  }
}

function toJson(message: EncryptedMessageEnvelope): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(message)) as Prisma.InputJsonValue;
}
