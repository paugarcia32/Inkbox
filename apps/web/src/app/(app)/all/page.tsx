'use client';

import { BottomUrlBar } from '@/components/bottom-url-bar';
import { FilterBar } from '@/components/filter-bar';
import { ItemRow } from '@/components/item-row';
import { ItemsSection } from '@/components/items-section';
import { ScrollSentinel } from '@/components/scroll-sentinel';
import { useKeyboardNav } from '@/contexts/keyboard-nav';
import { useInfiniteItems } from '@/hooks/use-infinite-items';
import { useItemFiltering } from '@/hooks/use-item-filtering';
import { useItemGrouping } from '@/hooks/use-item-grouping';
import { buildGroups } from '@/lib/grouping-utils';
import type { Item } from '@hako/types';
import { ChevronRightIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function AllPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { groupBy, setGroupBy, collapsedGroups, toggleGroup } = useItemGrouping();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { setItems, pendingFilterOpen, setPendingFilterOpen } = useKeyboardNav();

  const { sort, setSort, typeFilter, setTypeFilter } = useItemFiltering();

  const {
    items,
    isLoading,
    isFetching,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteItems({
    includeArchived: showArchived || undefined,
    typeFilter,
    sort,
    placeholderData: true,
    refetchInterval: (query: { state: { data: { pages: { items: Item[] }[] } | undefined } }) => {
      const allItems = query.state.data?.pages.flatMap((p) => p.items) ?? [];
      return allItems.some((item) => item.status === 'pending' || item.status === 'processing')
        ? 2000
        : false;
    },
  });

  const groups = groupBy !== 'none' ? buildGroups(items, groupBy) : null;

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
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((v) => !v)}
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
          <ItemsSection isLoading={isLoading} isFetching={isFetching}>
            {items.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <SquaresPlusIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  Nothing saved yet
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
                  Paste a link anywhere on this page to save it
                </p>
              </div>
            ) : groups ? (
              <>
                <div className="space-y-1">
                  {groups.map((group) => {
                    const collapsed = collapsedGroups.has(group.key);
                    return (
                      <div key={group.key}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex w-full items-center gap-1.5 py-1.5 text-left"
                        >
                          <ChevronRightIcon
                            className={[
                              'size-3 shrink-0 text-stone-400 transition-transform duration-150',
                              collapsed ? '' : 'rotate-90',
                            ].join(' ')}
                          />
                          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                            {group.label}
                          </span>
                          <div className="mx-2 h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                          <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
                            {group.items.length}
                          </span>
                        </button>
                        {!collapsed && (
                          <ul className="space-y-0.5">
                            {group.items.map((item) => (
                              <ItemRow
                                key={item.id}
                                item={item}
                                showCollection={groupBy !== 'collection'}
                                showArchivedBadge={showArchived}
                                hoveredId={hoveredId}
                                onHoverChange={setHoveredId}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
                <ScrollSentinel
                  onIntersect={fetchNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                />
              </>
            ) : (
              <>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      showCollection={true}
                      showArchivedBadge={showArchived}
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

      <BottomUrlBar />
    </>
  );
}
