import type {
  AuthResponse,
  ApproveGroupJoinRequestRequest,
  CreateFriendRequestRequest,
  CreateGroupInviteRequest,
  CreateGroupJoinRequestRequest,
  EncryptedMessageEnvelope,
  CreateGroupRequest,
  FriendRequestView,
  FriendView,
  GroupInviteView,
  GroupJoinRequestView,
  GroupView,
  LoginRequest,
  RegisterRequest,
  SafeUser,
  UpdateGroupMemberRoleRequest,
  UpdateGroupRequest,
  UploadEncryptedFileResponse
} from "@encrypted-chat/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export interface ApiClient {
  token?: string;
}

export function register(body: RegisterRequest) {
  return request<AuthResponse>("/auth/register", { method: "POST", body });
}

export function login(body: LoginRequest) {
  return request<AuthResponse>("/auth/login", { method: "POST", body });
}

export function getMe(client: ApiClient) {
  return request<SafeUser>("/users/me", { client });
}

export function updatePublicKey(client: ApiClient, publicKey: JsonWebKey) {
  return request<SafeUser>("/users/me/public-key", { method: "PATCH", body: { publicKey }, client });
}

export function updateDisplayName(client: ApiClient, displayName?: string | null) {
  return request<SafeUser>("/users/me/display-name", { method: "PATCH", body: { displayName }, client });
}

export function findUserByUid(client: ApiClient, uid: string) {
  return request<SafeUser>(`/users/by-uid/${encodeURIComponent(uid)}`, { client });
}

export function createFriendRequest(client: ApiClient, body: CreateFriendRequestRequest) {
  return request<FriendRequestView>("/friend-requests", { method: "POST", body, client });
}

export function listIncomingFriendRequests(client: ApiClient) {
  return request<FriendRequestView[]>("/friend-requests/incoming", { client });
}

export function listOutgoingFriendRequests(client: ApiClient) {
  return request<FriendRequestView[]>("/friend-requests/outgoing", { client });
}

export function acceptFriendRequest(client: ApiClient, id: string) {
  return request<FriendRequestView>(`/friend-requests/${id}/accept`, { method: "POST", client });
}

export function rejectFriendRequest(client: ApiClient, id: string) {
  return request<FriendRequestView>(`/friend-requests/${id}/reject`, { method: "POST", client });
}

export function listFriends(client: ApiClient) {
  return request<FriendView[]>("/friends", { client });
}

export function deleteFriend(client: ApiClient, id: string) {
  return request<void>(`/friends/${id}`, { method: "DELETE", client });
}

export function createGroup(client: ApiClient, body: CreateGroupRequest) {
  return request<GroupView>("/groups", { method: "POST", body, client });
}

export function listGroups(client: ApiClient) {
  return request<GroupView[]>("/groups", { client });
}

export function getGroup(client: ApiClient, id: string) {
  return request<GroupView>(`/groups/${id}`, { client });
}

export function updateGroup(client: ApiClient, id: string, body: UpdateGroupRequest) {
  return request<GroupView>(`/groups/${id}`, { method: "PATCH", body, client });
}

export function deleteGroup(client: ApiClient, id: string) {
  return request<void>(`/groups/${id}`, { method: "DELETE", client });
}

export function updateGroupMemberRole(
  client: ApiClient,
  groupId: string,
  userId: string,
  body: UpdateGroupMemberRoleRequest
) {
  return request<GroupView>(`/groups/${groupId}/members/${userId}/role`, { method: "PATCH", body, client });
}

export function removeGroupMember(client: ApiClient, groupId: string, userId: string) {
  return request<void>(`/groups/${groupId}/members/${userId}`, { method: "DELETE", client });
}

export function createGroupInvite(client: ApiClient, groupId: string, body: CreateGroupInviteRequest) {
  return request<GroupInviteView>(`/groups/${groupId}/invites`, { method: "POST", body, client });
}

export function listGroupJoinRequests(client: ApiClient, groupId: string) {
  return request<GroupJoinRequestView[]>(`/groups/${groupId}/join-requests`, { client });
}

export function createGroupJoinRequest(client: ApiClient, body: CreateGroupJoinRequestRequest) {
  return request<GroupJoinRequestView>("/group-join-requests", { method: "POST", body, client });
}

export function approveGroupJoinRequest(client: ApiClient, id: string, body: ApproveGroupJoinRequestRequest) {
  return request<GroupJoinRequestView>(`/group-join-requests/${id}/approve`, { method: "POST", body, client });
}

export function rejectGroupJoinRequest(client: ApiClient, id: string) {
  return request<GroupJoinRequestView>(`/group-join-requests/${id}/reject`, { method: "POST", client });
}

export function listGroupInvites(client: ApiClient) {
  return request<GroupInviteView[]>("/group-invites", { client });
}

export function listMessages(client: ApiClient) {
  return request<EncryptedMessageEnvelope[]>("/messages", { client });
}

export function acceptGroupInvite(client: ApiClient, id: string) {
  return request<GroupInviteView>(`/group-invites/${id}/accept`, { method: "POST", client });
}

export function rejectGroupInvite(client: ApiClient, id: string) {
  return request<GroupInviteView>(`/group-invites/${id}/reject`, { method: "POST", client });
}

export function uploadEncryptedFile(
  client: ApiClient,
  file: Blob,
  metadata: { scopeType: "direct" | "group"; targetUserId?: string; groupId?: string; sha256: string }
) {
  const formData = new FormData();
  formData.append("file", file, "encrypted-image.bin");
  formData.append("scopeType", metadata.scopeType);
  formData.append("sha256", metadata.sha256);
  if (metadata.targetUserId) {
    formData.append("targetUserId", metadata.targetUserId);
  }
  if (metadata.groupId) {
    formData.append("groupId", metadata.groupId);
  }
  return request<UploadEncryptedFileResponse>("/files/encrypted", {
    method: "POST",
    formData,
    client
  });
}

export async function downloadEncryptedFile(client: ApiClient, fileId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/encrypted`, {
    headers: authHeaders(client)
  });
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  return response.blob();
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    formData?: FormData;
    client?: ApiClient;
  } = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...authHeaders(options.client),
      ...(options.formData ? {} : { "Content-Type": "application/json" })
    },
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined)
  });

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function authHeaders(client?: ApiClient): HeadersInit {
  return client?.token ? { Authorization: `Bearer ${client.token}` } : {};
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message) ? body.message.join(", ") : body.message || response.statusText;
  } catch {
    return response.statusText;
  }
}
