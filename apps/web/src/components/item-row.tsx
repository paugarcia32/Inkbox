'use client';

import { AddToCollectionPopover } from '@/components/add-to-collection-popover';
import { trpc } from '@/lib/trpc';
import type { Item } from '@inkbox/types';
import { COLLECTION_COLORS } from '@inkbox/types';
import { ArchiveBoxIcon, FolderPlusIcon, GlobeAltIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRef, useState } from 'react';

function getFaviconUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface HoverCardProps {
  item: Item;
  top: number;
  left: number;
}

function ItemHoverCard({ item, top, left }: HoverCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        transform: 'translateY(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
      }}
      className="w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900"
    >
      {/* Thumbnail — only render if imageUrl exists AND hasn't errored */}
      {item.imageUrl && !imgError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-28 w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}

      <div className="p-3">
        <p className="text-xs font-semibold leading-snug text-stone-800 line-clamp-2 dark:text-stone-100">
          {item.title?.trim() || getHostname(item.url)}
        </p>

        {item.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500 line-clamp-3 dark:text-stone-400">
            {item.description}
          </p>
        )}

        <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
          {getHostname(item.url)}
        </p>
      </div>
    </div>
  );
}

interface ItemRowProps {
  item: Item;
  showCollection?: boolean;
  onOpen: (item: Item) => void;
  /** ID of whichever item is currently hovered in the list (managed by parent) */
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
}

export function ItemRow({
  item,
  showCollection = false,
  onOpen,
  hoveredId,
  onHoverChange,
}: ItemRowProps) {
  const utils = trpc.useUtils();
  const [faviconError, setFaviconError] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);

  const archive = trpc.items.archive.useMutation({
    onSuccess: () => void utils.items.list.invalidate(),
  });

  const deleteItem = trpc.items.delete.useMutation({
    onSuccess: () => void utils.items.list.invalidate(),
  });

  const favicon = getFaviconUrl(item.url);
  const hostname = getHostname(item.url);
  const firstCollection = item.collections?.[0];

  const isHovered = hoveredId === item.id;
  const isDimmed = hoveredId !== null && !isHovered;

  function handleMouseEnter() {
    onHoverChange(item.id);
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      setCardPos({ top: rect.top + rect.height / 2, left: rect.right + 16 });
    }
  }

  function handleMouseLeave() {
    onHoverChange(null);
    setCardPos(null);
  }

  return (
    <li
      ref={rowRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={[
        'relative flex h-10 items-center gap-3 rounded-lg px-2',
        'transition-all duration-200 ease-out',
        isDimmed ? 'opacity-40 scale-y-[0.97]' : 'opacity-100 scale-y-100',
        isHovered ? 'translate-x-0.5 bg-stone-100/70 dark:bg-stone-800/60' : '',
      ].join(' ')}
    >
      {/* Full-row click target — sits behind all interactive children */}
      <button
        type="button"
        aria-label={`Open ${item.title ?? item.url}`}
        onClick={() => onOpen(item)}
        className="absolute inset-0 cursor-pointer rounded-lg"
      />

      <div className="relative flex h-10 w-full items-center gap-3">
        {/* Hover action icons — visible only when this row is hovered */}
        <div
          className={[
            'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
            isHovered ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {/* Archive */}
          <button
            type="button"
            title="Archive"
            disabled={archive.isPending || item.isArchived}
            onClick={(e) => {
              e.stopPropagation();
              archive.mutate({ id: item.id });
            }}
            className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-600 disabled:opacity-30 dark:hover:bg-stone-700/60 dark:hover:text-stone-300"
          >
            <ArchiveBoxIcon className="size-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            title="Delete"
            disabled={deleteItem.isPending}
            onClick={(e) => {
              e.stopPropagation();
              deleteItem.mutate({ id: item.id });
            }}
            className="rounded p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <TrashIcon className="size-3.5" />
          </button>

          {/* Add to collection */}
          <div className="relative">
            <button
              type="button"
              title="Add to collection"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverOpen((v) => !v);
              }}
              className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-600 dark:hover:bg-stone-700/60 dark:hover:text-stone-300"
            >
              <FolderPlusIcon className="size-3.5" />
            </button>

            {popoverOpen && (
              <AddToCollectionPopover item={item} onClose={() => setPopoverOpen(false)} />
            )}
          </div>
        </div>

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

        {/* Title — direct link to the saved URL */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 truncate text-sm"
        >
          <span className="font-medium text-stone-800 hover:underline dark:text-stone-100">
            {item.title?.trim() || hostname}
          </span>
        </a>

        {/* Domain */}
        <span className="ml-3 shrink-0 text-xs text-stone-400 dark:text-stone-500">
          {hostname}
        </span>

        {/* Collection badge (All page only) */}
        {showCollection && firstCollection && (
          <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-stone-400 dark:text-stone-500">
            <span
              className="size-1.5 rounded-full"
              style={{
                background:
                  COLLECTION_COLORS.find((c) => c.id === firstCollection.collectionColor)?.hex ??
                  '#78716c',
              }}
            />
            {firstCollection.collectionName}
          </span>
        )}
      </div>

      {/* Hover card — fixed, pointer-events: none */}
      {isHovered && cardPos && (
        <ItemHoverCard item={item} top={cardPos.top} left={cardPos.left} />
      )}
    </li>
  );
}
