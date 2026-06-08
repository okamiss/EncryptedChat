export const SocketEvents = {
  MessageSend: "message:send",
  MessageNew: "message:new",
  MessageSent: "message:sent",
  MessageRecall: "message:recall",
  MessageRecalled: "message:recalled",
  MessageError: "message:error",
  PresenceUpdate: "presence:update",
  FriendRequest: "friend:request",
  FriendAccepted: "friend:accepted",
  GroupInvite: "group:invite",
  GroupUpdated: "group:updated"
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
