'use client';

import { getCollectionIcon } from '@/lib/collection-icons';
import { trpc } from '@/lib/trpc';
import { usePasteHandler } from '@/lib/use-paste-handler';
import { COLLECTION_COLORS } from '@hako/types';
import { getFaviconUrl, getHostname } from '@hako/utils';
import { ArchiveBoxIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface BottomUrlBarProps {
  /** If set, newly created items are immediately added to this collection. */
  collectionId?: string;
  /** Used in the success toast: "Saved to [name]". Falls back to "Saved!" if absent. */
  collectionName?: string | undefined;
  /** When true (archive page), success toast reads "Saved to Inbox" instead of "Saved!". */
  inboxOnlyMessage?: boolean;
}

function isUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  if (!v.includes(' ') && /\.[a-z]{2,}(\/|$)/i.test(v)) return true;
  return false;
}

type SearchMode = 'idle' | 'url' | 'search';

type SearchItem = {
  id: string;
  url: string;
  title: string | null;
  isArchived: boolean;
  collections?: Array<{
    collectionId: string;
    collectionName: string;
    collectionColor: string;
    collectionIcon: string | null;
  }>;
};

type SearchCollection = {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  itemCount: number;
};

type SearchResult =
  | { type: 'item'; data: SearchItem }
  | { type: 'collection'; data: SearchCollection };

