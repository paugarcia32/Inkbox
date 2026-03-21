'use client';

import { ItemListSkeleton } from '@/components/item-list-skeleton';
import { ScrollSentinel } from '@/components/scroll-sentinel';
import { useInfiniteShareCollection } from '@/hooks/use-infinite-share-collection';
import { getCollectionIcon } from '@/lib/collection-icons';
import { COLLECTION_COLORS } from '@hako/types';
import { getFaviconUrl, getHostname } from '@hako/utils';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface ReadOnlyItemRowProps {
  item: {
    id: string;
    url: string;
    title: string | null;
  };
}

function ReadOnlyItemRow({ item }: ReadOnlyItemRowProps) {
  const [faviconError, setFaviconError] = useState(false);
  const favicon = getFaviconUrl(item.url);
  const hostname = getHostname(item.url);

  return (
    <li className="flex h-10 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-stone-100/70 dark:hover:bg-stone-800/60">
      {/* biome-ignore lint/a11y/useAnchorContent: aria-label provides accessible content */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${item.title ?? item.url}`}
        className="absolute inset-0 rounded-lg"
      />

      {/* Favicon */}
      <div className="flex size-4 shrink-0 items-center justify-center">
        {favicon && !faviconError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            width={16}
            height={16}
            className="size-4 rounded-sm"
            onError={() => setFaviconError(true)}
          />
        ) : (
          <GlobeAltIcon className="size-4 text-stone-400" />
        )}
      </div>

      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 hover:underline dark:text-stone-100"
      >
        {item.title?.trim() || hostname}
      </a>

      {/* Domain */}
      <span className="ml-3 shrink-0 text-xs text-stone-400 dark:text-stone-500">{hostname}</span>
    </li>
  );
}

interface ShareCollectionViewProps {
  token: string;
}

export function ShareCollectionView({ token }: ShareCollectionViewProps) {
  const { collection, items, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteShareCollection(token);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700" />
        </div>
        <ItemListSkeleton count={8} />
      </div>
    );
  }

  if (isError || !collection) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
            This collection is not available.
          </p>
        </div>
      </div>
    );
  }

  const colorHex = COLLECTION_COLORS.find((c) => c.id === collection.color)?.hex ?? '#78716c';
  const CollectionIcon = getCollectionIcon(collection.icon);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        {CollectionIcon ? (
          <CollectionIcon className="size-6 shrink-0" style={{ color: colorHex }} />
        ) : (
          <span className="size-3 shrink-0 rounded-full" style={{ background: colorHex }} />
        )}
        <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">
          {collection.name}
        </h1>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500">No items in this collection.</p>
      ) : (
        <ul className="relative space-y-0.5">
          {items.map((item) => (
            <ReadOnlyItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <ScrollSentinel
        onIntersect={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />
    </div>
  );
}
