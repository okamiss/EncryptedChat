import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { FriendRequestView, FriendView } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { presentUser } from "../../common/user-presenter";
import { sortFriendPair } from "../../common/sort-friend-pair";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeEventsService } from "../realtime/realtime-events.service";

type FriendRequestRecord = {
  id: string;
  requester: Parameters<typeof presentUser>[0];
  addressee: Parameters<typeof presentUser>[0];
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  respondedAt: Date | null;
};

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEventsService
  ) {}

  async createRequest(requesterId: string, addresseeUid: string): Promise<FriendRequestView> {
    const addressee = await this.prisma.user.findUnique({ where: { uid: addresseeUid } });
    if (!addressee) {
      throw new NotFoundException("User not found");
    }
    if (addressee.id === requesterId) {
      throw new BadRequestException("You cannot add yourself");
    }

    const [userAId, userBId] = sortFriendPair(requesterId, addressee.id);
    const existingFriendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } }
    });
    if (existingFriendship) {
      throw new ConflictException("Already friends");
    }

    const existingPending = await this.prisma.friendRequest.findFirst({
      where: {
        status: "pending",
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId }
        ]
      }
    });
    if (existingPending) {
      throw new ConflictException("A pending request already exists");
    }

    const request = await this.prisma.friendRequest.create({
      data: {
        requesterId,
        addresseeId: addressee.id
      },
      include: friendRequestInclude
    });
    const view = presentFriendRequest(request);
    this.realtime.emitToUser(addressee.id, SocketEvents.FriendRequest, view);
    return view;
  }

  async listIncoming(userId: string): Promise<FriendRequestView[]> {
    const requests = await this.prisma.friendRequest.findMany({
      where: { addresseeId: userId, status: "pending" },
      include: friendRequestInclude,
      orderBy: { createdAt: "desc" }
    });
    return requests.map(presentFriendRequest);
  }

  async listOutgoing(userId: string): Promise<FriendRequestView[]> {
    const requests = await this.prisma.friendRequest.findMany({
      where: { requesterId: userId, status: "pending" },
      include: friendRequestInclude,
      orderBy: { createdAt: "desc" }
    });
    return requests.map(presentFriendRequest);
  }

  async accept(userId: string, requestId: string): Promise<FriendRequestView> {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: friendRequestInclude
    });
    if (!request || request.addresseeId !== userId || request.status !== "pending") {
      throw new NotFoundException("Pending friend request not found");
    }

    const [userAId, userBId] = sortFriendPair(request.requesterId, request.addresseeId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        update: {},
        create: { userAId, userBId }
      });
      return tx.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted", respondedAt: new Date() },
        include: friendRequestInclude
      });
    });

    const view = presentFriendRequest(updated);
    this.realtime.emitToUser(request.requesterId, SocketEvents.FriendAccepted, view);
    return view;
  }

  async reject(userId: string, requestId: string): Promise<FriendRequestView> {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: friendRequestInclude
    });
    if (!request || request.addresseeId !== userId || request.status !== "pending") {
      throw new NotFoundException("Pending friend request not found");
    }

    const updated = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "rejected", respondedAt: new Date() },
      include: friendRequestInclude
    });
    return presentFriendRequest(updated);
  }

  async listFriends(userId: string): Promise<FriendView[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }]
      },
      include: {
        userA: true,
        userB: true
      },
      orderBy: { createdAt: "desc" }
    });

    return friendships.map((friendship) => {
      const friend = friendship.userAId === userId ? friendship.userB : friendship.userA;
      return {
        ...presentUser(friend),
        friendshipId: friendship.id,
        friendshipCreatedAt: friendship.createdAt.toISOString()
      };
    });
  }

  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    const [userAId, userBId] = sortFriendPair(userId, otherUserId);
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true }
    });
    return Boolean(friendship);
  }

  async remove(userId: string, friendId: string): Promise<void> {
    const [userAId, userBId] = sortFriendPair(userId, friendId);
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true }
    });
    if (!friendship) {
      throw new NotFoundException("Friendship not found");
    }

    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    this.realtime.emitToUser(friendId, SocketEvents.FriendUpdated, {
      userId,
      action: "removed"
    });
    this.realtime.emitToUser(userId, SocketEvents.FriendUpdated, {
      userId: friendId,
      action: "removed"
    });
  }
}

const friendRequestInclude = {
  requester: true,
  addressee: true
} as const;

function presentFriendRequest(request: FriendRequestRecord): FriendRequestView {
  return {
    id: request.id,
    requester: presentUser(request.requester),
    addressee: presentUser(request.addressee),
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    respondedAt: request.respondedAt?.toISOString() ?? null
  };
}
