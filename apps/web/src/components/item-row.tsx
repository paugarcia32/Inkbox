'use client';

import { AddToCollectionPopover } from '@/components/add-to-collection-popover';
import { EditItemModal } from '@/components/edit-item-modal';
import { useKeyboardNav } from '@/contexts/keyboard-nav';
import { useItemActions } from '@/hooks/use-item-actions';
import { getCollectionIcon } from '@/lib/collection-icons';
import type { Item } from '@hako/types';
import { COLLECTION_COLORS } from '@hako/types';
import { getFaviconUrl, getHostname } from '@hako/utils';
import {
  ArchiveBoxArrowDownIcon,
  ArchiveBoxIcon,
  Bars2Icon,
  FolderPlusIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { forwardRef, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  /** Section name to display as a badge (flat view mode) */
  sectionName?: string | null | undefined;
  /** ID of whichever item is currently hovered in the list (managed by parent) */
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  /** When provided, renders a drag handle button with these props (for DnD) */
  dragHandleProps?: Record<string, unknown>;
}

export const ItemRow = forwardRef<HTMLLIElement, ItemRowProps>(function ItemRow(
  {
    item,
    showCollection = false,
    showArchivedBadge = false,
    sectionName,
    hoveredId,
    onHoverChange,
    dragHandleProps,
  }: ItemRowProps,
  externalRef,
) {
  const { archive, unarchive, deleteItem } = useItemActions();
  const { selectedItemId } = useKeyboardNav();
  const [faviconError, setFaviconError] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);

  // Stable merged ref — avoids calling externalRef(null) on every re-render,
  // which would cause dnd-kit to lose the node reference mid-drag.
  const setRef = useCallback(
    (node: HTMLLIElement | null) => {
      rowRef.current = node;
      if (typeof externalRef === 'function') externalRef(node);
      else if (externalRef) externalRef.current = node;
    },
    [externalRef],
  );

  const favicon = getFaviconUrl(item.url);
  const hostname = getHostname(item.url);
  const firstCollection = item.collections?.[0];

  const isHovered = hoveredId === item.id;
  const isKeyboardSelected = selectedItemId === item.id;
  const isActive = isHovered || popoverOpen || editOpen || isKeyboardSelected;
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
      ref={setRef}
      data-item-id={item.id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={[
        'relative flex h-10 items-center gap-3 rounded-lg px-2',
        'transition-all duration-200 ease-out',
        popoverOpen ? 'z-20' : '',
        isDimmed ? 'opacity-40 scale-y-[0.97]' : 'opacity-100',
        isActive ? 'bg-stone-100/70 dark:bg-stone-800/60' : '',
        isKeyboardSelected ? 'ring-1 ring-inset ring-stone-400/40 dark:ring-stone-500/40' : '',
      ].join(' ')}
    >
      {/* Full-row click target — opens the saved URL. aria-label provides accessible content. */}
      {/* biome-ignore lint/a11y/useAnchorContent: aria-label provides accessible content */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${item.title ?? item.url}`}
        className="absolute inset-0 rounded-lg"
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
          {/* Drag handle — only rendered in section context */}
          {dragHandleProps && (
            <button
              type="button"
              title="Drag to reorder"
              className="cursor-grab touch-none rounded p-1 text-stone-400 active:cursor-grabbing"
              {...(dragHandleProps as Record<string, unknown>)}
            >
              <Bars2Icon className="size-3.5" />
            </button>
          )}

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

          {/* Edit */}
          <button
            type="button"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditOpen(true);
            }}
            className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-600 dark:hover:bg-stone-700/60 dark:hover:text-stone-300"
          >
            <PencilSquareIcon className="size-3.5" />
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

        {/* Section badge — flat view mode only */}
        {sectionName && (
          <span className="ml-2 shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-400 dark:bg-stone-800 dark:text-stone-500">
            {sectionName}
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

      {/* Edit modal — portalled into body for the same reason as the hover card:
          the inner div has translate-x-0.5 when isActive, which creates a new
          containing block for position:fixed and breaks centering. */}
      {editOpen &&
        createPortal(
          <EditItemModal item={item} onClose={() => setEditOpen(false)} />,
          document.body,
        )}

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
});
