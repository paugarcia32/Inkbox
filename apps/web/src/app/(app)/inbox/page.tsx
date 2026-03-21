'use client';

import { BottomUrlBar } from '@/components/bottom-url-bar';
import { FilterBar } from '@/components/filter-bar';
import { ItemsSection } from '@/components/items-section';
import { ScrollSentinel } from '@/components/scroll-sentinel';
import { VirtualItemList } from '@/components/virtual-item-list';
import { useKeyboardNav } from '@/contexts/keyboard-nav';
import { useInfiniteItems } from '@/hooks/use-infinite-items';
import { useItemFiltering } from '@/hooks/use-item-filtering';
import type { Item } from '@hako/types';
import { InboxArrowDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

const MAX_POLL_ATTEMPTS = 15; // ~2 min max (2s+4s+8s+16s+30s×10)

const isPending = (item: Item) => item.status === 'pending' || item.status === 'processing';

export default function InboxPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { setItems, pendingFilterOpen, setPendingFilterOpen } = useKeyboardNav();

  const { sort, setSort, typeFilter, setTypeFilter } = useItemFiltering();

  const [pollAttempts, setPollAttempts] = useState(0);

  const { items, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useInfiniteItems({
      inboxOnly: true,
      typeFilter,
      sort,
      refetchInterval: (query: { state: { data: { pages: { items: Item[] }[] } | undefined } }) => {
        const allItems = query.state.data?.pages.flatMap((p) => p.items) ?? [];
        if (!allItems.some(isPending) || pollAttempts >= MAX_POLL_ATTEMPTS) return false;
        return Math.min(2000 * 2 ** pollAttempts, 30_000);
      },
    });

  useEffect(() => {
    setItems(items);
    return () => setItems([]);
  }, [items, setItems]);

  useEffect(() => {
    if (items.some(isPending)) {
      setPollAttempts((prev) => Math.min(prev + 1, MAX_POLL_ATTEMPTS));
    } else {
      setPollAttempts(0);
    }
  }, [items]);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        <FilterBar
          sort={sort}
          onSortChange={setSort}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          pendingFilterOpen={pendingFilterOpen}
          onFilterOpened={() => setPendingFilterOpen(null)}
        />

        {isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load items.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-sm font-medium text-accent-500 hover:text-accent-600"
            >
              Try again
            </button>
          </div>
        ) : (
          <ItemsSection isLoading={isLoading}>
            {items.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <InboxArrowDownIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  No unsorted items
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
                  Paste a link anywhere on this page to save it
                </p>
              </div>
            ) : (
              <>
                <VirtualItemList
                  items={items}
                  showCollection={false}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                />
                <ScrollSentinel
                  onIntersect={fetchNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                />
              </>
            )}
          </ItemsSection>
        )}
      </div>

      <BottomUrlBar />
    </>
  );
}