export function BottomUrlBar({
  collectionId,
  collectionName,
  inboxOnlyMessage,
}: BottomUrlBarProps) {
  const [value, setValue] = useState('');
  const [toast, setToast] = useState<'saved' | 'error' | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  const mode: SearchMode = useMemo(() => {
    if (!value.trim()) return 'idle';
    return isUrl(value.trim()) ? 'url' : 'search';
  }, [value]);

  // Debounce the query for search
  useEffect(() => {
    if (mode !== 'search') {
      setDebouncedQuery('');
      return;
    }
    const t = setTimeout(() => setDebouncedQuery(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value, mode]);

  // Reset active index when results change
  // biome-ignore lint/correctness/useExhaustiveDependencies: debouncedQuery is the trigger, setActiveIndex is stable
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const itemResults = trpc.items.search.useQuery(
    { query: debouncedQuery },
    { enabled: mode === 'search' && debouncedQuery.length >= 2 },
  );

  const collectionResults = trpc.collections.search.useQuery(
    { query: debouncedQuery },
    { enabled: mode === 'search' && debouncedQuery.length >= 2 },
  );

  const allResults: SearchResult[] = useMemo(() => {
    const items = (itemResults.data ?? []).map((data) => ({
      type: 'item' as const,
      data: data as SearchItem,
    }));
    const collections = (collectionResults.data ?? []).map((data) => ({
      type: 'collection' as const,
      data: data as SearchCollection,
    }));
    return [...items, ...collections];
  }, [itemResults.data, collectionResults.data]);

  const create = trpc.items.create.useMutation({
    onSuccess: () => {
      setValue('');
      setIsOpen(false);
      setToast('saved');
      void utils.items.list.invalidate();
      void utils.items.count.refetch();
      if (collectionId) {
        void utils.collections.getById.invalidate({ id: collectionId });
      }
    },
    onError: () => setToast('error'),
  });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
    return;
  }, [toast]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const bar = inputRef.current?.closest('.smart-bar-root');
      if (bar && !bar.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function submitUrl(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      create.mutate({
        url: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
        collectionId,
      });
    } catch {
      setToast('error');
    }
  }

  function selectResult(index: number) {
    const result = allResults[index];
    if (!result) return;
    setValue('');
    setIsOpen(false);
    if (result.type === 'item') {
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(`/collections/${result.data.id}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (isOpen && allResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % allResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? allResults.length - 1 : i - 1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        selectResult(activeIndex);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'url') submitUrl(value);
    }
  }

  const savedMessage = inboxOnlyMessage
    ? 'Saved to Inbox'
    : collectionName
      ? `Saved to ${collectionName}`
      : 'Saved!';

  const showPanel = isOpen && (mode === 'search' || mode === 'url');
  const hasSearchResults =
    mode === 'search' &&
    ((itemResults.data?.length ?? 0) > 0 || (collectionResults.data?.length ?? 0) > 0);
  const isSearching = mode === 'search' && debouncedQuery.length >= 2 && itemResults.isFetching;

  usePasteHandler((pastedUrl) => {
    submitUrl(pastedUrl);
  });

  return (
    <div className="smart-bar-root fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-stone-50/90 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/90">
      {/* Search results panel */}
      {showPanel && (
        <div className="absolute bottom-full left-0 right-0 mx-auto max-w-3xl px-6 pb-1">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            {/* URL mode: save hint */}
            {mode === 'url' && (
              <button
                type="button"
                className="flex h-10 w-full items-center gap-3 px-3 text-left text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                onClick={() => submitUrl(value)}
              >
                <span className="flex size-4 shrink-0 items-center justify-center text-stone-400">
                  +
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-stone-800 dark:text-stone-200">
                  Save this link
                </span>
                <span className="shrink-0 truncate text-xs text-stone-400 dark:text-stone-500">
                  {value.trim()}
                </span>
                <span className="shrink-0 text-xs text-stone-400">Enter</span>
              </button>
            )}

            {/* Search mode: results */}
            {mode === 'search' && debouncedQuery.length >= 2 && (
              <>
                {isSearching && !hasSearchResults && (
                  <p className="px-3 py-2.5 text-sm text-stone-400">Searching…</p>
                )}
                {!isSearching && !hasSearchResults && (
                  <p className="px-3 py-2.5 text-sm text-stone-400">
                    No results for &quot;{debouncedQuery}&quot;
                  </p>
                )}
                {itemResults.data?.map((item, i) => {
                  const favicon = getFaviconUrl(item.url);
                  const hostname = getHostname(item.url);
                  const cols = (item as SearchItem).collections ?? [];
                  const firstCol = cols[0];
                  const isActive = activeIndex === i;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex h-10 w-full items-center gap-3 px-3 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-stone-100 dark:bg-stone-800'
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                      onClick={() => selectResult(i)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      {/* Favicon */}
                      <div className="flex size-4 shrink-0 items-center justify-center">
                        {favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={favicon} alt="" className="size-4 rounded-sm" />
                        ) : (
                          <GlobeAltIcon className="size-4 text-stone-400" />
                        )}
                      </div>
                      {/* Title */}
                      <span className="min-w-0 flex-1 truncate font-medium text-stone-800 dark:text-stone-100">
                        {item.title?.trim() || hostname}
                      </span>
                      {/* Archived badge */}
                      {(item as SearchItem).isArchived && (
                        <ArchiveBoxIcon className="size-3 shrink-0 text-stone-300 dark:text-stone-600" />
                      )}
                      {/* Collection badge */}
                      {firstCol && cols.length === 1 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-stone-400 dark:text-stone-500">
                          {(() => {
                            const hex =
                              COLLECTION_COLORS.find((c) => c.id === firstCol.collectionColor)
                                ?.hex ?? '#78716c';
                            const ColIcon = getCollectionIcon(firstCol.collectionIcon);
                            return ColIcon ? (
                              <ColIcon className="size-3 shrink-0" style={{ color: hex }} />
                            ) : (
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: hex }}
                              />
                            );
                          })()}
                          {firstCol.collectionName}
                        </span>
                      )}
                      {cols.length > 1 && (
                        <span className="flex shrink-0 items-center gap-0.5">
                          {cols.slice(0, 3).map((c) => {
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
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: hex }}
                              />
                            );
                          })}
                        </span>
                      )}
                      {/* Hostname */}
                      <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                        {hostname}
                      </span>
                    </button>
                  );
                })}
                {collectionResults.data?.map((col, i) => {
                  const globalIdx = (itemResults.data?.length ?? 0) + i;
                  const isActive = activeIndex === globalIdx;
                  const hex =
                    COLLECTION_COLORS.find((c) => c.id === (col as SearchCollection).color)?.hex ??
                    '#78716c';
                  const ColIcon = getCollectionIcon((col as SearchCollection).icon);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      className={`flex h-10 w-full items-center gap-3 px-3 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-stone-100 dark:bg-stone-800'
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                      onClick={() => selectResult(globalIdx)}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                    >
                      {/* Collection icon */}
                      <div className="flex size-4 shrink-0 items-center justify-center">
                        {ColIcon ? (
                          <ColIcon className="size-4" style={{ color: hex }} />
                        ) : (
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: hex }}
                          />
                        )}
                      </div>
                      {/* Name */}
                      <span className="min-w-0 flex-1 truncate font-medium text-stone-800 dark:text-stone-100">
                        {col.name}
                      </span>
                      {/* Item count */}
                      <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                        {(col as SearchCollection).itemCount}{' '}
                        {(col as SearchCollection).itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
            {mode === 'search' && debouncedQuery.length < 2 && value.trim().length > 0 && (
              <p className="px-3 py-2.5 text-sm text-stone-400">Keep typing to search…</p>
            )}
          </div>
        </div>
      )}

      {/* Bar */}
      <div className="mx-auto max-w-3xl px-6 py-2.5">
        <div className="flex items-center gap-2">
          {mode === 'search' && (
            <span className="shrink-0 text-stone-400" aria-hidden>
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Paste a link or search…"
            disabled={create.isPending}
            className="w-full bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400 disabled:opacity-50 dark:text-stone-200 dark:placeholder:text-stone-600"
          />
          {!value && (
            <span className="shrink-0 rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-400 dark:border-stone-700">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-opacity ${
            toast === 'saved'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast === 'saved' ? savedMessage : 'Invalid URL'}
        </div>
      )}
    </div>
  );
}
