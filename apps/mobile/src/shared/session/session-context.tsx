import { createApiClient, type components } from '@vmeste/api-client';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getApiBaseUrl } from '../api/config';
import { responseError, toAppError } from '../api/error';
import { queryClient } from '../query/query-provider';
import {
  parseSession,
  serializeSession,
  type StoredSession,
} from './session-storage';

type SessionEnvelope = components['schemas']['SessionEnvelopeDto'];

interface SessionContextValue {
  token: string | null;
  restoring: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    birthDate: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  invalidateSession: () => Promise<void>;
}

const TOKEN_KEY = 'vmeste.session-token';
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const token = session?.token ?? null;

  useEffect(() => {
    void SecureStore.getItemAsync(TOKEN_KEY)
      .then(async (value) => {
        const restored = parseSession(value);
        if (value && !restored) await SecureStore.deleteItemAsync(TOKEN_KEY);
        setSession(restored);
      })
      .catch(() => setSession(null))
      .finally(() => setRestoring(false));
  }, []);

  const establishSession = useCallback(async (envelope: SessionEnvelope) => {
    const stored = {
      token: envelope.sessionToken,
      expiresAt: envelope.expiresAt,
    };
    await SecureStore.setItemAsync(TOKEN_KEY, serializeSession(stored));
    queryClient.clear();
    setSession(stored);
  }, []);

  const invalidateSession = useCallback(async () => {
    setSession(null);
    queryClient.clear();
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; birthDate: string }) => {
      const client = createApiClient(getApiBaseUrl());
      const { data, error } = await client.POST('/v1/auth/register', {
        body: input,
      });
      if (!data) throw toAppError(error ?? responseError({ error }));
      await establishSession(data);
    },
    [establishSession],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const client = createApiClient(getApiBaseUrl());
      const { data, error } = await client.POST('/v1/auth/login', {
        body: input,
      });
      if (!data) throw toAppError(error ?? responseError({ error }));
      await establishSession(data);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        const client = createApiClient(getApiBaseUrl(), token);
        await client.POST('/v1/auth/logout').catch(() => undefined);
      }
    } finally {
      await invalidateSession();
    }
  }, [invalidateSession, token]);

  const value = useMemo(
    () => ({ token, restoring, login, register, logout, invalidateSession }),
    [invalidateSession, login, logout, register, restoring, token],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
