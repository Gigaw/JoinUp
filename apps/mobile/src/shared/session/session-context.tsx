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

type SessionEnvelope = components['schemas']['SessionEnvelopeDto'];

interface SessionContextValue {
  token: string | null;
  restoring: boolean;
  register: (input: {
    email: string;
    password: string;
    birthDate: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'vmeste.session-token';
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    void SecureStore.getItemAsync(TOKEN_KEY)
      .then(setToken)
      .catch(() => setToken(null))
      .finally(() => setRestoring(false));
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; birthDate: string }) => {
      const client = createApiClient(getApiBaseUrl());
      const { data, error } = await client.POST('/v1/auth/register', {
        body: input,
      });
      if (!data) throw toAppError(error ?? responseError({ error }));
      const session: SessionEnvelope = data;
      await SecureStore.setItemAsync(TOKEN_KEY, session.sessionToken);
      setToken(session.sessionToken);
    },
    [],
  );

  const logout = useCallback(async () => {
    if (token) {
      const client = createApiClient(getApiBaseUrl(), token);
      await client.POST('/v1/auth/logout').catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  }, [token]);

  const value = useMemo(
    () => ({ token, restoring, register, logout }),
    [logout, register, restoring, token],
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
