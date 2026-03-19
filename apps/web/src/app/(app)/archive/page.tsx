'use client';

import { BottomUrlBar } from '@/components/bottom-url-bar';
import { FilterBar } from '@/components/filter-bar';
import { ItemRow } from '@/components/item-row';
import { ItemsSection } from '@/components/items-section';
import { ScrollSentinel } from '@/components/scroll-sentinel';
import { useKeyboardNav } from '@/contexts/keyboard-nav';
import { useInfiniteItems } from '@/hooks/use-infinite-items';
import { useItemFiltering } from '@/hooks/use-item-filtering';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function ArchivePage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { setItems, pendingFilterOpen, setPendingFilterOpen } = useKeyboardNav();

  const { sort, setSort, typeFilter, setTypeFilter } = useItemFiltering();

  const { items, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useInfiniteItems({
      archivedOnly: true,
      typeFilter,
      sort,
    });

  useEffect(() => {
    setItems(items);
    return () => setItems([]);
  }, [items, setItems]);

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
            <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load archive.</p>
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
                <ArchiveBoxIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  Archive is empty
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
                  Archived items will appear here
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      showCollection={true}
                      hoveredId={hoveredId}
                      onHoverChange={setHoveredId}
                    />
                  ))}
                </ul>
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

      <BottomUrlBar inboxOnlyMessage />
    </>
  );
}
