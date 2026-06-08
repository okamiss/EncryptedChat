import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { GroupInviteView, GroupJoinRequestView, GroupView } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { Prisma } from "@prisma/client";
import { presentUser } from "../../common/user-presenter";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeEventsService } from "../realtime/realtime-events.service";

type GroupRecord = Awaited<ReturnType<GroupsService["getGroupRecord"]>>;
type GroupInviteRecord = NonNullable<Awaited<ReturnType<GroupsService["getInviteRecord"]>>>;
type GroupJoinRequestRecord = NonNullable<Awaited<ReturnType<GroupsService["getJoinRequestRecord"]>>>;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEventsService
  ) {}

  async create(ownerId: string, groupName: string, encryptedGroupKey: string, keyVersion: number): Promise<GroupView> {
    let group: NonNullable<GroupRecord> | undefined;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        group = await this.prisma.group.create({
          data: {
            code: generateGroupCode(),
            name: groupName,
            ownerId,
            members: {
              create: {
                userId: ownerId,
                role: "owner",
                encryptedGroupKey,
                keyVersion
              }
            }
          },
          include: groupInclude
        });
        break;
      } catch (error) {
        if (isUniqueConstraintError(error, "code")) {
          continue;
        }
        throw error;
      }
    }

    if (!group) {
      throw new ConflictException("Unable to allocate a group code");
    }

    this.realtime.joinUserSocketsToGroup(ownerId, group.id);
    return presentGroup(group);
  }

  async list(userId: string): Promise<GroupView[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: groupInclude
        }
      },
      orderBy: { joinedAt: "desc" }
    });
    return memberships.map((membership) => presentGroup(membership.group));
  }

  async get(userId: string, groupId: string): Promise<GroupView> {
    await this.assertMember(userId, groupId);
    const group = await this.getGroupRecord(groupId);
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    return presentGroup(group);
  }

  async updateName(ownerId: string, groupId: string, groupName: string): Promise<GroupView> {
    await this.assertOwner(ownerId, groupId);
    const normalized = groupName.trim();
    if (!normalized) {
      throw new BadRequestException("Group name is required");
    }

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { name: normalized },
      include: groupInclude
    });
    this.realtime.emitToGroup(groupId, SocketEvents.GroupUpdated, {
      groupId,
      action: "renamed"
    });
    return presentGroup(group);
  }

  async invite(
    inviterId: string,
    groupId: string,
    inviteeId: string,
    encryptedGroupKey: string,
    keyVersion: number
  ): Promise<GroupInviteView> {
    await this.assertMember(inviterId, groupId);

    const invitee = await this.prisma.user.findUnique({ where: { id: inviteeId } });
    if (!invitee) {
      throw new NotFoundException("Invitee not found");
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: inviteeId } },
      select: { groupId: true }
    });
    if (existingMember) {
      throw new ConflictException("User is already in this group");
    }

    const pending = await this.prisma.groupInvite.findFirst({
      where: { groupId, inviteeId, status: "pending" }
    });
    if (pending) {
      throw new ConflictException("A pending group invite already exists");
    }

    const invite = await this.prisma.groupInvite.create({
      data: {
        groupId,
        inviterId,
        inviteeId,
        encryptedGroupKey,
        keyVersion
      },
      include: groupInviteInclude
    });
    const view = presentGroupInvite(invite);
    this.realtime.emitToUser(inviteeId, SocketEvents.GroupInvite, view);
    return view;
  }

  async requestJoin(applicantId: string, groupCode: string): Promise<GroupJoinRequestView> {
    const group = await this.prisma.group.findUnique({
      where: { code: groupCode.trim() }
    });
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: applicantId } },
      select: { groupId: true }
    });
    if (existingMember) {
      throw new BadRequestException("You are already in this group");
    }

    const pending = await this.prisma.groupJoinRequest.findFirst({
      where: { groupId: group.id, applicantId, status: "pending" }
    });
    if (pending) {
      throw new ConflictException("A pending join request already exists");
    }

    const request = await this.prisma.groupJoinRequest.create({
      data: {
        groupId: group.id,
        applicantId
      },
      include: groupJoinRequestInclude
    });
    const view = presentGroupJoinRequest(request);
    this.realtime.emitToUser(group.ownerId, SocketEvents.GroupUpdated, {
      groupId: group.id,
      action: "join-request"
    });
    return view;
  }

  async listJoinRequests(ownerId: string, groupId: string): Promise<GroupJoinRequestView[]> {
    await this.assertOwner(ownerId, groupId);
    const requests = await this.prisma.groupJoinRequest.findMany({
      where: { groupId, status: "pending" },
      include: groupJoinRequestInclude,
      orderBy: { createdAt: "desc" }
    });
    return requests.map(presentGroupJoinRequest);
  }

  async approveJoinRequest(
    ownerId: string,
    requestId: string,
    encryptedGroupKey: string,
    keyVersion: number
  ): Promise<GroupJoinRequestView> {
    const request = await this.getJoinRequestRecord(requestId);
    if (!request || request.group.ownerId !== ownerId || request.status !== "pending") {
      throw new NotFoundException("Pending join request not found");
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: request.groupId, userId: request.applicantId } },
      select: { groupId: true }
    });
    if (existingMember) {
      throw new ConflictException("User is already in this group");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.create({
        data: {
          groupId: request.groupId,
          userId: request.applicantId,
          role: "member",
          encryptedGroupKey,
          keyVersion
        }
      });
      return tx.groupJoinRequest.update({
        where: { id: requestId },
        data: { status: "accepted", respondedAt: new Date() },
        include: groupJoinRequestInclude
      });
    });

    this.realtime.joinUserSocketsToGroup(request.applicantId, request.groupId);
    this.realtime.emitToGroup(request.groupId, SocketEvents.GroupUpdated, {
      groupId: request.groupId,
      memberId: request.applicantId,
      action: "join-approved"
    });
    this.realtime.emitToUser(request.applicantId, SocketEvents.GroupUpdated, {
      groupId: request.groupId,
      action: "join-approved"
    });
    return presentGroupJoinRequest(updated);
  }

  async rejectJoinRequest(ownerId: string, requestId: string): Promise<GroupJoinRequestView> {
    const request = await this.getJoinRequestRecord(requestId);
    if (!request || request.group.ownerId !== ownerId || request.status !== "pending") {
      throw new NotFoundException("Pending join request not found");
    }

    const updated = await this.prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: "rejected", respondedAt: new Date() },
      include: groupJoinRequestInclude
    });
    this.realtime.emitToUser(request.applicantId, SocketEvents.GroupUpdated, {
      groupId: request.groupId,
      action: "join-rejected"
    });
    return presentGroupJoinRequest(updated);
  }

  async listInvites(userId: string): Promise<GroupInviteView[]> {
    const invites = await this.prisma.groupInvite.findMany({
      where: { inviteeId: userId, status: "pending" },
      include: groupInviteInclude,
      orderBy: { createdAt: "desc" }
    });
    return invites.map(presentGroupInvite);
  }

  async acceptInvite(userId: string, inviteId: string): Promise<GroupInviteView> {
    const invite = await this.getInviteRecord(inviteId);
    if (!invite || invite.inviteeId !== userId || invite.status !== "pending") {
      throw new NotFoundException("Pending group invite not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: invite.groupId,
            userId
          }
        },
        update: {
          encryptedGroupKey: invite.encryptedGroupKey,
          keyVersion: invite.keyVersion
        },
        create: {
          groupId: invite.groupId,
          userId,
          role: "member",
          encryptedGroupKey: invite.encryptedGroupKey,
          keyVersion: invite.keyVersion
        }
      });
      return tx.groupInvite.update({
        where: { id: inviteId },
        data: { status: "accepted", respondedAt: new Date() },
        include: groupInviteInclude
      });
    });

    this.realtime.joinUserSocketsToGroup(userId, invite.groupId);
    this.realtime.emitToGroup(invite.groupId, SocketEvents.GroupUpdated, {
      groupId: invite.groupId,
      memberId: userId,
      action: "accepted"
    });
    return presentGroupInvite(updated);
  }

  async rejectInvite(userId: string, inviteId: string): Promise<GroupInviteView> {
    const invite = await this.getInviteRecord(inviteId);
    if (!invite || invite.inviteeId !== userId || invite.status !== "pending") {
      throw new NotFoundException("Pending group invite not found");
    }

    const updated = await this.prisma.groupInvite.update({
      where: { id: inviteId },
      data: { status: "rejected", respondedAt: new Date() },
      include: groupInviteInclude
    });
    return presentGroupInvite(updated);
  }

  async isMember(userId: string, groupId: string): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true }
    });
    return Boolean(member);
  }

  private async assertMember(userId: string, groupId: string) {
    const member = await this.isMember(userId, groupId);
    if (!member) {
      throw new BadRequestException("You are not a member of this group");
    }
  }

  private async assertOwner(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true }
    });
    if (!group || group.ownerId !== userId) {
      throw new BadRequestException("Only the group owner can do this");
    }
  }

  private getGroupRecord(groupId: string) {
    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: groupInclude
    });
  }

  private getInviteRecord(inviteId: string) {
    return this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      include: groupInviteInclude
    });
  }

  private getJoinRequestRecord(requestId: string) {
    return this.prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
      include: groupJoinRequestInclude
    });
  }
}

