import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import type {
  EncryptedMessageEnvelope,
  MessageErrorPayload,
  MessageSentAck,
  PresencePayload
} from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import type { Server, Socket } from "socket.io";
import { sortFriendPair } from "../../common/sort-friend-pair";
import { PrismaService } from "../prisma/prisma.service";
import { groupRoom, RealtimeEventsService, userRoom } from "./realtime-events.service";

type AuthenticatedSocket = Socket & {
  data: {
    user?: {
      id: string;
      uid: string;
      username: string;
    };
  };
};

@WebSocketGateway({
  namespace: "chat",
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ?? ["http://localhost:5173"],
    credentials: true
  }
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService
  ) {}

  afterInit(server: Server) {
    this.realtimeEvents.attach(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== "string") {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; uid: string; username: string }>(token);
      client.data.user = {
        id: payload.sub,
        uid: payload.uid,
        username: payload.username
      };
      await client.join(userRoom(payload.sub));

      const groups = await this.prisma.groupMember.findMany({
        where: { userId: payload.sub },
        select: { groupId: true }
      });
      await Promise.all(groups.map((group) => client.join(groupRoom(group.groupId))));

      this.server.emit(SocketEvents.PresenceUpdate, {
        userId: payload.sub,
        online: true
      } satisfies PresencePayload);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.user?.id;
    if (!userId) {
      return;
    }
    this.server.emit(SocketEvents.PresenceUpdate, {
      userId,
      online: false
    } satisfies PresencePayload);
  }

  @SubscribeMessage(SocketEvents.MessageSend)
  async handleMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: EncryptedMessageEnvelope) {
    const sender = client.data.user;
    if (!sender) {
      client.emit(SocketEvents.MessageError, {
        clientMessageId: body.clientMessageId,
        message: "Unauthorized socket"
      } satisfies MessageErrorPayload);
      return;
    }

    const sentAt = new Date().toISOString();
    const message: EncryptedMessageEnvelope = {
      ...body,
      fromUserId: sender.id,
      sentAt
    };

    if (body.conversationType === "direct") {
      await this.forwardDirectMessage(sender.id, message);
    } else {
      await this.forwardGroupMessage(sender.id, message);
    }

    client.emit(SocketEvents.MessageSent, {
      clientMessageId: body.clientMessageId,
      sentAt
    } satisfies MessageSentAck);
  }

  private async forwardDirectMessage(senderId: string, message: EncryptedMessageEnvelope) {
    if (!message.toUserId) {
      throw new Error("Direct message missing toUserId");
    }

    const [userAId, userBId] = sortFriendPair(senderId, message.toUserId);
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true }
    });
    if (!friendship) {
      this.realtimeEvents.emitToUser(senderId, SocketEvents.MessageError, {
        clientMessageId: message.clientMessageId,
        message: "Users are not friends"
      } satisfies MessageErrorPayload);
      return;
    }

    this.server.to(userRoom(senderId)).to(userRoom(message.toUserId)).emit(SocketEvents.MessageNew, message);
  }

  private async forwardGroupMessage(senderId: string, message: EncryptedMessageEnvelope) {
    if (!message.groupId) {
      throw new Error("Group message missing groupId");
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: message.groupId,
          userId: senderId
        }
      },
      select: { groupId: true }
    });
    if (!membership) {
      this.realtimeEvents.emitToUser(senderId, SocketEvents.MessageError, {
        clientMessageId: message.clientMessageId,
        message: "You are not a member of this group"
      } satisfies MessageErrorPayload);
      return;
    }

    this.realtimeEvents.emitToGroup(message.groupId, SocketEvents.MessageNew, message);
  }
}
