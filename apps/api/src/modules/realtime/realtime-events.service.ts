import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

@Injectable()
export class RealtimeEventsService {
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  emitToGroup(groupId: string, event: string, payload: unknown) {
    this.server?.to(groupRoom(groupId)).emit(event, payload);
  }

  joinUserSocketsToGroup(userId: string, groupId: string) {
    this.server?.in(userRoom(userId)).socketsJoin(groupRoom(groupId));
  }
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function groupRoom(groupId: string) {
  return `group:${groupId}`;
}
