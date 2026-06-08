import type { AuthResponse, EncryptedMessageEnvelope, MessageRecallPayload, SafeUser } from "@encrypted-chat/shared";
import { SocketEvents } from "@encrypted-chat/shared";
import { App } from "antd";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  decryptPrivateKeyFromStorage,
  encryptPrivateKeyForStorage,
  exportPrivateKey,
  exportPublicKey,
  generateIdentityKeyPair
} from "../crypto/keys";
import * as api from "../services/api";
import { createChatSocket } from "../services/socket";
import {
  appendLocalMessage,
  conversationKeyForEnvelope,
  conversationKeyForRecall,
  hasLocalMessage,
  removeLocalMessage
} from "../storage/localMessages";
import { createPrivateKeyBackup, parsePrivateKeyBackup } from "../storage/privateKeyBackup";
import { getPrivateKeyRecord, savePrivateKeyRecord } from "../storage/privateKeyStore";
import {
  addUnreadConversation,
  clearUnreadConversation,
  getUnreadConversationCounts
} from "../storage/unreadConversations";

type PrivateKeyStatus = "locked" | "ready" | "missing";

interface AuthContextValue {
  token?: string;
  user?: SafeUser;
  privateKey?: CryptoKey;
  privateKeyStatus: PrivateKeyStatus;
  socket?: Socket;
  apiClient: api.ApiClient;
  unreadConversationKeys: string[];
  unreadConversationCounts: Record<string, number>;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  unlockPrivateKey: (password: string) => Promise<void>;
  exportPrivateKeyBackup: () => Promise<string>;
  importPrivateKeyBackup: (backupText: string, password: string) => Promise<void>;
  logout: () => void;
  markConversationRead: (conversationKey: string) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "encrypted-chat:token";
const USER_KEY = "encrypted-chat:user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { message } = App.useApp();
  const [token, setToken] = useState<string | undefined>(() => localStorage.getItem(TOKEN_KEY) ?? undefined);
  const [user, setUser] = useState<SafeUser | undefined>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SafeUser) : undefined;
  });
  const [privateKey, setPrivateKey] = useState<CryptoKey | undefined>();
  const [privateKeyStatus, setPrivateKeyStatus] = useState<PrivateKeyStatus>("locked");
  const [socket, setSocket] = useState<Socket | undefined>();
  const [unreadConversationCounts, setUnreadConversationCounts] = useState<Record<string, number>>({});

  const apiClient = useMemo(() => ({ token }), [token]);
  const unreadConversationKeys = useMemo(() => Object.keys(unreadConversationCounts), [unreadConversationCounts]);

  const storeSession = useCallback((auth: AuthResponse) => {
    setToken(auth.accessToken);
    setUser(auth.user);
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      const keyPair = await generateIdentityKeyPair();
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const auth = await api.register({ username, password, publicKey });
      const privateJwk = await exportPrivateKey(keyPair.privateKey);
      const encryptedPrivateKey = await encryptPrivateKeyForStorage(privateJwk, password);
      await savePrivateKeyRecord({
        userId: auth.user.id,
        publicKey,
        createdAt: new Date().toISOString(),
        ...encryptedPrivateKey
      });

      storeSession(auth);
      setPrivateKey(keyPair.privateKey);
      setPrivateKeyStatus("ready");
    },
    [storeSession]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const auth = await api.login({ username, password });
      storeSession(auth);

      const record = await getPrivateKeyRecord(auth.user.id);
      if (!record) {
        setPrivateKey(undefined);
        setPrivateKeyStatus("missing");
        message.warning("当前浏览器没有这个账号的私钥，无法解密历史消息。");
        return;
      }

      const unlocked = await decryptPrivateKeyFromStorage(record, password);
      setPrivateKey(unlocked);
      setPrivateKeyStatus("ready");
    },
    [message, storeSession]
  );

  const unlockPrivateKey = useCallback(
    async (password: string) => {
      if (!user) {
        return;
      }
      const record = await getPrivateKeyRecord(user.id);
      if (!record) {
        setPrivateKeyStatus("missing");
        throw new Error("当前浏览器没有保存私钥");
      }
      const unlocked = await decryptPrivateKeyFromStorage(record, password);
      setPrivateKey(unlocked);
      setPrivateKeyStatus("ready");
    },
    [user]
  );

  const exportPrivateKeyBackup = useCallback(async () => {
    if (!user) {
      throw new Error("请先登录");
    }
    const record = await getPrivateKeyRecord(user.id);
    if (!record) {
      throw new Error("当前浏览器没有保存私钥，无法导出备份");
    }
    return createPrivateKeyBackup(record);
  }, [user]);

  const importPrivateKeyBackup = useCallback(
    async (backupText: string, password: string) => {
      if (!user) {
        throw new Error("请先登录");
      }
      const record = parsePrivateKeyBackup(backupText, user.id);
      if (!publicKeysMatch(record.publicKey, user.publicKey)) {
        throw new Error("备份文件的公钥与当前账号不匹配");
      }
      const unlocked = await decryptPrivateKeyFromStorage(record, password);
      await savePrivateKeyRecord(record);
      setPrivateKey(unlocked);
      setPrivateKeyStatus("ready");
    },
    [user]
  );

  const refreshMe = useCallback(async () => {
    if (!token) {
      return;
    }
    const nextUser = await api.getMe({ token });
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, [token]);

  const markConversationRead = useCallback(
    (conversationKey: string) => {
      if (!user) {
        return;
      }
      setUnreadConversationCounts(clearUnreadConversation(user.id, conversationKey));
    },
    [user]
  );

  const logout = useCallback(() => {
    socket?.disconnect();
    setSocket(undefined);
    setToken(undefined);
    setUser(undefined);
    setPrivateKey(undefined);
    setPrivateKeyStatus("locked");
    setUnreadConversationCounts({});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, [socket]);

  useEffect(() => {
    setUnreadConversationCounts(user ? getUnreadConversationCounts(user.id) : {});
  }, [user]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    let cancelled = false;
    void api
      .listMessages({ token })
      .then((messages) => {
        if (cancelled) {
          return;
        }
        let nextUnread = getUnreadConversationCounts(user.id);
        for (const envelope of messages) {
          const key = conversationKeyForEnvelope(envelope, user.id);
          const isNew = !hasLocalMessage(key, envelope.clientMessageId);
          appendLocalMessage(key, envelope);
          if (isNew && envelope.fromUserId !== user.id) {
            nextUnread = addUnreadConversation(user.id, key);
          }
        }
        setUnreadConversationCounts(nextUnread);
      })
      .catch(() => {
        message.warning("离线消息同步失败，稍后会在重新登录时再尝试。");
      });

    return () => {
      cancelled = true;
    };
  }, [message, token, user]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const nextSocket = createChatSocket(token);
    setSocket(nextSocket);

    const handleMessage = (envelope: EncryptedMessageEnvelope) => {
      const key = conversationKeyForEnvelope(envelope, user.id);
      appendLocalMessage(key, envelope);
      if (envelope.fromUserId !== user.id) {
        setUnreadConversationCounts(addUnreadConversation(user.id, key));
      }
    };
    const handleMessageRecalled = (payload: MessageRecallPayload) => {
      const key = conversationKeyForRecall(payload, user.id);
      removeLocalMessage(key, payload.clientMessageId);
    };
    nextSocket.on(SocketEvents.MessageNew, handleMessage);
    nextSocket.on(SocketEvents.MessageRecalled, handleMessageRecalled);
    nextSocket.on("connect_error", () => {
      message.error("实时连接失败，请确认后端服务和 JWT 状态。");
    });

    return () => {
      nextSocket.off(SocketEvents.MessageNew, handleMessage);
      nextSocket.off(SocketEvents.MessageRecalled, handleMessageRecalled);
      nextSocket.disconnect();
      setSocket(undefined);
    };
  }, [message, token, user]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        privateKey,
        privateKeyStatus,
        socket,
        apiClient,
        unreadConversationKeys,
        unreadConversationCounts,
        register,
        login,
        unlockPrivateKey,
        exportPrivateKeyBackup,
        importPrivateKeyBackup,
        logout,
        markConversationRead,
        refreshMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

function publicKeysMatch(a: JsonWebKey, b: JsonWebKey): boolean {
  return a.kty === b.kty && a.e === b.e && a.n === b.n;
}
