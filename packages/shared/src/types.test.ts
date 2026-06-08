import { describe, expect, it } from "vitest";
import { SocketEvents } from "./socket-events";

describe("SocketEvents", () => {
  it("keeps the realtime message event names stable", () => {
    expect(SocketEvents.MessageSend).toBe("message:send");
    expect(SocketEvents.MessageNew).toBe("message:new");
    expect(SocketEvents.MessageRecall).toBe("message:recall");
    expect(SocketEvents.MessageRecalled).toBe("message:recalled");
  });
});
