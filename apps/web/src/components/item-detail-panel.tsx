'use client';

import { ArrowTopRightOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Item } from '@hako/types';
import Image from 'next/image';

interface ItemDetailPanelProps {
  item: Item | null;
  onClose: () => void;
}

export function ItemDetailPanel({ item, onClose }: ItemDetailPanelProps) {
  const isOpen = item !== null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-14 bottom-0 z-40 flex w-80 flex-col overflow-y-auto border-l border-stone-200 bg-white transition-transform duration-200 ease-out dark:border-stone-800 dark:bg-stone-900 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {item && (
          <>
            {/* Close button */}
            <div className="flex items-center justify-end px-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                aria-label="Close"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>

            {/* Image preview */}
            {item.imageUrl && (
              <div className="relative mx-4 mt-2 aspect-video overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
                <Image src={item.imageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            )}

            {/* Content */}
            <div className="flex flex-1 flex-col gap-3 px-4 py-4">
              {/* Title */}
              <h2 className="text-sm font-semibold leading-snug text-stone-900 dark:text-stone-100">
                {item.title ?? item.url}
              </h2>

              {/* Description */}
              {item.description && (
                <p className="line-clamp-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  {item.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                {item.collections && item.collections.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{item.collections.map((c) => c.collectionName).join(', ')}</span>
                  </>
                )}
              </div>

              {/* Open link */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
              >
                <ArrowTopRightOnSquareIcon className="size-4 shrink-0" />
                Open link
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
