'use client';

import type { SortOption, TypeFilter } from '@/components/filter-bar';
import { trpc } from '@/lib/trpc';
import type { Item } from '@hako/types';
import { useMemo } from 'react';

type UseInfiniteItemsParams = {
  inboxOnly?: boolean;
  archivedOnly?: boolean;
  includeArchived?: boolean;
  collectionId?: string;
  typeFilter: TypeFilter;
  sort: SortOption;
  placeholderData?: boolean;
  refetchInterval?:
    | number
    | false
    | ((query: { state: { data: { pages: { items: Item[] }[] } | undefined } }) => number | false);
};

export function useInfiniteItems({
  inboxOnly,
  archivedOnly,
  includeArchived,
  collectionId,
  typeFilter,
  sort,
  placeholderData: usePlaceholderData,
  refetchInterval,
}: UseInfiniteItemsParams) {
  const sortDir = sort === 'date-asc' ? 'asc' : 'desc';
  const type = typeFilter !== 'all' ? typeFilter : undefined;

  const query = trpc.items.list.useInfiniteQuery(
    {
      limit: 50,
      inboxOnly,
      archivedOnly,
      includeArchived,
      collectionId,
      type,
      sortDir,
    },
    {
      initialCursor: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      ...(usePlaceholderData ? { placeholderData: (prev: unknown) => prev } : {}),
      ...(refetchInterval !== undefined ? { refetchInterval } : {}),
    },
  );

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const items = useMemo(() => {
    if (sort !== 'alpha-asc' && sort !== 'alpha-desc') return allItems;
    return [...allItems].sort((a, b) => {
      const ta = (a.title?.trim() || a.url).toLowerCase();
      const tb = (b.title?.trim() || b.url).toLowerCase();
      return sort === 'alpha-asc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });
  }, [allItems, sort]);

  return {
    items,
    isLoading: query.isLoading,
    // Don't dim the list while fetching next pages — the sentinel spinner handles that
    isFetching: query.isFetching && !query.isFetchingNextPage,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
