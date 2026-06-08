import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FriendsService } from "./friends.service";

describe("FriendsService", () => {
  it("lets either friend remove the shared friendship", async () => {
    const prisma = {
      friendship: {
        findUnique: vi.fn().mockResolvedValue({ id: "friendship-1" }),
        delete: vi.fn()
      }
    };
    const realtime = { emitToUser: vi.fn() };
    const service = new FriendsService(prisma as never, realtime as never);

    await service.remove("user-b", "user-a");

    expect(prisma.friendship.delete).toHaveBeenCalledWith({ where: { id: "friendship-1" } });
    expect(realtime.emitToUser).toHaveBeenCalledWith("user-a", expect.any(String), {
      userId: "user-b",
      action: "removed"
    });
  });

  it("rejects removing a non-friend", async () => {
    const prisma = {
      friendship: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn()
      }
    };
    const service = new FriendsService(prisma as never, { emitToUser: vi.fn() } as never);

    await expect(service.remove("user-a", "user-b")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.friendship.delete).not.toHaveBeenCalled();
  });
});
