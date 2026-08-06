import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';

type ChatList = components['schemas']['ChatListDto'];
type MessageList = components['schemas']['EventMessageListDto'];

export function useMyChats() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['me', 'chats'],
    queryFn: async (): Promise<ChatList> => {
      const result = await client.GET('/v1/me/chats', {
        params: { query: { limit: 30 } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    refetchInterval: 30_000,
  });
}

export function useEventMessages(eventId: string) {
  const client = useApiClient();
  return useInfiniteQuery({
    queryKey: ['events', 'messages', eventId],
    enabled: Boolean(eventId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<MessageList> => {
      const result = await client.GET('/v1/events/{eventId}/messages', {
        params: {
          path: { eventId },
          query: { cursor: pageParam, limit: 30 },
        },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 15_000,
  });
}
