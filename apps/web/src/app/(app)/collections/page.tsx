'use client';

import { trpc } from '@/lib/trpc';
import type { Collection } from '@inkbox/types';
import { COLLECTION_COLORS } from '@inkbox/types';
import { FolderIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState } from 'react';

function getColorHex(colorId: string): string {
  return COLLECTION_COLORS.find((c) => c.id === colorId)?.hex ?? '#78716c';
}

function ColorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5">
      {COLLECTION_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-label={c.id}
          onClick={() => onChange(c.id)}
          className="size-4 shrink-0 rounded-full transition-transform hover:scale-110"
          style={{
            background: c.hex,
            boxShadow: value === c.id ? `0 0 0 2px white, 0 0 0 3px ${c.hex}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function CreateCollectionModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [color, setColor] = useState('stone');

  const create = trpc.collections.create.useMutation({
    onSuccess: () => {
      void utils.collections.list.invalidate();
      onClose();
    },
  });

  function submit() {
    if (name.trim()) create.mutate({ name: name.trim(), color });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-stone-800 dark:text-stone-100">
          New collection
        </h2>

        <input
          autoFocus
          type="text"
          placeholder="Collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />

        <ColorPicker value={color} onChange={setColor} />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || create.isPending}
            onClick={submit}
            className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCollectionModal({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(collection.name);
  const [color, setColor] = useState(collection.color);

  const [error, setError] = useState<string | null>(null);

  const update = trpc.collections.update.useMutation({
    onSuccess: () => {
      void utils.collections.list.invalidate();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  function submit() {
    if (name.trim()) update.mutate({ id: collection.id, name: name.trim(), color });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-stone-800 dark:text-stone-100">
          Edit collection
        </h2>

        <input
          autoFocus
          type="text"
          placeholder="Collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />

        <ColorPicker value={color} onChange={setColor} />

        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || update.isPending}
            onClick={submit}
            className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteCollectionDialog({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();

  const deleteCollection = trpc.collections.delete.useMutation({
    onSuccess: () => {
      void utils.collections.list.invalidate();
      void utils.items.list.invalidate();
      onClose();
    },
  });

  const count = collection.itemCount;
  const plural = count !== 1 ? 's' : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
          Delete &ldquo;{collection.name}&rdquo;?
        </h2>
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          This collection has {count} item{plural}. What should happen to them?
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={deleteCollection.isPending}
            onClick={() => deleteCollection.mutate({ id: collection.id, deleteItems: true })}
            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40"
          >
            Delete items too
          </button>
          <button
            type="button"
            disabled={deleteCollection.isPending}
            onClick={() => deleteCollection.mutate({ id: collection.id, deleteItems: false })}
            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Keep in inbox
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, isError, refetch } = trpc.collections.list.useQuery({});
  const [showCreate, setShowCreate] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);

  const deleteEmpty = trpc.collections.delete.useMutation({
    onSuccess: () => void utils.collections.list.invalidate(),
  });

  function handleDeleteClick(collection: Collection) {
    if (collection.itemCount === 0) {
      deleteEmpty.mutate({ id: collection.id, deleteItems: false });
    } else {
      setDeletingCollection(collection);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-20">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {data
              ? `${data.collections.length} collection${data.collections.length !== 1 ? 's' : ''}`
              : ''}
          </span>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <PlusIcon className="size-3.5" />
            New collection
          </button>
        </div>

        {isLoading && (
          <ul className="space-y-0.5">
            {['sk-1', 'sk-2', 'sk-3'].map((id) => (
              <li key={id} className="h-10 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
            ))}
          </ul>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load collections.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-sm font-medium text-accent-500 hover:text-accent-600"
            >
              Try again
            </button>
          </div>
        )}

        {data && data.collections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderIcon className="mb-3 size-9 text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
              No collections yet
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-600">
              Create a collection to organize your saved links
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent-500 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-600"
            >
              <PlusIcon className="size-3.5" />
              New collection
            </button>
          </div>
        )}

        {data && data.collections.length > 0 && (
          <ul className="space-y-0.5">
            {data.collections.map((collection) => (
              <li
                key={collection.id}
                className="group relative flex h-10 items-center gap-3 rounded-lg px-2 transition-all duration-200 ease-out hover:bg-stone-100/70 dark:hover:bg-stone-800/60"
              >
                {/* Full-row link */}
                <Link
                  href={`/collections/${collection.id}`}
                  className="absolute inset-0 rounded-lg"
                  aria-label={collection.name}
                />

                <div className="pointer-events-none relative flex h-10 w-full items-center gap-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5">
                  {/* Action buttons — left side, shown on hover */}
                  <div className="pointer-events-auto relative flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                      type="button"
                      title="Edit collection"
                      onClick={(e) => { e.preventDefault(); setEditingCollection(collection); }}
                      className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-200/60 hover:text-stone-600 dark:hover:bg-stone-700/60 dark:hover:text-stone-300"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete collection"
                      disabled={deleteEmpty.isPending}
                      onClick={(e) => { e.preventDefault(); handleDeleteClick(collection); }}
                      className="rounded p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>

                  {/* Color dot */}
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: getColorHex(collection.color) }}
                  />

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                    {collection.name}
                  </span>

                  <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                    {collection.itemCount}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCreate && <CreateCollectionModal onClose={() => setShowCreate(false)} />}
      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
        />
      )}
      {deletingCollection && (
        <DeleteCollectionDialog
          collection={deletingCollection}
          onClose={() => setDeletingCollection(null)}
        />
      )}
    </>
  );
}
