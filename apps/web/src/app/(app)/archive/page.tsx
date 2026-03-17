'use client';

import { FilterBar } from '@/components/filter-bar';
import type { SortOption, TypeFilter } from '@/components/filter-bar';
import { ItemDetailPanel } from '@/components/item-detail-panel';
import { ItemsSection } from '@/components/items-section';
import { ItemRow } from '@/components/item-row';
import { trpc } from '@/lib/trpc';
import type { Item } from '@inkbox/types';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

export default function ArchivePage() {
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const { data, isLoading, isError, refetch } = trpc.items.list.useQuery({
    archivedOnly: true,
  });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const items = useMemo(() => {
    let result = data?.items ?? [];
    if (typeFilter !== 'all') {
      result = result.filter((item) => item.type === typeFilter);
    }
    return [...result].sort((a, b) => {
      if (sort === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      const ta = (a.title?.trim() || a.url).toLowerCase();
      const tb = (b.title?.trim() || b.url).toLowerCase();
      return sort === 'alpha-asc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });
  }, [data?.items, sort, typeFilter]);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        <FilterBar
          sort={sort}
          onSortChange={setSort}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />

        {isError && (
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
        )}

        <ItemsSection isLoading={isLoading}>
          {items.length === 0 ? (
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
            <ul className="space-y-0.5">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  showCollection={true}
                  onOpen={setSelectedItem}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                />
              ))}
            </ul>
          )}
        </ItemsSection>
      </div>

      <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
