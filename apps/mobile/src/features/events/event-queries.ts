import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';
import { normalizeSearchQuery } from './search-utils';

type EventDetails = components['schemas']['EventDetailsDto'];
type EventList = components['schemas']['EventListDto'];

export function useEventDetails(eventId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['events', 'detail', eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<EventDetails> => {
      const result = await client.GET('/v1/events/{eventId}', {
        params: { path: { eventId } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}

export function useEventList(
  cityId: string | undefined,
  categoryIds: readonly string[] = [],
  searchQuery = '',
) {
  const client = useApiClient();
  const normalizedCategoryIds = [...new Set(categoryIds)].sort();
  const normalizedSearchQuery = normalizeSearchQuery(searchQuery) || undefined;
  return useInfiniteQuery({
    queryKey: [
      'events',
      'list',
      cityId,
      normalizedCategoryIds,
      normalizedSearchQuery,
    ],
    enabled: Boolean(cityId),
    placeholderData: keepPreviousData,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }): Promise<EventList> => {
      if (!cityId) return { items: [], nextCursor: null };
      const result = await client.GET('/v1/events', {
        signal,
        params: {
          query: {
            cityId,
            limit: 20,
            ...(pageParam ? { cursor: pageParam } : {}),
            ...(normalizedCategoryIds.length > 0
              ? { categoryIds: normalizedCategoryIds.join(',') }
              : {}),
            ...(normalizedSearchQuery ? { q: normalizedSearchQuery } : {}),
          },
        },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useEventApplications(eventId: string, enabled: boolean) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['events', 'applications', eventId, 'pending'],
    enabled: Boolean(eventId) && enabled,
    queryFn: async () => {
      const result = await client.GET('/v1/events/{eventId}/applications', {
        params: {
          path: { eventId },
          query: { status: 'pending' },
        },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
  });
}
