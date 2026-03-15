import { InboxArrowDownIcon } from '@heroicons/react/24/outline';

export default function InboxPage() {
  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Inbox</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Your saved articles, videos, and links.
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 py-20 dark:border-stone-700">
        <InboxArrowDownIcon className="mb-3 size-8 text-stone-400 dark:text-stone-500" />
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Nothing saved yet</p>
        <p className="mt-1 text-sm text-stone-400">Paste a URL to save your first item.</p>
      </div>
    </div>
  );
}
