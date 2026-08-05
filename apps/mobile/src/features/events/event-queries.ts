import { useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

type EventDetails = components['schemas']['EventDetailsDto'];

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

export function useEventList(cityId: string | undefined) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['events', 'list', cityId],
    enabled: Boolean(cityId),
    queryFn: async () => {
      if (!cityId) return { items: [], nextCursor: null };
      const result = await client.GET('/v1/events', {
        params: { query: { cityId, limit: 20 } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
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
