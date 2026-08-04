import { useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../api/error';
import { useApiClient } from '../api/use-api-client';
import { useSession } from '../session/session-context';

export type Me = components['schemas']['MeDto'];

export function useMe() {
  const client = useApiClient();
  const { token } = useSession();
  return useQuery({
    queryKey: ['me'],
    enabled: Boolean(token),
    retry: false,
    queryFn: async (): Promise<Me> => {
      const result = await client.GET('/v1/me');
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}