const groupInclude = {
  members: {
    include: {
      user: true
    },
    orderBy: {
      joinedAt: "asc"
    }
  }
} as const;

const groupInviteInclude = {
  group: true,
  inviter: true,
  invitee: true
} as const;

const groupJoinRequestInclude = {
  group: true,
  applicant: true
} as const;

function presentGroup(group: NonNullable<GroupRecord>): GroupView {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt.toISOString(),
    members: group.members.map((member) => ({
      user: presentUser(member.user),
      role: member.role,
      encryptedGroupKey: member.encryptedGroupKey,
      keyVersion: member.keyVersion,
      joinedAt: member.joinedAt.toISOString()
    }))
  };
}

function presentGroupInvite(invite: GroupInviteRecord): GroupInviteView {
  return {
    id: invite.id,
    group: {
      id: invite.group.id,
      code: invite.group.code,
      name: invite.group.name,
      ownerId: invite.group.ownerId,
      createdAt: invite.group.createdAt.toISOString()
    },
    inviter: presentUser(invite.inviter),
    invitee: presentUser(invite.invitee),
    encryptedGroupKey: invite.encryptedGroupKey,
    keyVersion: invite.keyVersion,
    status: invite.status,
    createdAt: invite.createdAt.toISOString(),
    respondedAt: invite.respondedAt?.toISOString() ?? null
  };
}

function presentGroupJoinRequest(request: GroupJoinRequestRecord): GroupJoinRequestView {
  return {
    id: request.id,
    group: {
      id: request.group.id,
      code: request.group.code,
      name: request.group.name,
      ownerId: request.group.ownerId,
      createdAt: request.group.createdAt.toISOString()
    },
    applicant: presentUser(request.applicant),
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    respondedAt: request.respondedAt?.toISOString() ?? null
  };
}

function generateGroupCode(): string {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

function isUniqueConstraintError(error: unknown, target: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  return Array.isArray(error.meta?.target) && error.meta.target.includes(target);
}
