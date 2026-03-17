'use client';

import { BottomUrlBar } from '@/components/bottom-url-bar';
import { ItemDetailPanel } from '@/components/item-detail-panel';
import { ItemRow } from '@/components/item-row';
import { trpc } from '@/lib/trpc';
import type { Item } from '@inkbox/types';
import { InboxArrowDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function InboxPage() {
  const { data, isLoading, isError, refetch } = trpc.items.list.useQuery(
    { inboxOnly: true },
    {
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

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        {isLoading && (
          <ul className="space-y-0.5">
            {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((id) => (
              <li key={id} className="h-10 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
            ))}
          </ul>
        )}

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

        {data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <InboxArrowDownIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
              No unsorted items
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
              Paste a link anywhere on this page to save it
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <ul className="space-y-0.5">
            {data.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                showCollection={false}
                onOpen={setSelectedItem}
                hoveredId={hoveredId}
                onHoverChange={setHoveredId}
              />
            ))}
          </ul>
        )}
      </div>

      <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      <BottomUrlBar />
    </>
  );
}
