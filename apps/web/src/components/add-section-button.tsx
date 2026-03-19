'use client';

import { trpc } from '@/lib/trpc';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRef, useState } from 'react';

interface AddSectionButtonProps {
  collectionId: string;
}

export function AddSectionButton({ collectionId }: AddSectionButtonProps) {
  const [creating, setCreating] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const createSection = trpc.sections.create.useMutation({
    onSuccess: () => {
      void utils.sections.list.invalidate({ collectionId });
      void utils.collections.getById.invalidate({ id: collectionId });
      setValue('');
      setCreating(false);
    },
  });

  function handleStart() {
    setCreating(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleCommit() {
    const trimmed = value.trim();
    if (trimmed) {
      createSection.mutate({ collectionId, name: trimmed });
    } else {
      setValue('');
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') {
      setValue('');
      setCreating(false);
    }
  }

  if (creating) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        placeholder="Section name…"
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 placeholder-stone-400 focus:border-stone-400 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder-stone-600"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800"
    >
      <PlusIcon className="size-3.5" />
      Add section
    </button>
  );
}
