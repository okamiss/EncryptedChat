import { SocketEvents } from "@encrypted-chat/shared";
import { describe, expect, it, vi } from "vitest";
import { FriendsService } from "./friends.service";

const requester = user("requester-1", "requester");
const addressee = user("addressee-1", "addressee");

describe("FriendsService", () => {
  it("notifies both users that their friend lists changed when a request is accepted", async () => {
    const request = {
      id: "request-1",
      requesterId: requester.id,
      addresseeId: addressee.id,
      requester,
      addressee,
      status: "pending" as const,
      createdAt: new Date("2026-06-08T10:00:00Z"),
      respondedAt: null
    };
    const updated = { ...request, status: "accepted" as const, respondedAt: new Date("2026-06-08T10:01:00Z") };
    const tx = {
      friendship: { upsert: vi.fn().mockResolvedValue(undefined) },
      friendRequest: { update: vi.fn().mockResolvedValue(updated) }
    };
    const prisma = {
      friendRequest: { findUnique: vi.fn().mockResolvedValue(request) },
      $transaction: vi.fn((callback) => callback(tx))
    };
    const realtime = { emitToUser: vi.fn() };
    const service = new FriendsService(prisma as never, realtime as never);

    await service.accept(addressee.id, request.id);

    expect(realtime.emitToUser).toHaveBeenCalledWith(requester.id, SocketEvents.FriendUpdated, {
      userId: addressee.id,
      action: "accepted"
    });
    expect(realtime.emitToUser).toHaveBeenCalledWith(addressee.id, SocketEvents.FriendUpdated, {
      userId: requester.id,
      action: "accepted"
    });
  });
});

function user(id: string, username: string) {
  return {
    id,
    uid: `${username}-uid`,
    username,
    displayName: null,
    publicKey: { kty: "RSA" },
    createdAt: new Date("2026-06-01T00:00:00Z")
  };
}
