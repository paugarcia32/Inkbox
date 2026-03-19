'use client';

import { AddItemsToCollectionPopover } from '@/components/add-items-to-collection-popover';
import { AddSectionButton } from '@/components/add-section-button';
import { BottomUrlBar } from '@/components/bottom-url-bar';
import { FilterBar, type ViewMode } from '@/components/filter-bar';
import { ItemRow } from '@/components/item-row';
import { ItemsSection } from '@/components/items-section';
import { ScrollSentinel } from '@/components/scroll-sentinel';
import { SectionedItemList } from '@/components/sectioned-item-list';
import { useKeyboardNav } from '@/contexts/keyboard-nav';
import { useInfiniteItems } from '@/hooks/use-infinite-items';
import { useItemFiltering } from '@/hooks/use-item-filtering';
import { getCollectionIcon } from '@/lib/collection-icons';
import { trpc } from '@/lib/trpc';
import { COLLECTION_COLORS } from '@hako/types';
import type { Item } from '@hako/types';
import { ArrowLeftIcon, InboxIcon, PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('sections');
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const addBtnRef = useRef<HTMLDivElement>(null);

  const { data: collection } = trpc.collections.getById.useQuery({ id });
  const { data: sections = [] } = trpc.sections.list.useQuery({ collectionId: id });

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
    collectionId: id,
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

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { setItems } = useKeyboardNav();

  const colorHex = collection
    ? (COLLECTION_COLORS.find((c) => c.id === collection.color)?.hex ?? '#78716c')
    : '#78716c';

  const existingItemIds = new Set(items.map((i) => i.id));

  useEffect(() => {
    setItems(items);
    return () => setItems([]);
  }, [items, setItems]);

  const hasSections = sections.length > 0;

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/collections"
            className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>

          {collection &&
            (() => {
              const IconComp = getCollectionIcon(collection.icon);
              return (
                <>
                  {IconComp ? (
                    <IconComp className="size-4 shrink-0" style={{ color: colorHex }} />
                  ) : (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: colorHex }}
                    />
                  )}
                  <h1 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {collection.name}
                  </h1>
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {collection.itemCount}
                  </span>
                </>
              );
            })()}

          {/* Add items + Add section buttons */}
          <div className="ml-auto flex items-center gap-2">
            <AddSectionButton collectionId={id} />

            <div ref={addBtnRef} className="relative">
              <button
                type="button"
                onClick={() => setAddPopoverOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800"
              >
                <PlusIcon className="size-3.5" />
                Add items
              </button>

              {addPopoverOpen && (
                <AddItemsToCollectionPopover
                  collectionId={id}
                  existingItemIds={existingItemIds}
                  onClose={() => setAddPopoverOpen(false)}
                />
              )}
            </div>
          </div>
        </div>

        <FilterBar
          sort={sort}
          onSortChange={setSort}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          viewMode={hasSections ? viewMode : undefined}
          onViewModeChange={hasSections ? setViewMode : undefined}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((v) => !v)}
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
            {items.length === 0 && sections.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <InboxIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  No items in this collection
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
                  Use the "Add items" button above or the folder icon on any saved link
                </p>
              </div>
            ) : hasSections && viewMode === 'sections' ? (
              <>
                <SectionedItemList
                  collectionId={id}
                  sections={sections}
                  items={items}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                />
                <ScrollSentinel
                  onIntersect={fetchNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                />
              </>
            ) : (
              <>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const sectionName =
                      hasSections && item.sectionId
                        ? sections.find((s) => s.id === item.sectionId)?.name
                        : undefined;
                    return (
                      <ItemRow
                        key={item.id}
                        item={item}
                        showCollection={false}
                        showArchivedBadge={showArchived}
                        sectionName={sectionName}
                        hoveredId={hoveredId}
                        onHoverChange={setHoveredId}
                      />
                    );
                  })}
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

      <BottomUrlBar collectionId={id} collectionName={collection?.name} />
    </>
  );
}
