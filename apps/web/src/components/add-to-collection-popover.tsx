'use client';

import { getCollectionIcon } from '@/lib/collection-icons';
import { trpc } from '@/lib/trpc';
import { CheckIcon } from '@heroicons/react/24/outline';
import type { Item } from '@inkbox/types';
import { COLLECTION_COLORS } from '@inkbox/types';
import { useEffect, useRef } from 'react';

interface AddToCollectionPopoverProps {
  item: Item;
  onClose: () => void;
}

export function AddToCollectionPopover({ item, onClose }: AddToCollectionPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.collections.list.useQuery({});

  const addItem = trpc.collections.addItem.useMutation({
    onSuccess: () => {
      void utils.items.list.invalidate();
      onClose();
    },
  });

  const removeItem = trpc.collections.removeItem.useMutation({
    onSuccess: () => {
      void utils.items.list.invalidate();
      onClose();
    },
  });

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const inCollectionIds = new Set(item.collections?.map((c) => c.collectionId) ?? []);

  return (
    <div
      ref={ref}
      role="presentation"
      className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {isLoading && <p className="px-3 py-2 text-xs text-stone-400">Loading…</p>}

      {data?.collections.length === 0 && (
        <p className="px-3 py-2 text-xs text-stone-400">No collections yet</p>
      )}

      {data?.collections.map((collection) => {
        const isIn = inCollectionIds.has(collection.id);
        const isPending = addItem.isPending || removeItem.isPending;
        return (
          <button
            key={collection.id}
            type="button"
            disabled={isPending}
            onClick={() => {
              if (isIn) {
                removeItem.mutate({ collectionId: collection.id, itemId: item.id });
              } else {
                addItem.mutate({ collectionId: collection.id, itemId: item.id });
              }
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <span className="flex size-4 shrink-0 items-center justify-center">
              {isIn && <CheckIcon className="size-3.5 text-accent-500" />}
              {!isIn &&
                (() => {
                  const hex =
                    COLLECTION_COLORS.find((c) => c.id === collection.color)?.hex ?? '#78716c';
                  const IconComp = getCollectionIcon(collection.icon);
                  return IconComp ? (
                    <IconComp className="size-3.5" style={{ color: hex }} />
                  ) : (
                    <span className="size-2 rounded-full" style={{ background: hex }} />
                  );
                })()}
            </span>
            <span className="truncate">{collection.name}</span>
          </button>
        );
      })}
    </div>
  );
}
