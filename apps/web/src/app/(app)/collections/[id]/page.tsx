'use client';

import { BottomUrlBar } from '@/components/bottom-url-bar';
import { ItemDetailPanel } from '@/components/item-detail-panel';
import { ItemRow } from '@/components/item-row';
import { trpc } from '@/lib/trpc';
import type { Item } from '@inkbox/types';
import { COLLECTION_COLORS } from '@inkbox/types';
import { ArrowLeftIcon, InboxIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { use, useState } from 'react';

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: collection } = trpc.collections.getById.useQuery({ id });
  const { data, isLoading, isError, refetch } = trpc.items.list.useQuery(
    { collectionId: id },
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

  const colorHex = collection
    ? (COLLECTION_COLORS.find((c) => c.id === collection.color)?.hex ?? '#78716c')
    : '#78716c';

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/collections"
            className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>

          {collection && (
            <>
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colorHex }}
              />
              <h1 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                {collection.name}
              </h1>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {collection.itemCount}
              </span>
            </>
          )}
        </div>

        {isLoading && (
          <ul className="space-y-0.5">
            {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((skId) => (
              <li
                key={skId}
                className="h-10 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800"
              />
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
            <InboxIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
              No items in this collection
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
              Add items using the folder icon on any saved link
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
