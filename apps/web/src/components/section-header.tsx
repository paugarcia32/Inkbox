'use client';

import { useSortable } from '@dnd-kit/sortable';
import type { CollectionSection } from '@hako/types';
import { Bars2Icon, ChevronRightIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface SectionHeaderProps {
  section: CollectionSection;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export function SectionHeader({
  section,
  collapsed,
  onToggle,
  onRename,
  onDelete,
}: SectionHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);
  const [showActions, setShowActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section:${section.id}`,
    data: { type: 'section' },
  });

  // Restrict to vertical axis only — horizontal transforms cause unwanted page scroll.
  // Only apply transition while actively dragging; skip the post-drop transition to avoid
  // a visual glitch when the server response reorders the DOM mid-animation.
  const style = {
    transform: transform ? `translate3d(0px, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commitRename() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== section.name) {
      onRename(trimmed);
    } else {
      setEditValue(section.name);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setEditValue(section.name);
      setEditing(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/section flex w-full items-center gap-1.5 py-1.5"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setConfirmDelete(false);
      }}
    >
      {/* Left-side actions: drag handle, rename, delete — mirrors item row action layout */}
      <div
        className={[
          'flex shrink-0 items-center gap-0.5 transition-opacity',
          showActions && !editing ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-0.5 text-stone-300 active:cursor-grabbing dark:text-stone-600"
          aria-label="Drag section"
        >
          <Bars2Icon className="size-3" />
        </button>

        {/* Rename */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          aria-label="Rename section"
        >
          <PencilIcon className="size-3" />
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Confirm
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-red-500 dark:hover:bg-stone-800"
            aria-label="Delete section"
          >
            <TrashIcon className="size-3" />
          </button>
        )}
      </div>

      {/* Collapse toggle + section name + count */}
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-1.5 text-left"
      >
        <ChevronRightIcon
          className={[
            'size-3 shrink-0 text-stone-400 transition-transform duration-150',
            collapsed ? '' : 'rotate-90',
          ].join(' ')}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-40 rounded border border-stone-300 bg-white px-1 py-0.5 text-xs font-medium text-stone-700 focus:border-stone-400 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          />
        ) : (
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {section.name}
          </span>
        )}

        <div className="mx-2 h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
          {section.itemCount}
        </span>
      </button>
    </div>
  );
}
