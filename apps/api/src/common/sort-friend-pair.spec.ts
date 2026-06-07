import { describe, expect, it } from "vitest";
import { sortFriendPair } from "./sort-friend-pair";

describe("sortFriendPair", () => {
  it("returns a stable friendship pair order", () => {
    expect(sortFriendPair("b", "a")).toEqual(["a", "b"]);
    expect(sortFriendPair("a", "b")).toEqual(["a", "b"]);
  });
});
