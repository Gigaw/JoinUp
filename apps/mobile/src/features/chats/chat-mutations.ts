import { useMutation, useQueryClient } from '@tanstack/react-query';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';
import {
  beginPendingMutation,
  completePendingMutation,
  shouldKeepPendingMutation,
} from '../events/pending-mutation-store';

export function useCreateMessageMutation(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const operation = `events.messages.create:${eventId}`;
      const pending = await beginPendingMutation(operation, { text });
      try {
        const result = await client.POST('/v1/events/{eventId}/messages', {
          body: { text },
          params: {
            path: { eventId },
            header: { 'Idempotency-Key': pending.idempotencyKey },
          },
        });
        if (!result.data) throw toAppError(responseError(result));
        await completePendingMutation(operation, pending.idempotencyKey);
        return result.data;
      } catch (error) {
        const appError = toAppError(error);
        if (!shouldKeepPendingMutation(appError)) {
          await completePendingMutation(operation, pending.idempotencyKey);
        }
        throw appError;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', 'messages', eventId],
        }),
        queryClient.invalidateQueries({ queryKey: ['me', 'chats'] }),
      ]);
    },
  });
}
