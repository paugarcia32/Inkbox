import type { Collection } from '@hako/types';

type CollectionCardProps = {
  collection: Collection;
};

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <h2 className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
        {collection.name}
      </h2>
      {collection.description && (
        <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
          {collection.description}
        </p>
      )}
      <span className="mt-2 inline-block text-xs text-stone-400 dark:text-stone-500">
        {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
      </span>
    </article>
  );
}
