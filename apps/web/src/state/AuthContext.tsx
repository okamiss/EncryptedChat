import type { AuthResponse, EncryptedMessageEnvelope, SafeUser } from "@encrypted-chat/shared";
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
import { appendLocalMessage, conversationKeyForEnvelope } from "../storage/localMessages";
import { getPrivateKeyRecord, savePrivateKeyRecord } from "../storage/privateKeyStore";

type PrivateKeyStatus = "locked" | "ready" | "missing";

interface AuthContextValue {
  token?: string;
  user?: SafeUser;
  privateKey?: CryptoKey;
  privateKeyStatus: PrivateKeyStatus;
  socket?: Socket;
  apiClient: api.ApiClient;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  unlockPrivateKey: (password: string) => Promise<void>;
  logout: () => void;
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

  const apiClient = useMemo(() => ({ token }), [token]);

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

  const refreshMe = useCallback(async () => {
    if (!token) {
      return;
    }
    const nextUser = await api.getMe({ token });
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, [token]);

  const logout = useCallback(() => {
    socket?.disconnect();
    setSocket(undefined);
    setToken(undefined);
    setUser(undefined);
    setPrivateKey(undefined);
    setPrivateKeyStatus("locked");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, [socket]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const nextSocket = createChatSocket(token);
    setSocket(nextSocket);

    const handleMessage = (envelope: EncryptedMessageEnvelope) => {
      const key = conversationKeyForEnvelope(envelope, user.id);
      appendLocalMessage(key, envelope);
    };
    nextSocket.on(SocketEvents.MessageNew, handleMessage);
    nextSocket.on("connect_error", () => {
      message.error("实时连接失败，请确认后端服务和 JWT 状态。");
    });

    return () => {
      nextSocket.off(SocketEvents.MessageNew, handleMessage);
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
        register,
        login,
        unlockPrivateKey,
        logout,
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
