'use client';

import { AddToCollectionPopover } from '@/components/add-to-collection-popover';
import { getCollectionIcon } from '@/lib/collection-icons';
import { trpc } from '@/lib/trpc';
import {
  ArchiveBoxArrowDownIcon,
  ArchiveBoxIcon,
  FolderPlusIcon,
  GlobeAltIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { Item } from '@inkbox/types';
import { COLLECTION_COLORS } from '@inkbox/types';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  /** Show a subtle archive indicator when item.isArchived is true */
  showArchivedBadge?: boolean;
  onOpen: (item: Item) => void;
  /** ID of whichever item is currently hovered in the list (managed by parent) */
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
}

export function ItemRow({
  item,
  showCollection = false,
  showArchivedBadge = false,
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

  const unarchive = trpc.items.unarchive.useMutation({
    onSuccess: () => void utils.items.list.invalidate(),
  });

  const deleteItem = trpc.items.delete.useMutation({
    onSuccess: () => void utils.items.list.invalidate(),
  });

  const favicon = getFaviconUrl(item.url);
  const hostname = getHostname(item.url);
  const firstCollection = item.collections?.[0];

  const isHovered = hoveredId === item.id;
  const isActive = isHovered || popoverOpen;
  const isDimmed = hoveredId !== null && !isHovered && !popoverOpen;

  function handleMouseEnter() {
    onHoverChange(item.id);
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      const cardWidth = 224; // w-56
      const cardHeight = 300; // safe max estimate
      const rawTop = rect.top + rect.height / 2;
      const top = Math.max(
        cardHeight / 2 + 8,
        Math.min(rawTop, window.innerHeight - cardHeight / 2 - 8),
      );
      const left = Math.min(rect.right + 16, window.innerWidth - cardWidth - 8);
      setCardPos({ top, left });
    }
  }

  function handleMouseLeave() {
    if (popoverOpen) return;
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
        popoverOpen ? 'z-20' : '',
        isDimmed ? 'opacity-40 scale-y-[0.97]' : 'opacity-100',
        isActive ? 'bg-stone-100/70 dark:bg-stone-800/60' : '',
      ].join(' ')}
    >
      {/* Full-row click target — sits behind all interactive children */}
      <button
        type="button"
        aria-label={`Open ${item.title ?? item.url}`}
        onClick={() => onOpen(item)}
        className="absolute inset-0 cursor-pointer rounded-lg"
      />

      <div
        className={[
          'relative flex h-10 w-full items-center gap-3',
          'transition-transform duration-200 ease-out',
          isActive ? 'translate-x-0.5' : '',
        ].join(' ')}
      >
        {/* Hover action icons — visible only when this row is hovered */}
        <div
          className={[
            'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
            isActive ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {/* Archive / Unarchive */}
          {item.isArchived ? (
            <button
              type="button"
              title="Unarchive"
              disabled={unarchive.isPending}
              onClick={(e) => {
                e.stopPropagation();
                unarchive.mutate({ id: item.id });
              }}
              className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-600 disabled:opacity-30 dark:hover:bg-stone-700/60 dark:hover:text-stone-300"
            >
              <ArchiveBoxArrowDownIcon className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              title="Archive"
              disabled={archive.isPending}
              onClick={(e) => {
                e.stopPropagation();
                archive.mutate({ id: item.id });
              }}
              className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-600 disabled:opacity-30 dark:hover:bg-stone-700/60 dark:hover:text-stone-300"
            >
              <ArchiveBoxIcon className="size-3.5" />
            </button>
          )}

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

        {/* Archived indicator — only when "show archived" filter is active */}
        {showArchivedBadge && item.isArchived && (
          <span className="group/archived relative ml-2 shrink-0">
            <ArchiveBoxIcon className="size-3 text-stone-300 dark:text-stone-600" />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-500 shadow-sm group-hover/archived:block dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
              Archived
            </span>
          </span>
        )}

        {/* Collection badge(s) — All page only */}
        {showCollection &&
          firstCollection &&
          (() => {
            const cols = item.collections ?? [firstCollection];
            const isMulti = cols.length > 1;

            if (isMulti) {
              // Multiple collections: show only colored dots/icons for all of them.
              // Count speaks for itself; names appear in the tooltip on hover.
              return (
                <span className="group/badge relative ml-2 flex shrink-0 cursor-default items-center gap-1">
                  {cols.slice(0, 5).map((c) => {
                    const hex =
                      COLLECTION_COLORS.find((col) => col.id === c.collectionColor)?.hex ??
                      '#78716c';
                    const ColIcon = getCollectionIcon(c.collectionIcon);
                    return ColIcon ? (
                      <ColIcon
                        key={c.collectionId}
                        className="size-3 shrink-0"
                        style={{ color: hex }}
                      />
                    ) : (
                      <span
                        key={c.collectionId}
                        className="block size-1.5 shrink-0 rounded-full"
                        style={{ background: hex }}
                      />
                    );
                  })}
                  {cols.length > 5 && (
                    <span className="text-[10px] text-stone-300 dark:text-stone-600">
                      +{cols.length - 5}
                    </span>
                  )}
                  {/* Tooltip: full list of collection names */}
                  <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 hidden min-w-max flex-col gap-0.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 shadow-md group-hover/badge:flex dark:border-stone-700 dark:bg-stone-900">
                    {cols.map((c) => {
                      const hex =
                        COLLECTION_COLORS.find((col) => col.id === c.collectionColor)?.hex ??
                        '#78716c';
                      const ColIcon = getCollectionIcon(c.collectionIcon);
                      return (
                        <span key={c.collectionId} className="flex items-center gap-1.5">
                          {ColIcon ? (
                            <ColIcon className="size-3 shrink-0" style={{ color: hex }} />
                          ) : (
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ background: hex }}
                            />
                          )}
                          <span className="text-xs text-stone-600 dark:text-stone-300">
                            {c.collectionName}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                </span>
              );
            }

            // Single collection: dot/icon + name
            const hex =
              COLLECTION_COLORS.find((c) => c.id === firstCollection.collectionColor)?.hex ??
              '#78716c';
            const FirstIcon = getCollectionIcon(firstCollection.collectionIcon);
            return (
              <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-stone-400 dark:text-stone-500">
                {FirstIcon ? (
                  <FirstIcon className="size-3 shrink-0" style={{ color: hex }} />
                ) : (
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: hex }} />
                )}
                {firstCollection.collectionName}
              </span>
            );
          })()}

        {/* Domain */}
        <span className="ml-3 shrink-0 text-xs text-stone-400 dark:text-stone-500">{hostname}</span>
      </div>

      {/* Hover card — portalled into body so CSS transforms on ancestors
          don't break the fixed positioning (any transform creates a new
          containing block for position:fixed, including translateY(0)). */}
      {isHovered &&
        cardPos &&
        createPortal(
          <ItemHoverCard item={item} top={cardPos.top} left={cardPos.left} />,
          document.body,
        )}
    </li>
  );
}
