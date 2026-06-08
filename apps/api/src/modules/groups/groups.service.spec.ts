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
});
