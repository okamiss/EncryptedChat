import type { SafeUser } from "@encrypted-chat/shared";

type UserRecord = {
  id: string;
  uid: string;
  username: string;
  publicKey: unknown;
  createdAt: Date;
};

export function presentUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    uid: user.uid,
    username: user.username,
    publicKey: user.publicKey as JsonWebKey,
    createdAt: user.createdAt.toISOString()
  };
}
