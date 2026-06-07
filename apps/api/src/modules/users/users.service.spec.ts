import { describe, expect, it, vi } from "vitest";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  it("updates a trimmed display name", async () => {
    const prisma = {
      user: {
        update: vi.fn().mockResolvedValue({
          id: "user-1",
          uid: "1000000001",
          username: "alice",
          displayName: "Cipher",
          publicKey: { kty: "EC" },
          createdAt: new Date("2026-06-08T00:00:00.000Z")
        })
      }
    };
    const service = new UsersService(prisma as never);

    const user = await service.updateDisplayName("user-1", "  Cipher  ");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { displayName: "Cipher" }
    });
    expect(user.displayName).toBe("Cipher");
  });

  it("stores a blank display name as null", async () => {
    const prisma = {
      user: {
        update: vi.fn().mockResolvedValue({
          id: "user-1",
          uid: "1000000001",
          username: "alice",
          displayName: null,
          publicKey: { kty: "EC" },
          createdAt: new Date("2026-06-08T00:00:00.000Z")
        })
      }
    };
    const service = new UsersService(prisma as never);

    const user = await service.updateDisplayName("user-1", "   ");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { displayName: null }
    });
    expect(user.displayName).toBeNull();
  });
});
