import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { GroupsService } from "./groups.service";

const owner = {
  id: "owner-1",
  uid: "1000000001",
  username: "owner",
  displayName: null,
  publicKey: { kty: "EC" },
  createdAt: new Date("2026-06-08T00:00:00.000Z")
};

const applicant = {
  id: "user-2",
  uid: "1000000002",
  username: "alice",
  displayName: "Cipher",
  publicKey: { kty: "EC" },
  createdAt: new Date("2026-06-08T00:00:00.000Z")
};

const admin = {
  id: "admin-1",
  uid: "1000000003",
  username: "admin",
  displayName: null,
  publicKey: { kty: "EC" },
  createdAt: new Date("2026-06-08T00:00:00.000Z")
};

describe("GroupsService", () => {
  it("creates a group with a public group code", async () => {
    const prisma = {
      group: {
        create: vi.fn().mockResolvedValue({
          id: "group-1",
          code: "1234567890",
          name: "Ops",
          ownerId: owner.id,
          createdAt: new Date("2026-06-08T00:00:00.000Z"),
          members: [
            {
              user: owner,
              role: "owner",
              encryptedGroupKey: "wrapped",
              keyVersion: 1,
              joinedAt: new Date("2026-06-08T00:00:00.000Z")
            }
          ]
        })
      }
    };
    const service = new GroupsService(prisma as never, { joinUserSocketsToGroup: vi.fn() } as never);

    const group = await service.create(owner.id, "Ops", "wrapped", 1);

    expect(prisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: expect.stringMatching(/^\d{10}$/)
        })
      })
    );
    expect(group.code).toBe("1234567890");
  });

  it("rejects a join request when the applicant is already a member", async () => {
    const prisma = {
      group: {
        findUnique: vi.fn().mockResolvedValue({
          id: "group-1",
          ownerId: owner.id
        })
      },
      groupMember: {
        findUnique: vi.fn().mockResolvedValue({ groupId: "group-1" })
      },
      groupJoinRequest: {
        findFirst: vi.fn(),
        create: vi.fn()
      }
    };
    const service = new GroupsService(prisma as never, { emitToUser: vi.fn() } as never);

    await expect(service.requestJoin(applicant.id, "1234567890")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.groupJoinRequest.create).not.toHaveBeenCalled();
  });

  it("lets the owner promote a member to admin", async () => {
    const prisma = {
      group: {
        findUnique: vi.fn().mockResolvedValue({ ownerId: owner.id }),
        update: vi.fn().mockResolvedValue({
          id: "group-1",
          code: "1234567890",
          name: "Ops",
          ownerId: owner.id,
          createdAt: new Date("2026-06-08T00:00:00.000Z"),
          members: [
            {
              user: owner,
              role: "owner",
              encryptedGroupKey: "owner-key",
              keyVersion: 1,
              joinedAt: new Date("2026-06-08T00:00:00.000Z")
            },
            {
              user: admin,
              role: "admin",
              encryptedGroupKey: "admin-key",
              keyVersion: 1,
              joinedAt: new Date("2026-06-08T00:00:00.000Z")
            }
          ]
        })
      },
      groupMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "member" }),
        update: vi.fn()
      }
    };
    const realtime = { emitToGroup: vi.fn() };
    const service = new GroupsService(prisma as never, realtime as never);

    await service.updateMemberRole(owner.id, "group-1", admin.id, "admin");

    expect(prisma.groupMember.update).toHaveBeenCalledWith({
      where: { groupId_userId: { groupId: "group-1", userId: admin.id } },
      data: { role: "admin" }
    });
    expect(realtime.emitToGroup).toHaveBeenCalledWith("group-1", expect.any(String), {
      groupId: "group-1",
      memberId: admin.id,
      action: "member-role-updated"
    });
  });

  it("lets an admin approve a join request", async () => {
    const request = {
      id: "request-1",
      groupId: "group-1",
      applicantId: applicant.id,
      status: "pending",
      createdAt: new Date("2026-06-08T00:00:00.000Z"),
      respondedAt: null,
      group: {
        id: "group-1",
        code: "1234567890",
        name: "Ops",
        ownerId: owner.id,
        createdAt: new Date("2026-06-08T00:00:00.000Z")
      },
      applicant
    };
    const prisma = {
      groupMember: {
        findUnique: vi.fn((args) => {
          const userId = args.where.groupId_userId.userId;
          if (userId === admin.id) {
            return Promise.resolve({ role: "admin" });
          }
          return Promise.resolve(null);
        }),
        create: vi.fn()
      },
      groupJoinRequest: {
        findUnique: vi.fn().mockResolvedValue(request),
        update: vi.fn().mockResolvedValue({ ...request, status: "accepted", respondedAt: new Date() })
      },
      $transaction: vi.fn(async (callback) => callback(prisma))
    };
    const service = new GroupsService(
      prisma as never,
      { joinUserSocketsToGroup: vi.fn(), emitToGroup: vi.fn(), emitToUser: vi.fn() } as never
    );

    const result = await service.approveJoinRequest(admin.id, request.id, "wrapped", 2);

    expect(result.status).toBe("accepted");
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: {
        groupId: "group-1",
        userId: applicant.id,
        role: "member",
        encryptedGroupKey: "wrapped",
        keyVersion: 2
      }
    });
  });

  it("lets an admin remove a regular member", async () => {
    const prisma = {
      groupMember: {
        findUnique: vi.fn((args) => {
          const userId = args.where.groupId_userId.userId;
          if (userId === admin.id) {
            return Promise.resolve({ role: "admin" });
          }
          if (userId === applicant.id) {
            return Promise.resolve({ role: "member" });
          }
          return Promise.resolve(null);
        }),
        delete: vi.fn()
      }
    };
    const realtime = { emitToGroup: vi.fn(), emitToUser: vi.fn() };
    const service = new GroupsService(prisma as never, realtime as never);

    await service.removeMember(admin.id, "group-1", applicant.id);

    expect(prisma.groupMember.delete).toHaveBeenCalledWith({
      where: { groupId_userId: { groupId: "group-1", userId: applicant.id } }
    });
  });

  it("lets the owner delete the group", async () => {
    const prisma = {
      group: {
        findUnique: vi.fn().mockResolvedValue({ ownerId: owner.id }),
        delete: vi.fn()
      }
    };
    const realtime = { emitToGroup: vi.fn() };
    const service = new GroupsService(prisma as never, realtime as never);

    await service.deleteGroup(owner.id, "group-1");

    expect(prisma.group.delete).toHaveBeenCalledWith({ where: { id: "group-1" } });
  });
});
