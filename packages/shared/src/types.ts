export type PublicJwk = JsonWebKey;

export type FriendRequestStatus = "pending" | "accepted" | "rejected";
export type GroupMemberRole = "owner" | "member";
export type ConversationType = "direct" | "group";
export type MessageType = "text" | "image";
export type FileScopeType = "direct" | "group";

export interface SafeUser {
  id: string;
  uid: string;
  username: string;
  publicKey: PublicJwk;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

export interface FriendRequestView {
  id: string;
  requester: SafeUser;
  addressee: SafeUser;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt?: string | null;
}

export interface FriendView extends SafeUser {
  friendshipId: string;
  friendshipCreatedAt: string;
}

export interface GroupMemberView {
  user: SafeUser;
  role: GroupMemberRole;
  encryptedGroupKey: string;
  keyVersion: number;
  joinedAt: string;
}

export interface GroupView {
  id: string;
  name: string;
  ownerId: string;
  members: GroupMemberView[];
  createdAt: string;
}

export interface GroupInviteView {
  id: string;
  group: Pick<GroupView, "id" | "name" | "ownerId" | "createdAt">;
  inviter: SafeUser;
  invitee: SafeUser;
  encryptedGroupKey: string;
  keyVersion: number;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt?: string | null;
}

export interface RegisterRequest {
  username: string;
  password: string;
  publicKey: PublicJwk;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateFriendRequestRequest {
  addresseeUid: string;
}

export interface CreateGroupRequest {
  groupName: string;
  encryptedGroupKey: string;
  keyVersion: number;
}

export interface CreateGroupInviteRequest {
  inviteeId: string;
  encryptedGroupKey: string;
  keyVersion: number;
}

export interface UploadEncryptedFileResponse {
  id: string;
  size: number;
  sha256: string;
  createdAt: string;
}

export interface EncryptedAttachmentRef {
  fileId: string;
  size: number;
  sha256: string;
}

export interface WrappedMessageKey {
  userId: string;
  wrappedKey: string;
}

export interface EncryptedMessageEnvelope {
  clientMessageId: string;
  conversationType: ConversationType;
  toUserId?: string;
  groupId?: string;
  fromUserId?: string;
  messageType: MessageType;
  ciphertext: string;
  iv: string;
  aad: string;
  wrappedKeys?: WrappedMessageKey[];
  groupKeyVersion?: number;
  attachment?: EncryptedAttachmentRef;
  sentAt?: string;
}

export interface MessageSentAck {
  clientMessageId: string;
  sentAt: string;
}

export interface MessageErrorPayload {
  clientMessageId?: string;
  message: string;
}

export interface PresencePayload {
  userId: string;
  online: boolean;
}
