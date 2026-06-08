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
});
