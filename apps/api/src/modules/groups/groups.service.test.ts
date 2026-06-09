import { BadRequestException } from "@nestjs/common";
import { SocketEvents } from "@encrypted-chat/shared";
import { describe, expect, it, vi } from "vitest";
import { GroupsService } from "./groups.service";

describe("GroupsService", () => {
  it("allows a regular member to remove their own membership", async () => {
    const prisma = {
      groupMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "member" }),
        delete: vi.fn().mockResolvedValue(undefined)
      }
    };
    const realtime = { emitToGroup: vi.fn(), emitToUser: vi.fn() };
    const service = new GroupsService(prisma as never, realtime as never);

    await service.removeMember("user-1", "group-1", "user-1");

    expect(prisma.groupMember.delete).toHaveBeenCalledWith({
      where: { groupId_userId: { groupId: "group-1", userId: "user-1" } }
    });
    expect(realtime.emitToGroup).toHaveBeenCalledWith("group-1", SocketEvents.GroupUpdated, {
      groupId: "group-1",
      memberId: "user-1",
      action: "member-left"
    });
  });

  it("does not allow the owner to leave through member removal", async () => {
    const prisma = {
      groupMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "owner" }),
        delete: vi.fn()
      }
    };
    const service = new GroupsService(prisma as never, { emitToGroup: vi.fn(), emitToUser: vi.fn() } as never);

    await expect(service.removeMember("owner-1", "group-1", "owner-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.groupMember.delete).not.toHaveBeenCalled();
  });

  it("allows a group admin to update the group name", async () => {
    const updatedGroup = groupRecord({ id: "group-1", ownerId: "owner-1", name: "New name" });
    const prisma = {
      groupMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "admin" })
      },
      group: {
        findUnique: vi.fn().mockResolvedValue({ ownerId: "owner-1" }),
        update: vi.fn().mockResolvedValue(updatedGroup)
      }
    };
    const realtime = { emitToGroup: vi.fn() };
    const service = new GroupsService(prisma as never, realtime as never);

    const result = await service.updateName("admin-1", "group-1", "  New name  ");

    expect(result.name).toBe("New name");
    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: { name: "New name" },
      include: expect.any(Object)
    });
    expect(realtime.emitToGroup).toHaveBeenCalledWith("group-1", SocketEvents.GroupUpdated, {
      groupId: "group-1",
      action: "renamed"
    });
  });
});

function groupRecord(overrides: { id: string; ownerId: string; name: string }) {
  const now = new Date("2026-06-09T08:00:00.000Z");
  return {
    id: overrides.id,
    code: "1234567890",
    name: overrides.name,
    ownerId: overrides.ownerId,
    createdAt: now,
    members: [
      {
        user: {
          id: overrides.ownerId,
          uid: "OWNER1111",
          username: "owner",
          displayName: null,
          publicKey: {},
          passwordHash: "hash",
          createdAt: now
        },
        role: "owner",
        encryptedGroupKey: "encrypted-key",
        keyVersion: 1,
        joinedAt: now
      }
    ]
  };
}
