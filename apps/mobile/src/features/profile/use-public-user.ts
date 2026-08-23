import { useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

export type PublicUser = components['schemas']['PublicUserDto'];

export function usePublicUser(userId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['users', 'public', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<PublicUser> => {
      const result = await client.GET('/v1/users/{userId}', {
        params: { path: { userId } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}
