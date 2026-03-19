'use client';

import { trpc } from '@/lib/trpc';
import { usePasteHandler } from '@/lib/use-paste-handler';
import type { Collection, Item } from '@hako/types';
import { getFaviconUrl, getHostname } from '@hako/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface BottomUrlBarProps {
  /** If set, newly created items are immediately added to this collection. */
  collectionId?: string;
  /** Used in the success toast: "Saved to [name]". Falls back to "Saved!" if absent. */
  collectionName?: string | undefined;
  /** When true (archive page), success toast reads "Saved to Inbox" instead of "Saved!". */
  inboxOnlyMessage?: boolean;
  /** Called when the user selects an item from search results. */
  onSelectItem?: (item: Item) => void;
}

function isUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  // something.tld with no spaces
  if (!v.includes(' ') && /\.[a-z]{2,}(\/|$)/i.test(v)) return true;
  return false;
}

type SearchMode = 'idle' | 'url' | 'search';

export function BottomUrlBar({
  collectionId,
  collectionName,
  inboxOnlyMessage,
  onSelectItem,
}: BottomUrlBarProps) {
  const [value, setValue] = useState('');
  const [toast, setToast] = useState<'saved' | 'error' | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  const allResults: Array<{ type: 'item'; data: Item } | { type: 'collection'; data: Collection }> =
    useMemo(() => {
      const items = (itemResults.data ?? []).map((data) => ({
        type: 'item' as const,
        data: data as unknown as Item,
      }));
      const collections = (collectionResults.data ?? []).map((data) => ({
        type: 'collection' as const,
        data: data as Collection,
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
    if (result.type === 'item') {
      onSelectItem?.(result.data);
      setValue('');
      setIsOpen(false);
    } else {
      router.push(`/collections/${result.data.id}`);
      setValue('');
      setIsOpen(false);
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
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 right-0 mx-auto max-w-3xl px-6 pb-1"
        >
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            {/* URL mode: save hint */}
            {mode === 'url' && (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                onClick={() => submitUrl(value)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-200 text-base dark:bg-stone-700">
                  +
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-800 dark:text-stone-200">
                    Save this link
                  </p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {value.trim()}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-stone-400">Enter</span>
              </button>
            )}

            {/* Search mode: results */}
            {mode === 'search' && debouncedQuery.length >= 2 && (
              <>
                {isSearching && !hasSearchResults && (
                  <p className="px-4 py-3 text-sm text-stone-400">Searching…</p>
                )}
                {!isSearching && !hasSearchResults && (
                  <p className="px-4 py-3 text-sm text-stone-400">
                    No results for "{debouncedQuery}"
                  </p>
                )}
                {(itemResults.data?.length ?? 0) > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Items
                    </p>
                    {itemResults.data?.map((item, i) => {
                      const globalIdx = i;
                      const favicon = getFaviconUrl(item.url);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            activeIndex === globalIdx
                              ? 'bg-stone-100 dark:bg-stone-800'
                              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                          onClick={() => selectResult(globalIdx)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-200 dark:bg-stone-700">
                            {favicon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={favicon} alt="" className="h-4 w-4 object-contain" />
                            ) : (
                              <span className="text-xs text-stone-400">🔗</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-stone-800 dark:text-stone-200">
                              {item.title ?? getHostname(item.url)}
                            </p>
                            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                              {getHostname(item.url)}
                              {item.isArchived && (
                                <span className="ml-1.5 text-stone-400 dark:text-stone-500">
                                  · archived
                                </span>
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {(collectionResults.data?.length ?? 0) > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Collections
                    </p>
                    {collectionResults.data?.map((col, i) => {
                      const globalIdx = (itemResults.data?.length ?? 0) + i;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            activeIndex === globalIdx
                              ? 'bg-stone-100 dark:bg-stone-800'
                              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                          onClick={() => selectResult(globalIdx)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-200 text-base dark:bg-stone-700">
                            {col.icon ?? '📁'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-stone-800 dark:text-stone-200">
                              {col.name}
                            </p>
                            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                              {col.itemCount} {col.itemCount === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            {mode === 'search' && debouncedQuery.length < 2 && value.trim().length > 0 && (
              <p className="px-4 py-3 text-sm text-stone-400">Keep typing to search…</p>
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
