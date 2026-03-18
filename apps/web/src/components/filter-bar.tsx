'use client';

import { useClickOutside } from '@/lib/use-click-outside';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useRef, useState } from 'react';

export type SortOption = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc';
export type TypeFilter = 'all' | 'article' | 'youtube' | 'tweet' | 'pinterest' | 'link';
export type GroupBy = 'none' | 'date' | 'collection';

const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': 'Newest',
  'date-asc': 'Oldest',
  'alpha-asc': 'A–Z',
  'alpha-desc': 'Z–A',
};

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'All types',
  article: 'Article',
  youtube: 'YouTube',
  tweet: 'Tweet',
  pinterest: 'Pinterest',
  link: 'Link',
};

interface DropdownProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}

function Dropdown<T extends string>({ value, onChange, options, label }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150',
          open
            ? 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200'
            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200',
        ].join(' ')}
      >
        {options.find((o) => o.value === value)?.label ?? label}
        <ChevronDownIcon
          className={[
            'size-3 shrink-0 transition-transform duration-150',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 top-full z-50 mt-1 min-w-[7rem] overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={[
                'flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors duration-100',
                opt.value === value
                  ? 'font-medium text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200',
              ].join(' ')}
            >
              {opt.value === value && (
                <span className="mr-2 size-1.5 rounded-full bg-accent-500 shrink-0" />
              )}
              {opt.value !== value && <span className="mr-2 size-1.5 shrink-0" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = Object.entries(SORT_LABELS).map(
  ([value, label]) => ({ value: value as SortOption, label }),
);

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = Object.entries(TYPE_LABELS).map(
  ([value, label]) => ({ value: value as TypeFilter, label }),
);

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'No group' },
  { value: 'date', label: 'Date' },
  { value: 'collection', label: 'Collection' },
];

interface FilterBarProps {
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (v: TypeFilter) => void;
  groupBy?: GroupBy;
  onGroupByChange?: (v: GroupBy) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

export function FilterBar({
  sort,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  groupBy,
  onGroupByChange,
  showArchived,
  onToggleArchived,
}: FilterBarProps) {
  return (
    <div className="mb-3 flex h-9 items-center gap-1">
      <Dropdown value={sort} onChange={onSortChange} options={SORT_OPTIONS} label="Sort" />
      <Dropdown
        value={typeFilter}
        onChange={onTypeFilterChange}
        options={TYPE_OPTIONS}
        label="Type"
      />
      {groupBy !== undefined && onGroupByChange && (
        <Dropdown
          value={groupBy}
          onChange={onGroupByChange}
          options={GROUP_OPTIONS}
          label="Group"
        />
      )}

      <div className="flex-1" />

      {/* Archived toggle — only on All page */}
      {showArchived !== undefined && onToggleArchived && (
        <div className="flex cursor-pointer items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span>Show archived</span>
          <button
            type="button"
            role="switch"
            aria-checked={showArchived}
            onClick={onToggleArchived}
            className={[
              'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150',
              showArchived ? 'bg-accent-500' : 'bg-stone-200 dark:bg-stone-700',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block size-3 rounded-full bg-white shadow transition-transform duration-150',
                showArchived ? 'translate-x-3.5' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </div>
      )}
    </div>
  );
}
