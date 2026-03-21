'use client';

import { trpc } from '@/lib/trpc';

type ShareItem = {
  id: string;
  url: string;
  title: string | null;
};

export function useInfiniteShareCollection(token: string) {
  const query = trpc.collections.byShareToken.useInfiniteQuery(
    { token, limit: 50 },
    {
      initialCursor: undefined,
      getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    },
  );

  const collection = query.data?.pages[0]?.collection ?? null;
  const items = (query.data?.pages.flatMap((page) => page?.items ?? []) ?? []) as ShareItem[];

  return {
    collection,
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
