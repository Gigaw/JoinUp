import { useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

export type ActivitiesScope =
  'plans' | 'organizing' | 'archive' | 'organizing_archive';

type ActivitiesList = components['schemas']['ActivitiesListDto'];

export function useMyActivities(scope: ActivitiesScope) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['me', 'activities', scope],
    queryFn: async (): Promise<ActivitiesList> => {
      const result = await client.GET('/v1/me/activities', {
        params: { query: { scope, limit: 20 } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}

export function usePendingApplications() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['me', 'applications', 'pending'],
    queryFn: async (): Promise<ActivitiesList> => {
      const result = await client.GET('/v1/me/applications', {
        params: { query: { limit: 20 } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}
