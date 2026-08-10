import { useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

export type City = components['schemas']['CityDto'];

export function useCities() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<City[]> => {
      const result = await client.GET('/v1/cities');
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}
