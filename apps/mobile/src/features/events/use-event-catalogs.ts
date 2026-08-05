import { useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

export type City = components['schemas']['CityDto'];
export type Category = components['schemas']['CategoryDto'];

export function useEventCatalogs() {
  const client = useApiClient();
  const cities = useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<City[]> => {
      const result = await client.GET('/v1/cities');
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const result = await client.GET('/v1/categories');
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });

  return { cities, categories };
}
