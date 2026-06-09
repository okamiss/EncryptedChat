import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import * as bcrypt from "bcrypt";
import { UsersService } from "./users.service";

vi.mock("bcrypt", () => ({
  compare: vi.fn(),
  hash: vi.fn()
}));

describe("UsersService", () => {
  it("updates the password hash when the current password matches", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("new-hash" as never);
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ passwordHash: "old-hash" }),
        update: vi.fn().mockResolvedValue(userRecord())
      }
    };
    const service = new UsersService(prisma as never);

    await service.updatePassword("user-1", "old-password", "new-password");

    expect(bcrypt.compare).toHaveBeenCalledWith("old-password", "old-hash");
    expect(bcrypt.hash).toHaveBeenCalledWith("new-password", 12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "new-hash" }
    });
  });

  it("rejects password updates when the current password is wrong", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ passwordHash: "old-hash" }),
        update: vi.fn()
      }
    };
    const service = new UsersService(prisma as never);

    await expect(service.updatePassword("user-1", "wrong-password", "new-password")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

function userRecord() {
  return {
    id: "user-1",
    uid: "USER111111",
    username: "alice",
    displayName: null,
    publicKey: {},
    passwordHash: "new-hash",
    createdAt: new Date("2026-06-09T08:00:00.000Z")
  };
}
