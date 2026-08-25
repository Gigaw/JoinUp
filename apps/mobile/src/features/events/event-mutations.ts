import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@vmeste/api-client';
import { responseError, toAppError } from '../../shared/api/error';
import { useApiClient } from '../../shared/api/use-api-client';
import type { CreateEventBody, UpdateEventBody } from './event-form-schema';
import {
  beginPendingMutation,
  completePendingMutation,
  shouldKeepPendingMutation,
} from './pending-mutation-store';

type EventDetails = components['schemas']['EventDetailsDto'];

export type EventImageUpload = {
  fileName: string;
  mimeType: string;
  uri: string;
};

export function useCreateEventMutation(actorId: string | undefined) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const operation = `events.create:${actorId ?? 'anonymous'}`;
  return useMutation({
    mutationFn: (body: CreateEventBody) =>
      runPendingMutation(operation, body, async (key) => {
        const result = await client.POST('/v1/events', {
          body,
          params: { header: { 'Idempotency-Key': key } },
        });
        if (!result.data) throw toAppError(responseError(result));
        return result.data;
      }),
    onSuccess: async (event) => {
      queryClient.setQueryData<EventDetails>(
        ['events', 'detail', event.id],
        event,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['me', 'activities'] }),
      ]);
    },
  });
}

export function useUpdateEventMutation(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEventBody) =>
      runPendingMutation(`events.update:${eventId}`, body, async (key) => {
        const result = await client.PATCH('/v1/events/{eventId}', {
          body,
          params: {
            header: { 'Idempotency-Key': key },
            path: { eventId },
          },
        });
        if (!result.data) throw toAppError(responseError(result));
        return result.data;
      }),
    onSuccess: async (event) => {
      queryClient.setQueryData<EventDetails>(
        ['events', 'detail', eventId],
        event,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['me', 'activities'] }),
      ]);
    },
  });
}

export function useCancelEventMutation(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      runPendingMutation(
        `events.cancel:${eventId}`,
        { eventId },
        async (key) => {
          const result = await client.POST('/v1/events/{eventId}/cancel', {
            params: {
              header: { 'Idempotency-Key': key },
              path: { eventId },
            },
          });
          if (!result.data) throw toAppError(responseError(result));
          return result.data;
        },
      ),
    onSuccess: async (event) => {
      queryClient.setQueryData<EventDetails>(
        ['events', 'detail', eventId],
        event,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['me', 'activities'] }),
      ]);
    },
  });
}

export function useUploadEventImageMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      image,
    }: {
      eventId: string;
      image: EventImageUpload;
    }) =>
      runPendingMutation(
        `events.image.replace:${eventId}`,
        image,
        async (key) => {
          const body = new FormData();
          body.append('image', {
            uri: image.uri,
            name: image.fileName,
            type: image.mimeType,
          } as never);
          const result = await client.PUT('/v1/events/{eventId}/image', {
            body: body as never,
            params: {
              header: { 'Idempotency-Key': key },
              path: { eventId },
            },
          });
          if (!result.data) throw toAppError(responseError(result));
          return result.data;
        },
      ),
    onSuccess: async (event) => {
      queryClient.setQueryData<EventDetails>(
        ['events', 'detail', event.id],
        event,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['me', 'activities'] }),
      ]);
    },
  });
}

export function useJoinEventMutation(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await client.PUT('/v1/events/{eventId}/participation', {
        params: { path: { eventId } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', 'detail', eventId],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
      ]);
    },
  });
}

export function useLeaveEventMutation(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await client.DELETE('/v1/events/{eventId}/participation', {
        params: { path: { eventId } },
      });
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', 'detail', eventId],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
      ]);
    },
  });
}

export function useDecideEventApplicationMutation(eventId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      decision,
      participationId,
    }: {
      decision: 'approve' | 'reject';
      participationId: string;
    }) => {
      const result = await client.PUT(
        '/v1/events/{eventId}/applications/{participationId}/decision',
        {
          body: { decision },
          params: { path: { eventId, participationId } },
        },
      );
      if (!result.data) throw toAppError(responseError(result));
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', 'detail', eventId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['events', 'applications', eventId],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', 'list'] }),
      ]);
    },
  });
}

async function runPendingMutation<T>(
  operation: string,
  payload: unknown,
  request: (idempotencyKey: string) => Promise<T>,
): Promise<T> {
  const pending = await beginPendingMutation(operation, payload);
  try {
    const result = await request(pending.idempotencyKey);
    await completePendingMutation(operation, pending.idempotencyKey);
    return result;
  } catch (error) {
    const appError = toAppError(error);
    if (!shouldKeepPendingMutation(appError)) {
      await completePendingMutation(operation, pending.idempotencyKey);
    }
    throw appError;
  }
}
