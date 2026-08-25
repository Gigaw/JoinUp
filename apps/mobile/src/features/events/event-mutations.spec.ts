import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('../../shared/api/use-api-client', () => ({
  useApiClient: () => ({ POST: vi.fn() }),
}));

vi.mock('./pending-mutation-store', () => ({
  beginPendingMutation: vi.fn(),
  completePendingMutation: vi.fn(),
  shouldKeepPendingMutation: vi.fn(),
}));

import { useCreateEventMutation } from './event-mutations';

describe('useCreateEventMutation', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset().mockResolvedValue(undefined);
    mocks.setQueryData.mockReset();
    mocks.useMutation
      .mockReset()
      .mockImplementation((options: unknown): unknown => options);
  });

  it('updates the detail cache and invalidates event and activity lists', async () => {
    useCreateEventMutation('actor-id');
    const options = mocks.useMutation.mock.calls[0]?.[0] as {
      onSuccess: (event: { id: string }) => Promise<void>;
    };

    await options.onSuccess({ id: 'event-id' });

    expect(mocks.setQueryData).toHaveBeenCalledWith(
      ['events', 'detail', 'event-id'],
      { id: 'event-id' },
    );
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['events', 'list'],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['me', 'activities'],
    });
  });
});
