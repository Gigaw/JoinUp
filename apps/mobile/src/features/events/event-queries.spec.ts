import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  useInfiniteQuery: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useInfiniteQuery: mocks.useInfiniteQuery,
  useQuery: mocks.useQuery,
}));

vi.mock('../../shared/api/use-api-client', () => ({
  useApiClient: () => ({ GET: mocks.get }),
}));

import { useEventList } from './event-queries';

type EventListQueryOptions = {
  queryFn: (context: {
    pageParam: string | undefined;
    signal: AbortSignal;
  }) => Promise<unknown>;
  queryKey: readonly unknown[];
  getNextPageParam: (page: {
    nextCursor?: string | null;
  }) => string | undefined;
};

describe('useEventList', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.useInfiniteQuery.mockReset().mockReturnValue({});
    mocks.useQuery.mockReset();
    mocks.get.mockResolvedValue({
      data: { items: [], nextCursor: null },
    });
  });

  it('normalizes the key, sends the cursor and forwards AbortSignal', async () => {
    useEventList(
      'city-id',
      ['category-b', 'category-a', 'category-a'],
      '  волейбол   вечером  ',
    );
    const options = mocks.useInfiniteQuery.mock.calls[0]?.[0] as
      EventListQueryOptions | undefined;
    expect(options?.queryKey).toEqual([
      'events',
      'list',
      'city-id',
      ['category-a', 'category-b'],
      'волейбол вечером',
    ]);

    const signal = new AbortController().signal;
    await options?.queryFn({ pageParam: 'opaque-cursor', signal });

    expect(mocks.get).toHaveBeenCalledWith('/v1/events', {
      signal,
      params: {
        query: {
          categoryIds: 'category-a,category-b',
          cityId: 'city-id',
          cursor: 'opaque-cursor',
          limit: 20,
          q: 'волейбол вечером',
        },
      },
    });
    expect(options?.getNextPageParam({ nextCursor: 'next' })).toBe('next');
    expect(options?.getNextPageParam({ nextCursor: null })).toBeUndefined();
  });

  it('omits q after the search field is cleared', async () => {
    useEventList('city-id', [], '   ');
    const options = mocks.useInfiniteQuery.mock.calls[0]?.[0] as
      EventListQueryOptions | undefined;

    await options?.queryFn({
      pageParam: undefined,
      signal: new AbortController().signal,
    });

    expect(mocks.get).toHaveBeenCalledWith(
      '/v1/events',
      expect.objectContaining({
        params: {
          query: { cityId: 'city-id', limit: 20 },
        },
      }),
    );
    expect(options?.queryKey.at(-1)).toBeUndefined();
  });
});
