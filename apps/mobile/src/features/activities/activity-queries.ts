import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

export type ActivitiesTab =
  'upcoming' | 'applications' | 'created' | 'past' | 'cancelled';

type ActivitiesList = components['schemas']['ActivitiesListDto'];

export function useMyActivities(tab: ActivitiesTab) {
  const client = useApiClient();
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: ['me', 'activities', tab],
    queryFn: async (): Promise<ActivitiesList> => {
      const result = await client.GET('/v1/me/activities', {
        params: { query: { tab, limit: 20 } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}
