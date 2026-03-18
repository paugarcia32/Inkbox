'use client';

import { useClickOutside } from '@/lib/use-click-outside';
import { trpc } from '@/lib/trpc';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getHostname } from '@hako/utils';
import { useRef, useState } from 'react';

interface Props {
  collectionId: string;
  existingItemIds: Set<string>;
  onClose: () => void;
}

export function AddItemsToCollectionPopover({ collectionId, existingItemIds, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.items.list.useQuery({ limit: 100, includeArchived: false });

  const addItem = trpc.collections.addItem.useMutation({
    onSuccess: () => {
      void utils.items.list.invalidate();
      void utils.collections.getById.invalidate({ id: collectionId });
    },
  });

  useClickOutside(ref, onClose);

  const available = (data?.items ?? []).filter((item) => !existingItemIds.has(item.id));
  const q = query.toLowerCase();
  const filtered = !q.trim()
    ? available
    : available.filter(
        (item) => item.title?.toLowerCase().includes(q) || item.url.toLowerCase().includes(q),
      );

  return (
    <div
      ref={ref}
      role="presentation"
      className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2.5 dark:border-stone-800">
        <MagnifyingGlassIcon className="size-3.5 shrink-0 text-stone-400" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400 dark:text-stone-100"
        />
      </div>

      {/* List */}
      <div className="max-h-64 overflow-y-auto py-1">
        {isLoading && <p className="px-3 py-2 text-xs text-stone-400">Loading…</p>}

        {!isLoading && filtered.length === 0 && (
          <p className="px-3 py-3 text-center text-xs text-stone-400">
            {query ? 'No items match your search' : 'All items are already in this collection'}
          </p>
        )}

        {filtered.map((item) => {
          const isPending = addItem.isPending && addItem.variables?.itemId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={addItem.isPending}
              onClick={() => addItem.mutate({ collectionId, itemId: item.id })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                {isPending ? (
                  <span className="size-2.5 animate-spin rounded-full border border-stone-400 border-t-transparent" />
                ) : (
                  <PlusIcon className="size-3 text-stone-400" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                  {item.title?.trim() || getHostname(item.url)}
                </span>
                <span className="block truncate text-xs text-stone-400 dark:text-stone-500">
                  {getHostname(item.url)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
