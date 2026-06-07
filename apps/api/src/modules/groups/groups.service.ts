import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { GroupInviteView, GroupView } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { presentUser } from "../../common/user-presenter";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeEventsService } from "../realtime/realtime-events.service";

type GroupRecord = Awaited<ReturnType<GroupsService["getGroupRecord"]>>;
type GroupInviteRecord = NonNullable<Awaited<ReturnType<GroupsService["getInviteRecord"]>>>;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEventsService
  ) {}

  async create(ownerId: string, groupName: string, encryptedGroupKey: string, keyVersion: number): Promise<GroupView> {
    const group = await this.prisma.group.create({
      data: {
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

function presentGroup(group: NonNullable<GroupRecord>): GroupView {
  return {
    id: group.id,
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
