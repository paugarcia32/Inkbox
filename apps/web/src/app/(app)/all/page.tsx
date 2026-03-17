'use client';

import { BottomUrlBar } from '@/components/bottom-url-bar';
import { FilterBar } from '@/components/filter-bar';
import type { GroupBy, SortOption, TypeFilter } from '@/components/filter-bar';
import { ItemDetailPanel } from '@/components/item-detail-panel';
import { ItemsSection } from '@/components/items-section';
import { ItemRow } from '@/components/item-row';
import { trpc } from '@/lib/trpc';
import type { Item } from '@inkbox/types';
import { ChevronRightIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

type Group = { key: string; label: string; items: Item[] };

function getDateBucket(dateStr: string): string {
  const itemDate = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekStart = new Date(today.getTime() - today.getDay() * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

  if (itemDay >= today) return 'Today';
  if (itemDay >= yesterday) return 'Yesterday';
  if (itemDay >= weekStart) return 'This week';
  if (itemDay >= monthStart) return 'This month';
  return 'Older';
}

const DATE_BUCKET_ORDER = ['Today', 'Yesterday', 'This week', 'This month', 'Older'];

function buildGroups(items: Item[], groupBy: GroupBy): Group[] {
  if (groupBy === 'date') {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const bucket = getDateBucket(item.createdAt);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(item);
    }
    return DATE_BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      key: b,
      label: b,
      items: map.get(b)!,
    }));
  }

  if (groupBy === 'collection') {
    const map = new Map<string, { label: string; items: Item[] }>();
    for (const item of items) {
      const cols = item.collections;
      if (!cols || cols.length === 0) {
        if (!map.has('__none__')) map.set('__none__', { label: 'No collection', items: [] });
        map.get('__none__')!.items.push(item);
      } else {
        // Appear in every collection the item belongs to
        for (const col of cols) {
          if (!map.has(col.collectionId)) map.set(col.collectionId, { label: col.collectionName, items: [] });
          map.get(col.collectionId)!.items.push(item);
        }
      }
    }
    const groups: Group[] = [];
    for (const [key, { label, items: groupItems }] of map) {
      if (key !== '__none__') groups.push({ key, label, items: groupItems });
    }
    groups.sort((a, b) => a.label.localeCompare(b.label));
    if (map.has('__none__')) {
      groups.push({ key: '__none__', label: 'No collection', items: map.get('__none__')!.items });
    }
    return groups;
  }

  return [];
}

export default function AllPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching, isError, refetch } = trpc.items.list.useQuery(
    { includeArchived: showArchived || undefined },
    {
      placeholderData: (prev) => prev,
      refetchInterval: (query) =>
        query.state.data?.items.some(
          (item) => item.status === 'pending' || item.status === 'processing',
        )
          ? 2000
          : false,
    },
  );
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

  const groups = useMemo(
    () => (groupBy !== 'none' ? buildGroups(items, groupBy) : null),
    [items, groupBy],
  );

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleGroupByChange(v: GroupBy) {
    setGroupBy(v);
    setCollapsedGroups(new Set());
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        <FilterBar
          sort={sort}
          onSortChange={setSort}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          groupBy={groupBy}
          onGroupByChange={handleGroupByChange}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((v) => !v)}
        />

        {isError && (
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
        )}

        <ItemsSection isLoading={isLoading} isFetching={isFetching}>
          {items.length === 0 ? (
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
                            onOpen={setSelectedItem}
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
      <BottomUrlBar />
    </>
  );
}
