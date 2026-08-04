import { createApiClient } from '@vmeste/api-client';
import { useMemo } from 'react';
import { useSession } from '../session/session-context';
import { getApiBaseUrl } from './config';

export function useApiClient() {
  const { token, invalidateSession } = useSession();
  return useMemo(
    () =>
      createApiClient(
        getApiBaseUrl(),
        token,
        token ? invalidateSession : undefined,
      ),
    [invalidateSession, token],
  );
}
